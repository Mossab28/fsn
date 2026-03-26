import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getFilePath } from '@/lib/file-upload'
import { logActivity, getIpFromRequest } from '@/lib/activity-logger'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(
  _request: NextRequest,
  ctx: RouteContext
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await ctx.params

    const document = await prisma.document.findUnique({ where: { id } })
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const filePath = getFilePath(document.storedName)

    let fileBuffer: Buffer
    try {
      fileBuffer = await readFile(filePath)
    } catch {
      return NextResponse.json({ error: 'File not found on disk' }, { status: 404 })
    }

    const safeFilename = encodeURIComponent(document.filename).replace(
      /'/g,
      '%27'
    )

    await logActivity({
      userId: session.user.id,
      action: 'DOCUMENT_DOWNLOAD',
      entityType: 'document',
      entityId: document.id,
      entityName: document.title,
      ipAddress: getIpFromRequest(_request),
    })

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': document.mimeType,
        'Content-Disposition': `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`,
        'Content-Length': String(fileBuffer.length),
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (error) {
    console.error('GET /api/documents/[id]/download error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
