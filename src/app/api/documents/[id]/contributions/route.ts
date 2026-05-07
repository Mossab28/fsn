import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { ContributionType } from '@/types'

type RouteContext = { params: Promise<{ id: string }> }

const VALID_TYPES: ContributionType[] = ['NOTE', 'COMMENTAIRE', 'ANNOTATION']

function isValidType(value: unknown): value is ContributionType {
  return typeof value === 'string' && VALID_TYPES.includes(value as ContributionType)
}

export async function GET(
  request: NextRequest,
  ctx: RouteContext
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const { id } = await ctx.params

    const document = await prisma.document.findUnique({ where: { id } })
    if (!document) {
      return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })
    }

    const typeFilter = request.nextUrl.searchParams.get('type')
    if (typeFilter && !isValidType(typeFilter)) {
      return NextResponse.json(
        { error: `Type invalide. Valeurs possibles : ${VALID_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    const isAdmin = session.user.role === 'ADMIN'

    const where: Record<string, unknown> = { documentId: id }

    if (typeFilter) {
      where.type = typeFilter
    }

    if (!isAdmin) {
      // Non-admin users see approved contributions + their own
      where.OR = [
        { isApproved: true },
        { userId: session.user.id },
      ]
    }

    const contributions = await prisma.wikiContribution.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(contributions)
  } catch (error) {
    console.error('GET /api/documents/[id]/contributions error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  ctx: RouteContext
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const role = session.user.role
  if (role !== 'ADMIN' && role !== 'MEMBER') {
    return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })
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

    const { content, type } = body as Record<string, unknown>

    if (typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'Le contenu est requis' }, { status: 400 })
    }

    if (!isValidType(type)) {
      return NextResponse.json(
        { error: `Type invalide. Valeurs possibles : ${VALID_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // Verify user still exists (session may be stale after DB reseed)
    const userExists = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!userExists) {
      return NextResponse.json(
        { error: 'Session expirée. Veuillez vous reconnecter.' },
        { status: 401 }
      )
    }

    const contribution = await prisma.wikiContribution.create({
      data: {
        documentId: id,
        userId: session.user.id,
        content: content.trim(),
        type,
        isApproved: role === 'ADMIN',
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    })

    return NextResponse.json(contribution, { status: 201 })
  } catch (error) {
    console.error('POST /api/documents/[id]/contributions error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
