import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { LogAction } from '@/lib/activity-logger'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  // Accept ?limit= as an alias for pageSize. Cap raised to 1000 so admins
  // can audit full history (was hardcoded at 100 which silently capped queries).
  const rawSize = searchParams.get('pageSize') ?? searchParams.get('limit') ?? '50'
  const pageSize = Math.min(1000, Math.max(1, parseInt(rawSize) || 50))
  const userId = searchParams.get('userId') ?? undefined
  const action = searchParams.get('action') as LogAction | null
  const entityType = searchParams.get('entityType') ?? undefined
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')

  const where = {
    ...(userId && { userId }),
    ...(action && { action }),
    ...(entityType && { entityType }),
    ...(dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom && { gte: new Date(dateFrom) }),
            ...(dateTo && { lte: new Date(dateTo) }),
          },
        }
      : {}),
  }

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.activityLog.count({ where }),
  ])

  return NextResponse.json({
    data: logs,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  })
}
