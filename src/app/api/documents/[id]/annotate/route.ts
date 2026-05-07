import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { saveFile } from '@/lib/file-upload'
import { extractTextContent } from '@/lib/text-extractor'
import { logActivity, getIpFromRequest } from '@/lib/activity-logger'

type RouteContext = { params: Promise<{ id: string }> }

const SUPPORTED_MIMES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'text/csv',
  'text/html',
])

function computeDiffSummary(original: string, modified: string): { hasChanges: boolean; summary: string; addedChars: number; removedChars: number } {
  const orig = original.trim()
  const mod = modified.trim()

  if (orig === mod) {
    return { hasChanges: false, summary: 'Aucune modification détectée', addedChars: 0, removedChars: 0 }
  }

  const addedChars = Math.max(0, mod.length - orig.length)
  const removedChars = Math.max(0, orig.length - mod.length)

  const origLines = new Set(orig.split('\n').map((l) => l.trim()).filter(Boolean))
  const modLines = mod.split('\n').map((l) => l.trim()).filter(Boolean)

  const addedLines: string[] = []
  for (const line of modLines) {
    if (!origLines.has(line)) addedLines.push(line)
  }

  const modLineSet = new Set(modLines)
  const removedLines: string[] = []
  for (const line of orig.split('\n').map((l) => l.trim()).filter(Boolean)) {
    if (!modLineSet.has(line)) removedLines.push(line)
  }

  let summary = ''
  if (addedLines.length > 0) {
    summary += `${addedLines.length} ligne${addedLines.length > 1 ? 's' : ''} ajoutée${addedLines.length > 1 ? 's' : ''}`
    if (addedLines.length <= 3) {
      summary += ` :\n` + addedLines.map((l) => `+ ${l.slice(0, 200)}`).join('\n')
    }
  }
  if (removedLines.length > 0) {
    if (summary) summary += '\n\n'
    summary += `${removedLines.length} ligne${removedLines.length > 1 ? 's' : ''} supprimée${removedLines.length > 1 ? 's' : ''}`
    if (removedLines.length <= 3) {
      summary += ` :\n` + removedLines.map((l) => `- ${l.slice(0, 200)}`).join('\n')
    }
  }
  if (!summary) {
    summary = `Modifications détectées (${addedChars} caractères ajoutés, ${removedChars} retirés)`
  }

  return { hasChanges: true, summary, addedChars, removedChars }
}

export async function POST(
  request: NextRequest,
  ctx: RouteContext
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const role = session.user.role
  if (role !== 'ADMIN' && role !== 'MEMBER') {
    return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })
  }

  try {
    const { id } = await ctx.params

    const userExists = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!userExists) {
      return NextResponse.json(
        { error: 'Session expirée. Veuillez vous reconnecter.' },
        { status: 401 }
      )
    }

    const document = await prisma.document.findUnique({ where: { id } })
    if (!document) {
      return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })
    }

    if (!SUPPORTED_MIMES.has(document.mimeType)) {
      return NextResponse.json(
        { error: 'Type de fichier non supporté pour l\'annotation automatique. Formats supportés : PDF, DOCX, TXT, MD, CSV, HTML.' },
        { status: 400 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file')
    const note = formData.get('note')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Fichier requis' }, { status: 400 })
    }

    if (file.type !== document.mimeType) {
      return NextResponse.json(
        { error: `Le fichier doit être du même type que l'original (${document.mimeType})` },
        { status: 400 }
      )
    }

    // Save the uploaded annotated file
    const saved = await saveFile(file)

    // Extract text from the new annotated version
    const modifiedText = await extractTextContent(saved.filePath, document.mimeType)
    const originalText = document.textContent ?? ''

    if (modifiedText === null) {
      return NextResponse.json(
        { error: 'Impossible d\'extraire le texte du fichier annoté' },
        { status: 400 }
      )
    }

    const diff = computeDiffSummary(originalText, modifiedText)

    if (!diff.hasChanges) {
      return NextResponse.json(
        { error: 'Aucune annotation détectée — le fichier est identique à l\'original.' },
        { status: 400 }
      )
    }

    // Content = just the user's note if provided, otherwise empty
    // The "Fichier modifié par X" header is rendered by the frontend based on type=ANNOTATION
    const content = typeof note === 'string' && note.trim() ? note.trim() : ''

    // Create the contribution with the file path stored in metadata
    const contribution = await prisma.wikiContribution.create({
      data: {
        documentId: id,
        userId: session.user.id,
        content,
        type: 'ANNOTATION',
        isApproved: role === 'ADMIN',
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    })

    // Log activity
    await logActivity({
      userId: session.user.id,
      action: 'WIKI_ANNOTATION_UPLOAD',
      entityType: 'document',
      entityId: id,
      entityName: document.title,
      metadata: {
        contributionId: contribution.id,
        attachedFile: saved.storedName,
        addedChars: diff.addedChars,
        removedChars: diff.removedChars,
      },
      ipAddress: getIpFromRequest(request),
    })

    return NextResponse.json({
      contribution,
      diff: {
        addedChars: diff.addedChars,
        removedChars: diff.removedChars,
        summary: diff.summary,
      },
      attachedFile: saved.storedName,
    }, { status: 201 })
  } catch (error) {
    console.error('POST /api/documents/[id]/annotate error:', error)
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
