import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date))
}

export function getFileIcon(mimeType: string): string {
  // Order matters: PowerPoint must be checked before generic "document"
  // (PPTX mime includes "officedocument" which would match Word otherwise)
  if (mimeType === 'application/pdf') return 'FileText'
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'Presentation'
  if (mimeType.includes('msword') || mimeType.includes('wordprocessingml')) return 'FileText'
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'Sheet'
  if (mimeType.startsWith('image/')) return 'Image'
  return 'File'
}

export function parseTags(tags: string | string[]): string[] {
  if (Array.isArray(tags)) return tags
  if (!tags || tags === '[]') return []
  try {
    const parsed = JSON.parse(tags)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
}
