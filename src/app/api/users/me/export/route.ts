import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  }

  const userId = session.user.id

  try {
    const [user, activityLogs, documents, contributions] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          groupId: true,
          createdAt: true,
          group: { select: { name: true } },
        },
      }),
      prisma.activityLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          entityName: true,
          createdAt: true,
        },
      }),
      prisma.document.findMany({
        where: { uploadedBy: userId },
        select: {
          id: true,
          title: true,
          filename: true,
          mimeType: true,
          fileSize: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.wikiContribution.findMany({
        where: { userId },
        select: {
          id: true,
          documentId: true,
          content: true,
          type: true,
          isApproved: true,
          createdAt: true,
        },
      }),
    ])

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    const exportData = {
      exportDate: new Date().toISOString(),
      exportType: 'RGPD_DATA_EXPORT',
      profil: {
        nom: user.name,
        email: user.email,
        role: user.role,
        groupe: user.group?.name ?? null,
        inscritLe: user.createdAt,
      },
      journalActivites: activityLogs,
      documents,
      contributionsWiki: contributions,
    }

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="export-donnees-${user.name.replace(/\s+/g, '_')}-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })
  } catch (error) {
    console.error('GET /api/users/me/export error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
