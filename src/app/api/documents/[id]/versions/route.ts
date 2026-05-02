import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { saveFile } from '@/lib/file-upload'
import { logActivity, getIpFromRequest } from '@/lib/activity-logger'
import type { VersionType } from '@/types'

type RouteContext = { params: Promise<{ id: string }> }

function incrementVersion(current: string, type: VersionType): string {
  const parts = current.split('.')
  const major = parseInt(parts[0] || '1', 10)
  const minor = parseInt(parts[1] || '0', 10)

  if (type === 'MAJOR') {
    return `${major + 1}.0`
  }
  return `${major}.${minor + 1}`
}

export async function GET(
  _request: NextRequest,
  ctx: RouteContext
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await ctx.params

    const document = await prisma.document.findUnique({ where: { id } })
    if (!document) {
      return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })
    }

    const versions = await prisma.documentVersion.findMany({
      where: { documentId: id },
      include: {
        uploader: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(versions)
  } catch (error) {
    console.error('GET /api/documents/[id]/versions error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  ctx: RouteContext
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = session.user.role
  if (role !== 'ADMIN' && role !== 'MEMBER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id } = await ctx.params

    const document = await prisma.document.findUnique({ where: { id } })
    if (!document) {
      return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })
    }

    const formData = await request.formData()

    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Fichier requis' }, { status: 400 })
    }

    const typeRaw = formData.get('type')
    if (typeRaw !== 'MAJOR' && typeRaw !== 'MINOR') {
      return NextResponse.json(
        { error: 'Le type doit être MAJOR ou MINOR' },
        { status: 400 }
      )
    }
    const type: VersionType = typeRaw

    const changelogRaw = formData.get('changelog')
    const changelog =
      typeof changelogRaw === 'string' && changelogRaw.trim()
        ? changelogRaw.trim()
        : null

    const { storedName, filePath, fileSize } = await saveFile(file)

    const newVersion = incrementVersion(document.currentVersion, type)

    const [version] = await Promise.all([
      prisma.documentVersion.create({
        data: {
          documentId: id,
          version: newVersion,
          type,
          filename: file.name,
          storedName,
          filePath,
          fileSize,
          changelog,
          uploadedBy: session.user.id,
        },
        include: {
          uploader: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.document.update({
        where: { id },
        data: { currentVersion: newVersion },
      }),
    ])

    await logActivity({
      userId: session.user.id,
      action: 'DOCUMENT_VERSION_UPLOAD',
      entityType: 'document',
      entityId: id,
      entityName: document.title,
      metadata: { version: newVersion, type },
      ipAddress: getIpFromRequest(request),
    })

    return NextResponse.json(version, { status: 201 })
  } catch (error) {
    console.error('POST /api/documents/[id]/versions error:', error)
    if (error instanceof Error) {
      if (
        error.message.includes('Unsupported file type') ||
        error.message.includes('File size exceeds')
      ) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
