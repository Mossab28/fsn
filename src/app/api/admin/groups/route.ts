import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const groups = await prisma.userGroup.findMany({
      include: {
        _count: { select: { users: true } },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(groups)
  } catch (error) {
    console.error('GET /api/admin/groups error:', error)
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

    const { name, description, color } = body as Record<string, unknown>

    if (typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Le nom du groupe est requis' }, { status: 400 })
    }

    const group = await prisma.userGroup.create({
      data: {
        name: name.trim(),
        description: typeof description === 'string' ? description.trim() || null : null,
        color: typeof color === 'string' ? color.trim() || null : null,
      },
      include: {
        _count: { select: { users: true } },
      },
    })

    return NextResponse.json(group, { status: 201 })
  } catch (error) {
    console.error('POST /api/admin/groups error:', error)
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'Un groupe avec ce nom existe déjà' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
