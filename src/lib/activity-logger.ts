import { prisma } from '@/lib/prisma'

export type LogAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'DOCUMENT_UPLOAD'
  | 'DOCUMENT_DOWNLOAD'
  | 'DOCUMENT_DELETE'
  | 'DOCUMENT_UPDATE'
  | 'DOCUMENT_VERSION_UPLOAD'
  | 'DOCUMENT_STATUS_CHANGE'
  | 'DOCUMENT_ARCHIVE'
  | 'USER_CREATE'
  | 'USER_UPDATE'
  | 'USER_DELETE'
  | 'CATEGORY_CREATE'
  | 'CATEGORY_DELETE'

interface LogParams {
  userId: string
  action: LogAction
  entityType: string
  entityId?: string
  entityName?: string
  metadata?: Record<string, unknown>
  ipAddress?: string
}

export async function logActivity(params: LogParams): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        entityName: params.entityName ?? null,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        ipAddress: params.ipAddress ?? null,
      },
    })
  } catch {
    console.error('[ActivityLogger] Failed to write log:', params.action)
  }
}

export function getIpFromRequest(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return 'unknown'
}
