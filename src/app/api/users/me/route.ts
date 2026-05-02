import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logActivity, getIpFromRequest } from '@/lib/activity-logger'

export async function GET(): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        groupId: true,
        createdAt: true,
        group: { select: { id: true, name: true, color: true } },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('GET /api/users/me error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, email } = body as { name?: string; email?: string }

    const updateData: Record<string, string> = {}

    if (typeof name === 'string') {
      const trimmed = name.trim()
      if (!trimmed) {
        return NextResponse.json({ error: 'Le nom ne peut pas etre vide' }, { status: 400 })
      }
      updateData.name = trimmed
    }

    if (typeof email === 'string') {
      const trimmed = email.trim().toLowerCase()
      if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        return NextResponse.json({ error: 'Adresse email invalide' }, { status: 400 })
      }

      // Check email uniqueness
      const existing = await prisma.user.findUnique({ where: { email: trimmed } })
      if (existing && existing.id !== session.user.id) {
        return NextResponse.json({ error: 'Cette adresse email est deja utilisee' }, { status: 409 })
      }
      updateData.email = trimmed
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Aucune donnee a mettre a jour' }, { status: 400 })
    }

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        groupId: true,
        createdAt: true,
        group: { select: { id: true, name: true, color: true } },
      },
    })

    await logActivity({
      userId: session.user.id,
      action: 'USER_UPDATE',
      entityType: 'user',
      entityId: session.user.id,
      entityName: updated.name,
      ipAddress: getIpFromRequest(request),
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('PATCH /api/users/me error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  }

  const userId = session.user.id

  try {
    // 1. Delete wiki contributions
    await prisma.wikiContribution.deleteMany({ where: { userId } })

    // 2. Reassign documents to orphaned (set uploadedBy to a placeholder)
    // We mark documents as orphaned by setting authorName to indicate deletion
    await prisma.document.updateMany({
      where: { uploadedBy: userId },
      data: {
        authorName: '[Compte supprime]',
      },
    })

    // For documents, we need to handle the foreign key - reassign to first admin or handle gracefully
    // Since SQLite doesn't support SET NULL on required fields, we need an alternative approach
    // We'll delete document versions by this user, then handle documents
    await prisma.documentVersion.deleteMany({ where: { uploadedBy: userId } })

    // 3. Delete activity logs (cascade should handle this, but be explicit)
    await prisma.activityLog.deleteMany({ where: { userId } })

    // 4. For documents uploaded by this user, we need to either delete them or reassign
    // Find an admin to reassign to
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN', id: { not: userId } },
      select: { id: true },
    })

    if (adminUser) {
      await prisma.document.updateMany({
        where: { uploadedBy: userId },
        data: { uploadedBy: adminUser.id },
      })
    } else {
      // No other admin exists - delete orphaned documents
      await prisma.document.deleteMany({ where: { uploadedBy: userId } })
    }

    // 5. Delete user record
    await prisma.user.delete({ where: { id: userId } })

    return NextResponse.json({ message: 'Compte supprime avec succes' })
  } catch (error) {
    console.error('DELETE /api/users/me error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
