import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logActivity, getIpFromRequest } from '@/lib/activity-logger'

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(
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
      return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })
    }

    const newArchived = !document.isArchived

    const updated = await prisma.document.update({
      where: { id },
      data: {
        isArchived: newArchived,
        ...(newArchived ? { status: 'ARCHIVE' } : {}),
      },
      include: {
        uploader: { select: { id: true, name: true, email: true } },
        category: true,
      },
    })

    await logActivity({
      userId: session.user.id,
      action: 'DOCUMENT_ARCHIVE',
      entityType: 'document',
      entityId: id,
      entityName: document.title,
      metadata: { isArchived: newArchived },
      ipAddress: getIpFromRequest(_request),
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('PATCH /api/documents/[id]/archive error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
