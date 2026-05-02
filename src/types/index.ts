export type UserRole = 'ADMIN' | 'MEMBER' | 'READER'

export type DocumentStatus = 'BROUILLON' | 'ENRICHISSEMENT' | 'RELECTURE' | 'DIFFUSION' | 'ARCHIVE'

export type VersionType = 'MAJOR' | 'MINOR'

export type ContributionType = 'NOTE' | 'COMMENTAIRE' | 'ANNOTATION'

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  BROUILLON: 'Brouillon',
  ENRICHISSEMENT: 'Enrichissement',
  RELECTURE: 'Relecture',
  DIFFUSION: 'Diffusion',
  ARCHIVE: 'Archivé',
}

export const DOCUMENT_STATUS_COLORS: Record<DocumentStatus, string> = {
  BROUILLON: '#9CA3AF',
  ENRICHISSEMENT: '#F59E0B',
  RELECTURE: '#3B82F6',
  DIFFUSION: '#00A88E',
  ARCHIVE: '#6B7280',
}

export interface SafeUser {
  id: string
  email: string
  name: string
  role: UserRole
  groupId: string | null
  createdAt: Date | string
}

export interface UserGroup {
  id: string
  name: string
  description: string | null
  color: string | null
  createdAt: Date | string
  _count?: { users: number }
}

export interface DocumentRecord {
  id: string
  title: string
  description: string | null
  filename: string
  storedName: string
  filePath: string
  fileSize: number
  mimeType: string
  categoryId: string | null
  folderId: string | null
  tags: string
  authorName: string | null
  publishedAt: Date | string | null
  uploadedBy: string
  status: DocumentStatus
  currentVersion: string
  isArchived: boolean
  createdAt: Date | string
  updatedAt: Date | string
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  color: string | null
  icon: string | null
  createdAt: Date | string
}

export interface DocumentVersion {
  id: string
  documentId: string
  version: string
  type: VersionType
  filename: string
  storedName: string
  filePath: string
  fileSize: number
  changelog: string | null
  uploadedBy: string
  createdAt: Date | string
  uploader?: SafeUser
}

export interface WikiContribution {
  id: string
  documentId: string
  userId: string
  content: string
  type: ContributionType
  isApproved: boolean
  createdAt: Date | string
  updatedAt: Date | string
  user?: SafeUser
}

export interface DocumentWithRelations extends DocumentRecord {
  uploader: SafeUser
  category: Category | null
  parsedTags?: string[]
  versions?: DocumentVersion[]
  contributions?: WikiContribution[]
}

export interface SearchFilters {
  query?: string
  categoryId?: string
  mimeType?: string
  tags?: string[]
  dateFrom?: string
  dateTo?: string
  status?: DocumentStatus
  folderId?: string
  authorName?: string
  sortBy?: 'createdAt' | 'title' | 'fileSize'
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
  }
}
