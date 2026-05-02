import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
      },
      orderBy: { name: 'asc' },
    })

    // Group users by group name
    const grouped: Record<string, typeof users> = {}
    const ungrouped: typeof users = []

    for (const user of users) {
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
      users,
      grouped,
      ungrouped,
      total: users.length,
    })
  } catch (error) {
    console.error('GET /api/users/directory error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
