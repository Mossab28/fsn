import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { saveFile } from '@/lib/file-upload'
import { logActivity, getIpFromRequest } from '@/lib/activity-logger'
import { extractTextContent } from '@/lib/text-extractor'
import { isTranscribable, transcribeAudioVideo } from '@/lib/transcription'
// SQLite mode — no Prisma enum/array types needed

type SortableField = 'createdAt' | 'title' | 'fileSize' | 'publishedAt'

const ALLOWED_SORT_FIELDS: Set<SortableField> = new Set([
  'createdAt',
  'title',
  'fileSize',
  'publishedAt',
])

function isSortableField(value: string): value is SortableField {
  return ALLOWED_SORT_FIELDS.has(value as SortableField)
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = request.nextUrl

    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10))
    )
    const categoryId = searchParams.get('categoryId') ?? undefined
    const mimeType = searchParams.get('mimeType') ?? undefined
    const tagsParam = searchParams.get('tags')
    const tags = tagsParam ? tagsParam.split(',').filter(Boolean) : undefined
    const sortByParam = searchParams.get('sortBy') ?? 'createdAt'
    const sortBy: SortableField = isSortableField(sortByParam)
      ? sortByParam
      : 'createdAt'
    const sortOrderParam = searchParams.get('sortOrder') ?? 'desc'
    const sortOrder: 'asc' | 'desc' =
      sortOrderParam === 'asc' ? 'asc' : 'desc'
    const search = searchParams.get('search') ?? undefined
    const folderId = searchParams.get('folderId')
    const includeArchived = searchParams.get('includeArchived') === 'true'

    const where = {
      ...(includeArchived ? {} : { isArchived: false }),
      ...(categoryId ? { categoryId } : {}),
      ...(mimeType ? { mimeType } : {}),
      ...(folderId !== null && folderId !== undefined
        ? { folderId: folderId === '' ? null : folderId }
        : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search } },
              { description: { contains: search } },
            ],
          }
        : {}),
    }

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          uploader: { select: { id: true, name: true, email: true } },
          category: true,
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.document.count({ where }),
    ])

    return NextResponse.json({
      data: documents,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error('GET /api/documents error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role === 'READER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const formData = await request.formData()

    const title = formData.get('title')
    if (typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }

    const description = formData.get('description')
    const categoryId = formData.get('categoryId')
    const folderId = formData.get('folderId')
    const tagsRaw = formData.get('tags')
    const authorName = formData.get('authorName')
    const publishedAtRaw = formData.get('publishedAt')

    let tags: string[] = []
    if (typeof tagsRaw === 'string' && tagsRaw.trim()) {
      try {
        const parsed = JSON.parse(tagsRaw)
        if (Array.isArray(parsed)) {
          tags = parsed.filter((t): t is string => typeof t === 'string')
        }
      } catch {
        return NextResponse.json(
          { error: 'tags must be a valid JSON array' },
          { status: 400 }
        )
      }
    }

    let publishedAt: Date | undefined
    if (typeof publishedAtRaw === 'string' && publishedAtRaw.trim()) {
      const parsed = new Date(publishedAtRaw)
      if (isNaN(parsed.getTime())) {
        return NextResponse.json(
          { error: 'publishedAt must be a valid date' },
          { status: 400 }
        )
      }
      publishedAt = parsed
    }

    const { storedName, filePath, fileSize, mimeType } = await saveFile(file)

    // Extraction du contenu textuel pour indexation
    let textContent: string | null = null
    const transcribable = isTranscribable(mimeType, filePath)
    if (!transcribable) {
      // PDF/DOCX/TXT : extraction synchrone (rapide)
      textContent = await extractTextContent(filePath, mimeType)
    }
    // Pour audio/vidéo : transcription asynchrone (Whisper local prend du temps)
    // → on lance après création du document, en background

    const document = await prisma.document.create({
      data: {
        title: title.trim(),
        description:
          typeof description === 'string' && description.trim()
            ? description.trim()
            : null,
        filename: file.name,
        storedName,
        filePath,
        fileSize,
        mimeType,
        categoryId:
          typeof categoryId === 'string' && categoryId.trim()
            ? categoryId.trim()
            : null,
        folderId:
          typeof folderId === 'string' && folderId.trim()
            ? folderId.trim()
            : null,
        tags: JSON.stringify(tags),
        authorName:
          typeof authorName === 'string' && authorName.trim()
            ? authorName.trim()
            : null,
        publishedAt: publishedAt ?? null,
        uploadedBy: session.user.id,
        textContent,
      },
      include: {
        uploader: { select: { id: true, name: true, email: true } },
        category: true,
      },
    })

    await logActivity({
      userId: session.user.id,
      action: 'DOCUMENT_UPLOAD',
      entityType: 'document',
      entityId: document.id,
      entityName: document.title,
      ipAddress: getIpFromRequest(request),
    })

    // Background: transcription audio/vidéo via Whisper local
    if (transcribable) {
      transcribeAudioVideo(filePath, mimeType).then(async (text) => {
        if (text) {
          await prisma.document.update({
            where: { id: document.id },
            data: { textContent: text },
          })
          console.log(`[Whisper] Transcription terminée pour document ${document.id}`)
        }
      }).catch((err) => {
        console.error('[Whisper] Erreur transcription background:', err)
      })
    }

    return NextResponse.json(document, { status: 201 })
  } catch (error) {
    console.error('POST /api/documents error:', error)
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
