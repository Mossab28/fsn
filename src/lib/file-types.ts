// Mime type → display info. Centralized so PPT/Word/Excel detection
// stays consistent across cards, grids, details, filters.

export type FileTypeKind = 'pdf' | 'word' | 'excel' | 'powerpoint' | 'image' | 'video' | 'audio' | 'archive' | 'text' | 'other'

export interface FileTypeInfo {
  kind: FileTypeKind
  label: string
  color: string
  bgColor: string
  iconName: 'FileText' | 'BarChart2' | 'Presentation' | 'Image' | 'Video' | 'Music' | 'Archive' | 'File'
}

export function getFileTypeInfo(mimeType: string | null | undefined): FileTypeInfo {
  const m = (mimeType || '').toLowerCase()

  if (m === 'application/pdf') {
    return { kind: 'pdf', label: 'PDF', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.12)', iconName: 'FileText' }
  }

  // PowerPoint — check BEFORE generic "document" because PPTX mime contains
  // "officedocument" which would otherwise be captured by Word
  if (
    m.includes('powerpoint') ||
    m.includes('presentationml') ||
    m.includes('presentation') ||
    m === 'application/vnd.ms-powerpoint'
  ) {
    return { kind: 'powerpoint', label: 'PowerPoint', color: '#EA580C', bgColor: 'rgba(234, 88, 12, 0.12)', iconName: 'Presentation' }
  }

  if (
    m.includes('msword') ||
    m.includes('wordprocessingml') ||
    m === 'application/msword'
  ) {
    return { kind: 'word', label: 'Word', color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.12)', iconName: 'FileText' }
  }

  if (
    m.includes('excel') ||
    m.includes('spreadsheetml') ||
    m.includes('spreadsheet') ||
    m === 'text/csv'
  ) {
    return { kind: 'excel', label: 'Excel', color: '#22C55E', bgColor: 'rgba(34, 197, 94, 0.12)', iconName: 'BarChart2' }
  }

  if (m.startsWith('image/')) {
    return { kind: 'image', label: 'Image', color: '#A78BFA', bgColor: 'rgba(167, 139, 250, 0.12)', iconName: 'Image' }
  }

  if (m.startsWith('video/')) {
    return { kind: 'video', label: 'Vidéo', color: '#EC4899', bgColor: 'rgba(236, 72, 153, 0.12)', iconName: 'Video' }
  }

  if (m.startsWith('audio/')) {
    return { kind: 'audio', label: 'Audio', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.12)', iconName: 'Music' }
  }

  if (
    m.includes('zip') ||
    m.includes('compressed') ||
    m.includes('x-tar') ||
    m.includes('x-rar')
  ) {
    return { kind: 'archive', label: 'Archive', color: '#A16207', bgColor: 'rgba(161, 98, 7, 0.12)', iconName: 'Archive' }
  }

  if (m.startsWith('text/')) {
    return { kind: 'text', label: 'Texte', color: '#64748B', bgColor: 'rgba(100, 116, 139, 0.12)', iconName: 'FileText' }
  }

  return { kind: 'other', label: 'Fichier', color: '#71717A', bgColor: 'rgba(113, 113, 122, 0.12)', iconName: 'File' }
}
