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
])

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

function getUploadDir(): string {
  return process.env.UPLOAD_DIR || './uploads'
}

export function getFilePath(storedName: string): string {
  return resolve(join(getUploadDir(), storedName))
}

export async function saveFile(
  file: File
): Promise<{ storedName: string; filePath: string; fileSize: number }> {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error(`Unsupported file type: ${file.type}`)
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds the 50MB limit`)
  }

  const ext = extname(file.name)
  const storedName = `${randomUUID()}${ext}`
  const filePath = getFilePath(storedName)

  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(filePath, buffer)

  return {
    storedName,
    filePath,
    fileSize: file.size,
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
