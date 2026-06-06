'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  FileText,
  BarChart2,
  Image as ImageIcon,
  File,
  Download,
  Trash2,
  Calendar,
  User,
  Presentation,
  Video,
  Music,
  Archive,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DocumentStatusBadge } from '@/components/documents/DocumentStatusBadge'
import { formatBytes, formatDate, parseTags } from '@/lib/utils'
import { getFileTypeInfo as getFileTypeInfoBase } from '@/lib/file-types'
import type { DocumentWithRelations, DocumentStatus } from '@/types'

const TAG_COLORS = [
  { bg: 'rgba(59, 130, 246, 0.1)', text: '#3B82F6', border: 'rgba(59, 130, 246, 0.2)' },
  { bg: 'rgba(139, 92, 246, 0.1)', text: '#8B5CF6', border: 'rgba(139, 92, 246, 0.2)' },
  { bg: 'rgba(236, 72, 153, 0.1)', text: '#EC4899', border: 'rgba(236, 72, 153, 0.2)' },
  { bg: 'rgba(245, 158, 11, 0.1)', text: '#D97706', border: 'rgba(245, 158, 11, 0.2)' },
  { bg: 'rgba(0, 168, 142, 0.1)', text: '#00A88E', border: 'rgba(0, 168, 142, 0.2)' },
  { bg: 'rgba(239, 68, 68, 0.1)', text: '#DC2626', border: 'rgba(239, 68, 68, 0.2)' },
  { bg: 'rgba(34, 197, 94, 0.1)', text: '#16A34A', border: 'rgba(34, 197, 94, 0.2)' },
  { bg: 'rgba(14, 165, 233, 0.1)', text: '#0EA5E9', border: 'rgba(14, 165, 233, 0.2)' },
]

function getTagColor(tag: string) {
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
}

interface DocumentCardProps {
  document: DocumentWithRelations
  onDelete?: (id: string) => void
}

interface FileTypeConfig {
  icon: React.ReactNode
  label: string
  color: string
  bgColor: string
}

const ICON_MAP_20 = {
  FileText: <FileText size={20} />,
  BarChart2: <BarChart2 size={20} />,
  Presentation: <Presentation size={20} />,
  Image: <ImageIcon size={20} />,
  Video: <Video size={20} />,
  Music: <Music size={20} />,
  Archive: <Archive size={20} />,
  File: <File size={20} />,
} as const

function getFileTypeConfig(mimeType: string): FileTypeConfig {
  const info = getFileTypeInfoBase(mimeType)
  return { icon: ICON_MAP_20[info.iconName], label: info.label, color: info.color, bgColor: info.bgColor }
}

export function DocumentCard({ document, onDelete }: DocumentCardProps) {
  const router = useRouter()
  const fileType = getFileTypeConfig(document.mimeType)

  const handleClick = () => {
    router.push(`/documents/${document.id}`)
  }

  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    window.open(`/api/documents/${document.id}/download`, '_blank')
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onDelete?.(document.id)
  }

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
    height: '100%',
  }

  return (
    <motion.article
      style={cardStyle}
      onClick={handleClick}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{
        y: -3,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px var(--accent)',
        borderColor: 'var(--accent)',
      }}
      transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Accent glow strip on hover */}
      <motion.div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
          opacity: 0,
        }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      />

      {/* Top row: file icon + category badge */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-md)',
            background: fileType.bgColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: fileType.color,
            flexShrink: 0,
          }}
        >
          {fileType.icon}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <DocumentStatusBadge status={document.status as DocumentStatus} />
          {document.category && (
            <Badge variant="accent">{document.category.name}</Badge>
          )}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 6px',
              borderRadius: '4px',
              background: fileType.bgColor,
              color: fileType.color,
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            {fileType.label}
          </span>
        </div>
      </div>

      {/* Middle: title + description */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '15px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            lineHeight: 1.3,
            margin: 0,
            letterSpacing: '-0.01em',
          }}
        >
          {document.title}
        </h3>
        {document.description && (
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              color: 'var(--text-secondary)',
              lineHeight: 1.55,
              margin: 0,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {document.description}
          </p>
        )}

        {/* Author + date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
          {document.authorName && (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '12px',
                color: 'var(--text-tertiary)',
              }}
            >
              <User size={11} />
              {document.authorName}
            </span>
          )}
          {document.publishedAt && (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '12px',
                color: 'var(--text-tertiary)',
              }}
            >
              <Calendar size={11} />
              {formatDate(document.publishedAt)}
            </span>
          )}
        </div>
      </div>

      {/* Bottom: file size + tags + actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          paddingTop: '12px',
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
          <span
            style={{
              fontSize: '11px',
              color: 'var(--text-tertiary)',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {formatBytes(document.fileSize)}
          </span>
          <span style={{ color: 'var(--border)', fontSize: '11px', flexShrink: 0 }}>·</span>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: 'var(--accent)',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            v{document.currentVersion}
          </span>
          {parseTags(document.tags).length > 0 && (
            <>
              <span style={{ color: 'var(--border)', fontSize: '11px', flexShrink: 0 }}>·</span>
              <div
                style={{
                  display: 'flex',
                  gap: '4px',
                  overflowX: 'auto',
                  flex: 1,
                  minWidth: 0,
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  WebkitOverflowScrolling: 'touch',
                  maskImage: 'linear-gradient(to right, black 85%, transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to right, black 85%, transparent 100%)',
                }}
              >
                {parseTags(document.tags).map((tag) => {
                  const color = getTagColor(tag)
                  return (
                    <span
                      key={tag}
                      style={{
                        fontSize: '10px',
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        background: color.bg,
                        color: color.text,
                        border: `1px solid ${color.border}`,
                        whiteSpace: 'nowrap',
                        fontWeight: 500,
                        flexShrink: 0,
                      }}
                    >
                      {tag}
                    </span>
                  )
                })}
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          {onDelete && (
            <motion.button
              onClick={handleDelete}
              whileHover={{ scale: 1.05, color: 'var(--red)' }}
              whileTap={{ scale: 0.95 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '30px',
                height: '30px',
                borderRadius: 'var(--radius-sm)',
                background: 'transparent',
                border: '1px solid transparent',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                transition: 'all var(--transition)',
              }}
              aria-label="Supprimer le document"
            >
              <Trash2 size={14} />
            </motion.button>
          )}
          <Button
            variant="secondary"
            size="sm"
            icon={<Download size={13} />}
            onClick={handleDownload}
          >
            Télécharger
          </Button>
        </div>
      </div>
    </motion.article>
  )
}
