import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type RouteContext = { params: Promise<{ id: string }> }

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

    const existing = await prisma.userGroup.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Groupe introuvable' }, { status: 404 })
    }

    const body: unknown = await request.json()
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { name, description, color } = body as Record<string, unknown>

    const updateData: { name?: string; description?: string | null; color?: string | null } = {}

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return NextResponse.json({ error: 'Le nom ne peut pas être vide' }, { status: 400 })
      }
      updateData.name = name.trim()
    }

    if (description !== undefined) {
      updateData.description = typeof description === 'string' ? description.trim() || null : null
    }

    if (color !== undefined) {
      updateData.color = typeof color === 'string' ? color.trim() || null : null
    }

    const group = await prisma.userGroup.update({
      where: { id },
      data: updateData,
      include: {
        _count: { select: { users: true } },
      },
    })

    return NextResponse.json(group)
  } catch (error) {
    console.error('PATCH /api/admin/groups/[id] error:', error)
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

    const existing = await prisma.userGroup.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Groupe introuvable' }, { status: 404 })
    }

    // Unassign all users from this group first
    await prisma.user.updateMany({
      where: { groupId: id },
      data: { groupId: null },
    })

    await prisma.userGroup.delete({ where: { id } })

    return NextResponse.json({ message: 'Groupe supprimé avec succès' })
  } catch (error) {
    console.error('DELETE /api/admin/groups/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
