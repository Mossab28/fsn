import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = request.nextUrl

    const q = searchParams.get('q') ?? undefined
    const categoryId = searchParams.get('categoryId') ?? undefined
    const mimeType = searchParams.get('mimeType') ?? undefined
    const dateFrom = searchParams.get('dateFrom') ?? undefined
    const dateTo = searchParams.get('dateTo') ?? undefined
    const status = searchParams.get('status') ?? undefined
    const folderId = searchParams.get('folderId') ?? undefined
    const authorName = searchParams.get('authorName') ?? undefined
    const includeArchived = searchParams.get('includeArchived') === 'true'
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10))
    )

    let dateFromParsed: Date | undefined
    if (dateFrom) {
      const d = new Date(dateFrom)
      if (!isNaN(d.getTime())) dateFromParsed = d
    }

    let dateToParsed: Date | undefined
    if (dateTo) {
      const d = new Date(dateTo)
      if (!isNaN(d.getTime())) dateToParsed = d
    }

    // Parse multiple statuses (comma-separated)
    const statusList = status ? status.split(',').filter(Boolean) : undefined

    const where = {
      // Exclude archived by default unless explicitly requested
      ...(includeArchived ? {} : { isArchived: false }),
      ...(categoryId ? { categoryId } : {}),
      ...(mimeType ? { mimeType } : {}),
      ...(folderId ? { folderId } : {}),
      ...(statusList && statusList.length > 0
        ? statusList.length === 1
          ? { status: statusList[0] }
          : { status: { in: statusList } }
        : {}),
      ...(authorName ? { authorName: { contains: authorName } } : {}),
      ...(dateFromParsed || dateToParsed
        ? {
            createdAt: {
              ...(dateFromParsed ? { gte: dateFromParsed } : {}),
              ...(dateToParsed ? { lte: dateToParsed } : {}),
            },
          }
        : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q } },
              { description: { contains: q } },
              { authorName: { contains: q } },
              { tags: { contains: q } },
              { textContent: { contains: q } },
              {
                category: {
                  name: { contains: q },
                },
              },
            ],
          }
        : {}),
    }

    const [allResults, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          uploader: { select: { id: true, name: true, email: true } },
          category: true,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.document.count({ where }),
    ])

    // Improved relevance scoring when a query is provided
    const sorted = q
      ? allResults.sort((a, b) => {
          const ql = q.toLowerCase()
          const scoreDoc = (doc: typeof a): number => {
            let score = 0
            const titleLower = doc.title.toLowerCase()
            // Exact title match (highest)
            if (titleLower === ql) score += 100
            // Title starts with query
            else if (titleLower.startsWith(ql)) score += 80
            // Title contains query
            else if (titleLower.includes(ql)) score += 60
            // Description match
            if (doc.description?.toLowerCase().includes(ql)) score += 30
            // Author match
            if (doc.authorName?.toLowerCase().includes(ql)) score += 25
            // Tags match
            if (doc.tags?.toLowerCase().includes(ql)) score += 20
            // Contenu du fichier (indexation)
            if ((doc as Record<string, unknown>).textContent && String((doc as Record<string, unknown>).textContent).toLowerCase().includes(ql)) score += 15
            // Boost active documents over archived
            if (!doc.isArchived) score += 5
            // Boost diffusion status (published)
            if (doc.status === 'DIFFUSION') score += 3
            return score
          }
          return scoreDoc(b) - scoreDoc(a)
        })
      : allResults

    return NextResponse.json({
      data: sorted,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error('GET /api/search error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
