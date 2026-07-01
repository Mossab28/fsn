import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { writeFile, mkdir } from 'fs/promises'
import { join, extname, resolve, basename, dirname } from 'path'
import AdmZip from 'adm-zip'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logActivity, getIpFromRequest } from '@/lib/activity-logger'

const MIME_MAP: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.html': 'text/html',
  '.md': 'text/markdown',
}

function getMimeType(filename: string): string {
  const ext = extname(filename).toLowerCase()
  return MIME_MAP[ext] || 'application/octet-stream'
}

function isHiddenEntry(entryName: string): boolean {
  const parts = entryName.split('/')
  return parts.some((part) => part.startsWith('.') || part.startsWith('__MACOSX'))
}

function getUploadDir(): string {
  return resolve(process.env.UPLOAD_DIR || './uploads')
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 })
  }

  try {
    let formData: FormData
    try {
      formData = await request.formData()
    } catch {
      return NextResponse.json({ error: 'Corps de requête invalide (multipart/form-data attendu)' }, { status: 400 })
    }
    const zipFile = formData.get('file')
    if (!(zipFile instanceof File)) {
      return NextResponse.json({ error: 'Fichier ZIP requis' }, { status: 400 })
    }

    const parentFolderId = formData.get('parentFolderId')
    const parentId: string | null =
      typeof parentFolderId === 'string' && parentFolderId.trim()
        ? parentFolderId.trim()
        : null

    // Validate parent folder exists if provided
    if (parentId) {
      const parentFolder = await prisma.folder.findUnique({ where: { id: parentId } })
      if (!parentFolder) {
        return NextResponse.json({ error: 'Dossier parent introuvable' }, { status: 404 })
      }
    }

    const buffer = Buffer.from(await zipFile.arrayBuffer())
    const zip = new AdmZip(buffer)
    const entries = zip.getEntries()

    const uploadDir = getUploadDir()
    await mkdir(uploadDir, { recursive: true })

    // Build folder hierarchy
    // Map from zip path (e.g. "FolderA/SubFolder/") to created folder ID
    const folderMap = new Map<string, string>()
    let foldersCreated = 0
    let documentsCreated = 0
    const errors: string[] = []

    // Detect if the ZIP already has a single common top-level directory.
    // If yes → use as-is. If files are at root → auto-wrap in a folder named
    // after the ZIP so the import lands as a discoverable single entry.
    const visibleEntries = entries.filter((e) => !isHiddenEntry(e.entryName))
    const topLevels = new Set<string>()
    for (const e of visibleEntries) {
      const first = e.entryName.replace(/\/$/, '').split('/')[0]
      if (first) topLevels.add(first)
    }
    const singleTopFolder = topLevels.size === 1 && visibleEntries.some((e) => {
      const first = e.entryName.replace(/\/$/, '').split('/')[0]
      // At least one entry must be inside (contains a slash) with that top
      return e.entryName.startsWith(first + '/')
    })

    // ZIP filename without extension, used as wrapping folder name if needed
    const zipBaseName = zipFile.name.replace(/\.zip$/i, '').trim()
    const wrapWithZipFolder = !singleTopFolder && zipBaseName.length > 0
    let wrappingFolderId: string | null = null
    if (wrapWithZipFolder) {
      try {
        const folder = await prisma.folder.create({
          data: { name: zipBaseName, parentId },
        })
        wrappingFolderId = folder.id
        foldersCreated++
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`Dossier racine "${zipBaseName}": ${msg}`)
      }
    }
    // From here on, "effectiveParentId" is the destination for top-level files:
    // either the auto-wrapping folder, or the target parent picked by the user
    const effectiveParentId: string | null = wrappingFolderId ?? parentId

    // Collect all unique folder paths from entries
    const folderPaths = new Set<string>()
    for (const entry of entries) {
      const entryName = entry.entryName
      if (isHiddenEntry(entryName)) continue

      if (entry.isDirectory) {
        // Normalize: remove trailing slash for consistent handling
        const normalized = entryName.replace(/\/$/, '')
        if (normalized) folderPaths.add(normalized)
      } else {
        // Also collect parent directories of files
        const dir = dirname(entryName)
        if (dir && dir !== '.') {
          // Add all ancestor paths
          const parts = dir.split('/')
          for (let i = 1; i <= parts.length; i++) {
            folderPaths.add(parts.slice(0, i).join('/'))
          }
        }
      }
    }

    // Sort folder paths by depth so parents are created first
    const sortedFolderPaths = Array.from(folderPaths).sort(
      (a, b) => a.split('/').length - b.split('/').length
    )

    // Create folders in database
    for (const folderPath of sortedFolderPaths) {
      const parts = folderPath.split('/')
      const folderName = parts[parts.length - 1]
      if (!folderName) continue

      // Determine parent: either a previously created folder, or effectiveParentId
      // (which is either the wrapping folder if we created one, or user's target)
      let dbParentId: string | null = effectiveParentId
      if (parts.length > 1) {
        const parentPath = parts.slice(0, -1).join('/')
        dbParentId = folderMap.get(parentPath) ?? effectiveParentId
      }

      try {
        const folder = await prisma.folder.create({
          data: {
            name: folderName,
            parentId: dbParentId,
          },
        })
        folderMap.set(folderPath, folder.id)
        foldersCreated++
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`Dossier "${folderPath}": ${msg}`)
      }
    }

    // Process file entries
    for (const entry of entries) {
      if (entry.isDirectory) continue
      if (isHiddenEntry(entry.entryName)) continue

      const filename = basename(entry.entryName)
      if (!filename || filename.startsWith('.')) continue

      try {
        const fileData = entry.getData()
        const mimeType = getMimeType(filename)
        const ext = extname(filename)
        const storedName = `${randomUUID()}${ext}`
        const filePath = join(uploadDir, storedName)

        await writeFile(filePath, fileData)

        // Determine which folder this file belongs to
        const dir = dirname(entry.entryName)
        let folderId: string | null = effectiveParentId
        if (dir && dir !== '.') {
          folderId = folderMap.get(dir) ?? effectiveParentId
        }

        // Create title from filename without extension
        const title = filename
          .replace(/\.[^/.]+$/, '')
          .replace(/[_-]+/g, ' ')
          .replace(/([a-z])([A-Z])/g, '$1 $2')
          .trim()

        await prisma.document.create({
          data: {
            title,
            filename,
            storedName,
            filePath,
            fileSize: fileData.length,
            mimeType,
            folderId,
            uploadedBy: session.user.id,
            tags: '[]',
          },
        })

        documentsCreated++
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`Fichier "${entry.entryName}": ${msg}`)
      }
    }

    // Log activity
    await logActivity({
      userId: session.user.id,
      action: 'DOCUMENT_UPLOAD',
      entityType: 'zip-import',
      entityName: zipFile.name,
      metadata: { foldersCreated, documentsCreated, errorCount: errors.length },
      ipAddress: getIpFromRequest(request),
    }).catch(() => {})

    return NextResponse.json({
      foldersCreated,
      documentsCreated,
      errors,
    })
  } catch (error) {
    console.error('POST /api/documents/import-zip error:', error)
    return NextResponse.json({ error: 'Erreur lors de l\'import du ZIP' }, { status: 500 })
  }
}
