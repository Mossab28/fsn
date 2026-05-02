import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logActivity, getIpFromRequest } from '@/lib/activity-logger'
import type { DocumentStatus } from '@/types'

type RouteContext = { params: Promise<{ id: string }> }

const VALID_STATUSES: DocumentStatus[] = [
  'BROUILLON',
  'ENRICHISSEMENT',
  'RELECTURE',
  'DIFFUSION',
  'ARCHIVE',
]

const STATUS_ORDER: Record<DocumentStatus, number> = {
  BROUILLON: 0,
  ENRICHISSEMENT: 1,
  RELECTURE: 2,
  DIFFUSION: 3,
  ARCHIVE: 4,
}

function isValidStatus(value: unknown): value is DocumentStatus {
  return typeof value === 'string' && VALID_STATUSES.includes(value as DocumentStatus)
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

    const document = await prisma.document.findUnique({ where: { id } })
    if (!document) {
      return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })
    }

    const body: unknown = await request.json()
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
    }

    const { status } = body as Record<string, unknown>

    if (!isValidStatus(status)) {
      return NextResponse.json(
        { error: `Statut invalide. Valeurs possibles : ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    const currentStatus = document.status as DocumentStatus
    if (status === currentStatus) {
      return NextResponse.json(
        { error: 'Le document est déjà dans ce statut' },
        { status: 400 }
      )
    }

    const updated = await prisma.document.update({
      where: { id },
      data: {
        status,
        ...(status === 'ARCHIVE' ? { isArchived: true } : {}),
      },
      include: {
        uploader: { select: { id: true, name: true, email: true } },
        category: true,
      },
    })

    await logActivity({
      userId: session.user.id,
      action: 'DOCUMENT_STATUS_CHANGE',
      entityType: 'document',
      entityId: id,
      entityName: document.title,
      metadata: {
        from: currentStatus,
        to: status,
      },
      ipAddress: getIpFromRequest(request),
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('PATCH /api/documents/[id]/status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
