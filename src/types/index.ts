export type UserRole = 'ADMIN' | 'MEMBER'

export interface SafeUser {
  id: string
  email: string
  name: string
  role: UserRole
  createdAt: Date | string
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
  tags: string // JSON string array
  authorName: string | null
  publishedAt: Date | string | null
  uploadedBy: string
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

export interface DocumentWithRelations extends DocumentRecord {
  uploader: SafeUser
  category: Category | null
  parsedTags?: string[]
}

export interface SearchFilters {
  query?: string
  categoryId?: string
  mimeType?: string
  tags?: string[]
  dateFrom?: string
  dateTo?: string
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
