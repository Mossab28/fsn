import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// The folder tree changes as users create/rename/move folders. Any caching here
// makes freshly created folders invisible in the "move to" selectors.
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const all = searchParams.get('all')
  const parentId = searchParams.get('parentId') // null = root
  const includeArchived = searchParams.get('includeArchived') === 'true'
  const archivedOnly = searchParams.get('archivedOnly') === 'true'

  const archiveFilter = archivedOnly
    ? { isArchived: true }
    : includeArchived
      ? {}
      : { isArchived: false }

  const folders = await prisma.folder.findMany({
    where: all === 'true'
      ? archiveFilter
      : { ...archiveFilter, parentId: parentId || null },
    include: {
      _count: { select: { children: { where: { isArchived: false } }, documents: { where: { isArchived: false } } } },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(folders, {
    headers: { 'Cache-Control': 'no-store, must-revalidate' },
  })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const body = await req.json()
  const { name, color, parentId } = body

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'Nom requis' }, { status: 400 })
  }

  const folder = await prisma.folder.create({
    data: {
      name: name.trim(),
      color: color || null,
      parentId: parentId || null,
    },
    include: {
      _count: { select: { children: { where: { isArchived: false } }, documents: { where: { isArchived: false } } } },
    },
  })

  return NextResponse.json(folder, { status: 201 })
}
