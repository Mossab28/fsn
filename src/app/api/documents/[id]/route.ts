import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deleteFile } from '@/lib/file-upload'

type RouteContext = { params: Promise<{ id: string }> }

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

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        uploader: { select: { id: true, name: true, email: true } },
        category: true,
      },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    return NextResponse.json(document)
  } catch (error) {
    console.error('GET /api/documents/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id } = await ctx.params

    const existing = await prisma.document.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const body: unknown = await request.json()
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const {
      title,
      description,
      categoryId,
      folderId,
      tags,
      authorName,
      publishedAt,
    } = body as Record<string, unknown>

    const updateData: {
      title?: string
      description?: string | null
      categoryId?: string | null
      folderId?: string | null
      tags?: string
      authorName?: string | null
      publishedAt?: Date | null
    } = {}

    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) {
        return NextResponse.json({ error: 'title must be a non-empty string' }, { status: 400 })
      }
      updateData.title = title.trim()
    }

    if (description !== undefined) {
      updateData.description =
        typeof description === 'string' && description.trim()
          ? description.trim()
          : null
    }

    if (categoryId !== undefined) {
      updateData.categoryId =
        typeof categoryId === 'string' && categoryId.trim()
          ? categoryId.trim()
          : null
    }

    if (folderId !== undefined) {
      updateData.folderId =
        typeof folderId === 'string' && folderId.trim()
          ? folderId.trim()
          : null
    }

    if (tags !== undefined) {
      if (!Array.isArray(tags) || !tags.every((t) => typeof t === 'string')) {
        return NextResponse.json({ error: 'tags must be an array of strings' }, { status: 400 })
      }
      updateData.tags = JSON.stringify(tags)
    }

    if (authorName !== undefined) {
      updateData.authorName =
        typeof authorName === 'string' && authorName.trim()
          ? authorName.trim()
          : null
    }

    if (publishedAt !== undefined) {
      if (publishedAt === null) {
        updateData.publishedAt = null
      } else if (typeof publishedAt === 'string') {
        const parsed = new Date(publishedAt)
        if (isNaN(parsed.getTime())) {
          return NextResponse.json(
            { error: 'publishedAt must be a valid date' },
            { status: 400 }
          )
        }
        updateData.publishedAt = parsed
      } else {
        return NextResponse.json(
          { error: 'publishedAt must be a string or null' },
          { status: 400 }
        )
      }
    }

    const document = await prisma.document.update({
      where: { id },
      data: updateData as Parameters<typeof prisma.document.update>[0]['data'],
      include: {
        uploader: { select: { id: true, name: true, email: true } },
        category: true,
      },
    })

    return NextResponse.json(document)
  } catch (error) {
    console.error('PATCH /api/documents/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id } = await ctx.params

    const document = await prisma.document.findUnique({ where: { id } })
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    await prisma.document.delete({ where: { id } })

    try {
      await deleteFile(document.filePath)
    } catch (fileError) {
      console.error('Failed to delete file from disk:', fileError)
    }

    return NextResponse.json({ message: 'Document deleted successfully' })
  } catch (error) {
    console.error('DELETE /api/documents/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
