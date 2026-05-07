import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logActivity, getIpFromRequest } from '@/lib/activity-logger'

type RouteContext = { params: Promise<{ id: string; versionId: string }> }

export async function GET(
  request: NextRequest,
  ctx: RouteContext
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const { id, versionId } = await ctx.params

    const version = await prisma.documentVersion.findUnique({
      where: { id: versionId },
      include: { document: true },
    })

    if (!version || version.documentId !== id) {
      return NextResponse.json({ error: 'Version introuvable' }, { status: 404 })
    }

    let buffer: Buffer
    try {
      buffer = await readFile(version.filePath)
    } catch {
      return NextResponse.json({ error: 'Fichier introuvable sur le disque' }, { status: 404 })
    }

    // Log download (fire and forget)
    logActivity({
      userId: session.user.id,
      action: 'DOCUMENT_DOWNLOAD',
      entityType: 'document',
      entityId: id,
      entityName: `${version.document.title} v${version.version}`,
      metadata: { versionId, version: version.version },
      ipAddress: getIpFromRequest(request),
    }).catch(() => {})

    const filename = `${version.document.title}_v${version.version}_${version.filename}`

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': version.document.mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (error) {
    console.error('GET /api/documents/[id]/versions/[versionId]/download error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
