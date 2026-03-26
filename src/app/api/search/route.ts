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

    const where = {
      ...(categoryId ? { categoryId } : {}),
      ...(mimeType ? { mimeType } : {}),
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

    // Relevance ordering: title matches first
    const sorted = q
      ? allResults.sort((a, b) => {
          const aInTitle = a.title.toLowerCase().includes(q.toLowerCase())
          const bInTitle = b.title.toLowerCase().includes(q.toLowerCase())
          if (aInTitle && !bInTitle) return -1
          if (!aInTitle && bInTitle) return 1
          return 0
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
