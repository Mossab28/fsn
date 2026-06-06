import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PATCH toggles isArchived on the folder, recursively on its subtree
// (subfolders + documents). This is the "Mettre à la corbeille" flow.
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { id } = await params

  const folder = await prisma.folder.findUnique({ where: { id } })
  if (!folder) {
    return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 })
  }

  const newArchived = !folder.isArchived

  // Collect the full subtree of folder ids
  async function collectSubtree(rootId: string): Promise<string[]> {
    const acc: string[] = [rootId]
    const stack: string[] = [rootId]
    while (stack.length) {
      const cur = stack.pop()!
      const children = await prisma.folder.findMany({
        where: { parentId: cur },
        select: { id: true },
      })
      for (const c of children) {
        acc.push(c.id)
        stack.push(c.id)
      }
    }
    return acc
  }

  const allIds = await collectSubtree(id)

  await prisma.$transaction([
    prisma.folder.updateMany({
      where: { id: { in: allIds } },
      data: { isArchived: newArchived },
    }),
    prisma.document.updateMany({
      where: { folderId: { in: allIds } },
      data: { isArchived: newArchived },
    }),
  ])

  return NextResponse.json({ success: true, isArchived: newArchived, affectedFolders: allIds.length })
}
