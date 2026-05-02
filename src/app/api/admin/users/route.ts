import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
type Role = 'ADMIN' | 'MEMBER' | 'READER'

const VALID_ROLES = new Set<string>(['ADMIN', 'MEMBER', 'READER'])

function isValidRole(value: unknown): value is Role {
  return typeof value === 'string' && VALID_ROLES.has(value)
}

export async function GET(_request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        groupId: true,
        createdAt: true,
        updatedAt: true,
        group: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('GET /api/admin/users error:', error)
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

    const { email, name, role, password } = body as Record<string, unknown>

    if (typeof email !== 'string' || !email.trim()) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 })
    }
    if (typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }
    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { error: 'password must be at least 8 characters' },
        { status: 400 }
      )
    }

    const finalRole: Role =
      role !== undefined
        ? isValidRole(role)
          ? role
          : (() => {
              throw new Error('Invalid role')
            })()
        : 'MEMBER'

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        name: name.trim(),
        password: hashedPassword,
        role: finalRole,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('POST /api/admin/users error:', error)
    if (error instanceof Error && error.message === 'Invalid role') {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'A user with that email already exists' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
