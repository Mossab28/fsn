import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { DashboardClient } from './DashboardClient'

export const metadata: Metadata = {
  title: 'Tableau de bord',
}

function getGreeting(hour: number): string {
  if (hour >= 18) return 'Bonsoir'
  return 'Bonjour'
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 o'
  const units = ['o', 'Ko', 'Mo', 'Go']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const now = new Date()
  const greeting = getGreeting(now.getHours())

  // Fetch all data concurrently
  const [totalDocuments, totalCategories, totalUsers, recentDocuments, categoriesWithCount, totalFileSizeAgg] =
    await Promise.all([
      prisma.document.count(),
      prisma.category.count(),
      prisma.user.count(),
      prisma.document.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { category: true, uploader: true },
      }),
      prisma.category.findMany({
        include: {
          _count: { select: { documents: true } },
        },
        orderBy: { documents: { _count: 'desc' } },
        take: 8,
      }),
      prisma.document.aggregate({ _sum: { fileSize: true } }),
    ])

  const totalStorage = totalFileSizeAgg._sum.fileSize ?? 0

  // Serialize for client component (Dates → strings)
  const recentDocs = recentDocuments.map((d) => ({
    id: d.id,
    title: d.title,
    mimeType: d.mimeType,
    fileSize: d.fileSize,
    createdAt: d.createdAt.toISOString(),
    categoryName: d.category?.name ?? null,
    categoryColor: d.category?.color ?? null,
    uploaderName: d.uploader.name,
  }))

  const categoryBreakdown = categoriesWithCount.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color ?? null,
    count: c._count.documents,
    percentage:
      totalDocuments > 0 ? Math.round((c._count.documents / totalDocuments) * 100) : 0,
  }))

  return (
    <DashboardClient
      greeting={greeting}
      userName={session.user.name}
      userRole={session.user.role}
      stats={{
        totalDocuments,
        totalCategories,
        totalUsers,
        totalStorage: formatFileSize(totalStorage),
      }}
      recentDocuments={recentDocs}
      categoryBreakdown={categoryBreakdown}
    />
  )
}
