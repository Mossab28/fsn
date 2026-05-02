import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
type Role = 'ADMIN' | 'MEMBER' | 'READER'
type RouteContext = { params: Promise<{ id: string }> }

const VALID_ROLES = new Set<string>(['ADMIN', 'MEMBER', 'READER'])

function isValidRole(value: unknown): value is Role {
  return typeof value === 'string' && VALID_ROLES.has(value)
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

    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body: unknown = await request.json()
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { name, role, email, groupId } = body as Record<string, unknown>

    const updateData: { name?: string; role?: Role; email?: string; groupId?: string | null } = {}

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return NextResponse.json(
          { error: 'name must be a non-empty string' },
          { status: 400 }
        )
      }
      updateData.name = name.trim()
    }

    if (email !== undefined) {
      if (typeof email !== 'string' || !email.trim()) {
        return NextResponse.json(
          { error: 'email must be a non-empty string' },
          { status: 400 }
        )
      }
      updateData.email = email.trim().toLowerCase()
    }

    if (role !== undefined) {
      if (!isValidRole(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
      }
      updateData.role = role
    }

    if (groupId !== undefined) {
      if (groupId === null || groupId === '') {
        updateData.groupId = null
      } else if (typeof groupId === 'string') {
        updateData.groupId = groupId
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('PATCH /api/admin/users/[id] error:', error)
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

    if (id === session.user.id) {
      return NextResponse.json(
        { error: 'You cannot delete your own account' },
        { status: 400 }
      )
    }

    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    await prisma.user.delete({ where: { id } })

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('DELETE /api/admin/users/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
