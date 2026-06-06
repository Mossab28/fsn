import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id } = await params

  // Build breadcrumb path by walking up the tree
  const breadcrumb: { id: string; name: string }[] = []
  let currentId: string | null = id

  while (currentId) {
    const found: { id: string; name: string; parentId: string | null } | null =
      await prisma.folder.findUnique({
        where: { id: currentId },
        select: { id: true, name: true, parentId: true },
      })
    if (!found) break
    breadcrumb.unshift({ id: found.id, name: found.name })
    currentId = found.parentId
  }

  return NextResponse.json({ breadcrumb })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { id } = await params

  // Recursively collect all folder IDs to delete
  async function collectFolderIds(folderId: string): Promise<string[]> {
    const children = await prisma.folder.findMany({
      where: { parentId: folderId },
      select: { id: true },
    })
    const childIds: string[] = []
    for (const child of children) {
      childIds.push(child.id, ...(await collectFolderIds(child.id)))
    }
    return childIds
  }

  const allFolderIds = [id, ...(await collectFolderIds(id))]

  // Detach all documents in these folders (set folderId to null)
  await prisma.document.updateMany({
    where: { folderId: { in: allFolderIds } },
    data: { folderId: null },
  })

  // Delete folders bottom-up (children first thanks to cascade, but let's be safe)
  for (const fid of allFolderIds.reverse()) {
    await prisma.folder.delete({ where: { id: fid } }).catch(() => {})
  }

  return NextResponse.json({ success: true })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const { name, color, parentId } = body

  if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
    return NextResponse.json({ error: 'Nom invalide' }, { status: 400 })
  }

  // Prevent moving a folder into itself or one of its descendants
  if (parentId !== undefined && parentId !== null) {
    if (parentId === id) {
      return NextResponse.json({ error: 'Un dossier ne peut pas être son propre parent' }, { status: 400 })
    }
    let cur: string | null = parentId
    while (cur) {
      if (cur === id) {
        return NextResponse.json({ error: 'Déplacement invalide (cycle détecté)' }, { status: 400 })
      }
      const parent: { parentId: string | null } | null = await prisma.folder.findUnique({
        where: { id: cur },
        select: { parentId: true },
      })
      cur = parent?.parentId ?? null
    }
  }

  const folder = await prisma.folder.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(color !== undefined && { color }),
      ...(parentId !== undefined && { parentId: parentId || null }),
    },
  })

  return NextResponse.json(folder)
}
