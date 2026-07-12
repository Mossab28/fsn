import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function GET(_request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: { select: { documents: { where: { isArchived: false } } } },
      },
      orderBy: { name: 'asc' },
    })

    const data = categories.map(({ _count, ...category }) => ({
      ...category,
      documentCount: _count.documents,
    }))

    return NextResponse.json(data)
  } catch (error) {
    console.error('GET /api/categories error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body: unknown = await request.json()
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { name, slug, description, color, icon } = body as Record<
      string,
      unknown
    >

    if (typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const finalSlug =
      typeof slug === 'string' && slug.trim()
        ? slug.trim()
        : slugify(name.trim())

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        slug: finalSlug,
        description:
          typeof description === 'string' && description.trim()
            ? description.trim()
            : null,
        color:
          typeof color === 'string' && color.trim() ? color.trim() : null,
        icon: typeof icon === 'string' && icon.trim() ? icon.trim() : null,
      },
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error('POST /api/categories error:', error)
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'A category with that name or slug already exists' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
