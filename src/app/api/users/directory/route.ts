import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const isAdmin = session.user.role === 'ADMIN'

  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim() ?? ''

    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : {}

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        groupId: true,
        createdAt: true,
        group: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        ...(isAdmin
          ? {
              _count: { select: { documents: true } },
            }
          : {}),
      },
      orderBy: { name: 'asc' },
    })

    // For admin users, fetch last login date per user
    let lastLoginMap: Record<string, string> = {}
    if (isAdmin) {
      const userIds = users.map((u) => u.id)
      const loginLogs = await prisma.activityLog.findMany({
        where: {
          userId: { in: userIds },
          action: 'LOGIN',
        },
        orderBy: { createdAt: 'desc' },
        select: {
          userId: true,
          createdAt: true,
        },
      })
      // Keep only the most recent login per user
      for (const log of loginLogs) {
        if (!lastLoginMap[log.userId]) {
          lastLoginMap[log.userId] = log.createdAt.toISOString()
        }
      }
    }

    // Enrich users with admin-only fields
    const enrichedUsers = isAdmin
      ? users.map((u) => ({
          ...u,
          documentsCount: ('_count' in u) ? (u as { _count: { documents: number } })._count.documents : 0,
          lastLogin: lastLoginMap[u.id] ?? null,
        }))
      : users

    // Group users by group name
    const grouped: Record<string, typeof enrichedUsers> = {}
    const ungrouped: typeof enrichedUsers = []

    for (const user of enrichedUsers) {
      if (user.group) {
        const groupName = user.group.name
        if (!grouped[groupName]) {
          grouped[groupName] = []
        }
        grouped[groupName].push(user)
      } else {
        ungrouped.push(user)
      }
    }

    return NextResponse.json({
      users: enrichedUsers,
      grouped,
      ungrouped,
      total: enrichedUsers.length,
    })
  } catch (error) {
    console.error('GET /api/users/directory error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
