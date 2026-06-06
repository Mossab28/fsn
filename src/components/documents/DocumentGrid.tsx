'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileSearch,
  FileText,
  BarChart2,
  Image as ImageIcon,
  File,
  Download,
  Trash2,
  Presentation,
  Video,
  Music,
  Archive,
  FolderInput,
} from 'lucide-react'
import { DocumentCard } from './DocumentCard'
import { formatBytes, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import type { DocumentWithRelations } from '@/types'

interface DocumentGridProps {
  documents: DocumentWithRelations[]
  isLoading?: boolean
  onDelete?: (id: string) => void
  onMove?: (id: string) => void
  viewMode?: 'grid' | 'list'
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.24, ease: [0.4, 0, 0.2, 1] as const },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.16 },
  },
}

import { getFileTypeInfo as getFileTypeInfoBase } from '@/lib/file-types'

const ICON_MAP_16 = {
  FileText: <FileText size={16} />,
  BarChart2: <BarChart2 size={16} />,
  Presentation: <Presentation size={16} />,
  Image: <ImageIcon size={16} />,
  Video: <Video size={16} />,
  Music: <Music size={16} />,
  Archive: <Archive size={16} />,
  File: <File size={16} />,
} as const

function getFileTypeInfo(mimeType: string) {
  const info = getFileTypeInfoBase(mimeType)
  return { icon: ICON_MAP_16[info.iconName], label: info.label, color: info.color, bgColor: info.bgColor }
}

function SkeletonCard() {
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        height: '220px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-raised)',
            animation: 'skeletonPulse 1.4s ease-in-out infinite',
          }}
        />
        <div
          style={{
            width: '60px',
            height: '20px',
            borderRadius: '9999px',
            background: 'var(--bg-raised)',
            animation: 'skeletonPulse 1.4s ease-in-out infinite 0.1s',
          }}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        <div
          style={{
            height: '16px',
            borderRadius: '6px',
            background: 'var(--bg-raised)',
            width: '75%',
            animation: 'skeletonPulse 1.4s ease-in-out infinite 0.15s',
          }}
        />
        <div
          style={{
            height: '13px',
            borderRadius: '6px',
            background: 'var(--bg-raised)',
            width: '100%',
            animation: 'skeletonPulse 1.4s ease-in-out infinite 0.2s',
          }}
        />
        <div
          style={{
            height: '13px',
            borderRadius: '6px',
            background: 'var(--bg-raised)',
            width: '60%',
            animation: 'skeletonPulse 1.4s ease-in-out infinite 0.25s',
          }}
        />
      </div>
      <div
        style={{
          height: '1px',
          background: 'var(--border-subtle)',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div
          style={{
            height: '12px',
            width: '50px',
            borderRadius: '6px',
            background: 'var(--bg-raised)',
            animation: 'skeletonPulse 1.4s ease-in-out infinite 0.3s',
          }}
        />
        <div
          style={{
            height: '28px',
            width: '100px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-raised)',
            animation: 'skeletonPulse 1.4s ease-in-out infinite 0.35s',
          }}
        />
      </div>
      <style>{`
        @keyframes skeletonPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
      `}</style>
    </div>
  )
}

function SkeletonRow() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <div style={{ width: '20px', height: '20px', borderRadius: '4px', background: 'var(--bg-raised)', animation: 'skeletonPulse 1.4s ease-in-out infinite', flexShrink: 0 }} />
      <div style={{ flex: 1, height: '14px', borderRadius: '4px', background: 'var(--bg-raised)', animation: 'skeletonPulse 1.4s ease-in-out infinite 0.1s' }} />
      <div style={{ width: '60px', height: '14px', borderRadius: '4px', background: 'var(--bg-raised)', animation: 'skeletonPulse 1.4s ease-in-out infinite 0.15s' }} />
      <div style={{ width: '80px', height: '14px', borderRadius: '4px', background: 'var(--bg-raised)', animation: 'skeletonPulse 1.4s ease-in-out infinite 0.2s' }} />
      <div style={{ width: '50px', height: '14px', borderRadius: '4px', background: 'var(--bg-raised)', animation: 'skeletonPulse 1.4s ease-in-out infinite 0.25s' }} />
      <style>{`
        @keyframes skeletonPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
      `}</style>
    </div>
  )
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        gridColumn: '1 / -1',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 24px',
        gap: '16px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: 'var(--radius-xl)',
          background: 'var(--accent-dim)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--accent)',
          marginBottom: '8px',
        }}
      >
        <FileSearch size={28} />
      </div>
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '18px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          margin: 0,
        }}
      >
        Aucun document trouvé
      </h3>
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '14px',
          color: 'var(--text-secondary)',
          margin: 0,
          maxWidth: '360px',
          lineHeight: 1.6,
        }}
      >
        Aucun document ne correspond à vos critères de recherche.
        Essayez de modifier vos filtres ou d&apos;élargir votre recherche.
      </p>
    </motion.div>
  )
}

