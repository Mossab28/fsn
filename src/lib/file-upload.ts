import { randomUUID } from 'crypto'
import { writeFile, unlink } from 'fs/promises'
import { join, extname, resolve } from 'path'

const ALLOWED_MIME_TYPES = new Set([
  // PDF
  'application/pdf',
  // Word
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // Excel
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  // PowerPoint
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/tiff',
  // Text
  'text/plain',
  'text/csv',
  'text/html',
  'text/markdown',
  // Audio/Video
  'video/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/webm',
  'video/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/flac',
  'audio/aac',
  'audio/x-m4a',
])

const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.tiff', '.tif',
  '.txt', '.csv', '.html', '.htm', '.md', '.markdown',
  '.mp4', '.webm', '.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac', '.mov', '.mkv',
])

// Fallback MIME guess from extension (browsers sometimes report wrong/empty types)
const EXT_TO_MIME: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.mkv': 'video/x-matroska',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.flac': 'audio/flac',
  '.aac': 'audio/aac',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.md': 'text/markdown',
  '.html': 'text/html',
}

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

function getUploadDir(): string {
  return process.env.UPLOAD_DIR || './uploads'
}

export function getFilePath(storedName: string): string {
  return resolve(join(getUploadDir(), storedName))
}

export async function saveFile(
  file: File
): Promise<{ storedName: string; filePath: string; fileSize: number; mimeType: string }> {
  const ext = extname(file.name).toLowerCase()
  // Validate by MIME OR extension (browsers sometimes mis-detect MIME for video/audio)
  const mimeOk = ALLOWED_MIME_TYPES.has(file.type)
  const extOk = ALLOWED_EXTENSIONS.has(ext)
  if (!mimeOk && !extOk) {
    throw new Error(`Unsupported file type: ${file.type || ext || 'unknown'}`)
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds the 50MB limit`)
  }

  // Resolve a clean MIME type: trust the browser if accepted, else infer from extension
  const mimeType = mimeOk ? file.type : (EXT_TO_MIME[ext] ?? file.type ?? 'application/octet-stream')

  const storedName = `${randomUUID()}${ext}`
  const filePath = getFilePath(storedName)

  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(filePath, buffer)

  return {
    storedName,
    filePath,
    fileSize: file.size,
    mimeType,
  }
}

export async function deleteFile(filePath: string): Promise<void> {
  const safeBase = resolve(getUploadDir())
  const safePath = resolve(filePath)

  if (!safePath.startsWith(safeBase)) {
    throw new Error('Invalid file path')
  }

  await unlink(safePath)
}
