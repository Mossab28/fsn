import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { ContributionType } from '@/types'

type RouteContext = { params: Promise<{ id: string; contribId: string }> }

const VALID_TYPES: ContributionType[] = ['NOTE', 'COMMENTAIRE', 'ANNOTATION']

function isValidType(value: unknown): value is ContributionType {
  return typeof value === 'string' && VALID_TYPES.includes(value as ContributionType)
}

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const { id, contribId } = await ctx.params

    const contribution = await prisma.wikiContribution.findFirst({
      where: { id: contribId, documentId: id },
    })

    if (!contribution) {
      return NextResponse.json({ error: 'Contribution introuvable' }, { status: 404 })
    }

    const body: unknown = await request.json()
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
    }

    const { isApproved, content, type } = body as Record<string, unknown>

    // Admin approval/rejection
    if (isApproved !== undefined) {
      if (session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })
      }

      if (typeof isApproved !== 'boolean') {
        return NextResponse.json({ error: 'isApproved doit être un booléen' }, { status: 400 })
      }

      const updated = await prisma.wikiContribution.update({
        where: { id: contribId },
        data: { isApproved },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      })

      return NextResponse.json(updated)
    }

    // Owner editing their own contribution
    if (contribution.userId !== session.user.id) {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })
    }

    const updateData: { content?: string; type?: string } = {}

    if (content !== undefined) {
      if (typeof content !== 'string' || !content.trim()) {
        return NextResponse.json({ error: 'Le contenu est requis' }, { status: 400 })
      }
      updateData.content = content.trim()
    }

    if (type !== undefined) {
      if (!isValidType(type)) {
        return NextResponse.json(
          { error: `Type invalide. Valeurs possibles : ${VALID_TYPES.join(', ')}` },
          { status: 400 }
        )
      }
      updateData.type = type
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Aucune modification fournie' }, { status: 400 })
    }

    const updated = await prisma.wikiContribution.update({
      where: { id: contribId },
      data: updateData,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('PATCH /api/documents/[id]/contributions/[contribId] error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const { id, contribId } = await ctx.params

    const contribution = await prisma.wikiContribution.findFirst({
      where: { id: contribId, documentId: id },
    })

    if (!contribution) {
      return NextResponse.json({ error: 'Contribution introuvable' }, { status: 404 })
    }

    const isAdmin = session.user.role === 'ADMIN'
    const isOwner = contribution.userId === session.user.id

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })
    }

    await prisma.wikiContribution.delete({ where: { id: contribId } })

    return NextResponse.json({ message: 'Contribution supprimée' })
  } catch (error) {
    console.error('DELETE /api/documents/[id]/contributions/[contribId] error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