function ListRow({
  document,
  onDelete,
  onMove,
}: {
  document: DocumentWithRelations
  onDelete?: (id: string) => void
  onMove?: (id: string) => void
}) {
  const ft = getFileTypeInfo(document.mimeType)

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

  const handleMove = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onMove?.(document.id)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      whileHover={{ background: 'var(--bg-raised)' }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 16px',
        borderBottom: '1px solid var(--border-subtle)',
        cursor: 'pointer',
        transition: 'background var(--transition)',
        minHeight: '48px',
      }}
    >
      {/* File type icon */}
      <div
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '6px',
          background: ft.bgColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: ft.color,
          flexShrink: 0,
        }}
      >
        {ft.icon}
      </div>

      {/* Title */}
      <span
        style={{
          flex: 1,
          fontFamily: 'var(--font-body)',
          fontSize: '14px',
          fontWeight: 500,
          color: 'var(--text-primary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          minWidth: 0,
        }}
      >
        {document.title}
      </span>

      {/* Category */}
      <div style={{ flexShrink: 0 }}>
        {document.category ? (
          <Badge variant="accent">{document.category.name}</Badge>
        ) : (
          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>—</span>
        )}
      </div>

      {/* Author */}
      <span
        style={{
          width: '110px',
          flexShrink: 0,
          fontFamily: 'var(--font-body)',
          fontSize: '12px',
          color: 'var(--text-tertiary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {document.authorName ?? document.uploader?.name ?? '—'}
      </span>

      {/* Size */}
      <span
        style={{
          width: '60px',
          flexShrink: 0,
          fontFamily: 'var(--font-body)',
          fontSize: '12px',
          color: 'var(--text-tertiary)',
          textAlign: 'right',
        }}
      >
        {formatBytes(document.fileSize)}
      </span>

      {/* Date */}
      <span
        style={{
          width: '100px',
          flexShrink: 0,
          fontFamily: 'var(--font-body)',
          fontSize: '12px',
          color: 'var(--text-tertiary)',
          textAlign: 'right',
        }}
      >
        {formatDate(document.publishedAt ?? document.createdAt)}
      </span>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
        <motion.button
          onClick={handleDownload}
          whileHover={{ scale: 1.1, color: 'var(--accent)' }}
          whileTap={{ scale: 0.9 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            borderRadius: 'var(--radius-sm)',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-tertiary)',
            cursor: 'pointer',
          }}
          aria-label="Télécharger"
        >
          <Download size={14} />
        </motion.button>
        {onMove && (
          <motion.button
            onClick={handleMove}
            whileHover={{ scale: 1.1, color: 'var(--accent)' }}
            whileTap={{ scale: 0.9 }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '28px', height: '28px', borderRadius: 'var(--radius-sm)',
              background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer',
            }}
            aria-label="Déplacer"
            title="Déplacer dans un autre dossier"
          >
            <FolderInput size={14} />
          </motion.button>
        )}
        {onDelete && (
          <motion.button
            onClick={handleDelete}
            whileHover={{ scale: 1.1, color: 'var(--red)' }}
            whileTap={{ scale: 0.9 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: 'var(--radius-sm)',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
            }}
            aria-label="Supprimer"
            title="Mettre à la corbeille"
          >
            <Trash2 size={14} />
          </motion.button>
        )}
      </div>
    </motion.div>
  )
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
  gap: '20px',
  width: '100%',
}

export function DocumentGrid({ documents, isLoading = false, onDelete, onMove, viewMode = 'grid' }: DocumentGridProps) {
  if (isLoading) {
    if (viewMode === 'list') {
      return (
        <div
          style={{
            width: '100%',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            overflow: 'hidden',
          }}
        >
          {/* List header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 16px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg-raised)',
            }}
          >
            <span style={{ width: '28px', flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>Titre</span>
            <span style={{ flexShrink: 0, fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-tertiary)', width: '80px' }}>Catégorie</span>
            <span style={{ width: '110px', flexShrink: 0, fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>Auteur</span>
            <span style={{ width: '60px', flexShrink: 0, fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-tertiary)', textAlign: 'right' }}>Taille</span>
            <span style={{ width: '100px', flexShrink: 0, fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-tertiary)', textAlign: 'right' }}>Date</span>
            <span style={{ width: '62px', flexShrink: 0 }} />
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      )
    }

    return (
      <div style={gridStyle}>
        {Array.from({ length: 9 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div style={viewMode === 'list' ? { width: '100%' } : gridStyle}>
        <EmptyState />
      </div>
    )
  }

  if (viewMode === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          width: '100%',
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
        }}
      >
        {/* List header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 16px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-raised)',
          }}
        >
          <span style={{ width: '28px', flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontFamily: 'var(--font-body)' }}>Titre</span>
          <span style={{ flexShrink: 0, fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontFamily: 'var(--font-body)', width: '80px' }}>Catégorie</span>
          <span style={{ width: '110px', flexShrink: 0, fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontFamily: 'var(--font-body)' }}>Auteur</span>
          <span style={{ width: '60px', flexShrink: 0, fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontFamily: 'var(--font-body)', textAlign: 'right' }}>Taille</span>
          <span style={{ width: '100px', flexShrink: 0, fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontFamily: 'var(--font-body)', textAlign: 'right' }}>Date</span>
          <span style={{ width: '62px', flexShrink: 0 }} />
        </div>
        <AnimatePresence mode="popLayout">
          {documents.map((doc) => (
            <ListRow key={doc.id} document={doc} onDelete={onDelete} onMove={onMove} />
          ))}
        </AnimatePresence>
      </motion.div>
    )
  }

  return (
    <motion.div
      style={gridStyle}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <AnimatePresence mode="popLayout">
        {documents.map((doc) => (
          <motion.div
            key={doc.id}
            variants={itemVariants}
            layout
            exit="exit"
          >
            <DocumentCard document={doc} onDelete={onDelete} onMove={onMove} />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  )
}
