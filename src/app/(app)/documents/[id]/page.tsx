'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Download,
  FileText,
  BarChart2,
  Image as ImageIcon,
  File,
  Calendar,
  User,
  HardDrive,
  Tag,
  History,
  BookOpen,
  Loader2,
  ChevronDown,
  Pencil,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Badge } from '@/components/ui/Badge'
import { WikiPanel } from '@/components/documents/WikiPanel'
import { formatBytes, formatDate, parseTags } from '@/lib/utils'
import type {
  DocumentWithRelations,
  DocumentVersion,
  DocumentStatus,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_COLORS,
} from '@/types'

const STATUS_LABELS: Record<string, string> = {
  BROUILLON: 'Brouillon',
  ENRICHISSEMENT: 'Enrichissement',
  RELECTURE: 'Relecture',
  DIFFUSION: 'Diffusion',
  ARCHIVE: 'Archive',
}

const STATUS_COLORS: Record<string, string> = {
  BROUILLON: '#9CA3AF',
  ENRICHISSEMENT: '#F59E0B',
  RELECTURE: '#3B82F6',
  DIFFUSION: '#00A88E',
  ARCHIVE: '#6B7280',
}

const ALL_STATUSES: DocumentStatus[] = [
  'BROUILLON',
  'ENRICHISSEMENT',
  'RELECTURE',
  'DIFFUSION',
  'ARCHIVE',
]

function getFileTypeConfig(mimeType: string) {
  if (mimeType === 'application/pdf') {
    return { label: 'PDF', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.12)', iconName: 'pdf' }
  }
  if (mimeType.includes('word') || mimeType.includes('document')) {
    return { label: 'Word', color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.12)', iconName: 'word' }
  }
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
    return { label: 'Excel', color: '#22C55E', bgColor: 'rgba(34, 197, 94, 0.12)', iconName: 'excel' }
  }
  if (mimeType.startsWith('image/')) {
    return { label: 'Image', color: '#A78BFA', bgColor: 'rgba(167, 139, 250, 0.12)', iconName: 'image' }
  }
  return { label: 'Fichier', color: '#71717A', bgColor: 'rgba(113, 113, 122, 0.12)', iconName: 'file' }
}

function FileIcon({ mimeType, size }: { mimeType: string; size: number }) {
  if (mimeType === 'application/pdf') return <FileText size={size} />
  if (mimeType.includes('word') || mimeType.includes('document')) return <FileText size={size} />
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return <BarChart2 size={size} />
  if (mimeType.startsWith('image/')) return <ImageIcon size={size} />
  return <File size={size} />
}

type SideTab = 'versions' | 'wiki'

export default function DocumentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()
  const documentId = params.id as string

  const [document, setDocument] = useState<DocumentWithRelations | null>(null)
  const [versions, setVersions] = useState<DocumentVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [sideTab, setSideTab] = useState<SideTab>('wiki')
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)
  const [changingStatus, setChangingStatus] = useState(false)
  const [wikiRefreshKey] = useState(0)

  const isAdmin = session?.user?.role === 'ADMIN'

  const fetchDocument = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents/${documentId}`)
      if (!res.ok) {
        if (res.status === 404) {
          router.push('/documents')
          return
        }
        throw new Error('Erreur')
      }
      const data = await res.json()
      setDocument(data)
    } catch {
      router.push('/documents')
    }
  }, [documentId, router])

  const fetchVersions = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents/${documentId}/versions`)
      if (res.ok) {
        const data = await res.json()
        setVersions(data)
      }
    } catch {
      // silent fail
    }
  }, [documentId])

  useEffect(() => {
    if (sessionStatus === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }
    Promise.all([fetchDocument(), fetchVersions()]).finally(() => setLoading(false))
  }, [session, sessionStatus, fetchDocument, fetchVersions, router])

  const handleStatusChange = async (newStatus: DocumentStatus) => {
    if (!document || changingStatus) return
    setChangingStatus(true)
    setStatusDropdownOpen(false)
    try {
      const res = await fetch(`/api/documents/${documentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        const updated = await res.json()
        setDocument(updated)
      }
    } catch {
      // silent
    } finally {
      setChangingStatus(false)
    }
  }

  if (loading || sessionStatus === 'loading') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          color: 'var(--text-tertiary)',
        }}
      >
        <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!document || !session) return null

  const fileType = getFileTypeConfig(document.mimeType)
  const isImage = document.mimeType.startsWith('image/')
  const isPdf = document.mimeType === 'application/pdf'
  const isText = document.mimeType.startsWith('text/')
  const isVideo = document.mimeType.startsWith('video/')
  const isAudio = document.mimeType.startsWith('audio/')
  const tags = parseTags(document.tags)
  const statusColor = STATUS_COLORS[document.status] || '#9CA3AF'
  const statusLabel = STATUS_LABELS[document.status] || document.status

  return (
    <div style={{ padding: '0 0 60px' }}>
      {/* Back navigation */}
      <div style={{ marginBottom: '28px' }}>
        <button
          onClick={() => router.push('/documents')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: 'var(--font-body)',
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--text-secondary)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '6px 0',
            transition: 'color 0.15s ease',
          }}
        >
          <ArrowLeft size={15} />
          Documents
        </button>
      </div>

      {/* Two-column layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '3fr 2fr',
          gap: '32px',
          alignItems: 'start',
        }}
      >
        {/* LEFT: Preview + metadata */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Preview area */}
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-xl)',
              overflow: 'hidden',
              minHeight: '320px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Preview header */}
            <div
              style={{
                padding: '14px 20px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '12px',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: 'var(--text-tertiary)',
                }}
              >
                Apercu
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '2px 8px',
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

            {/* Preview content */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                minHeight: '280px',
              }}
            >
              {isPdf && (
                <iframe
                  src={`/api/documents/${document.id}/download`}
                  title={document.title}
                  style={{
                    width: '100%',
                    height: '500px',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    background: '#fff',
                  }}
                />
              )}

              {isImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/documents/${document.id}/download`}
                  alt={document.title}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '500px',
                    borderRadius: 'var(--radius-md)',
                    objectFit: 'contain',
                    border: '1px solid var(--border)',
                  }}
                />
              )}

              {isText && (document as unknown as { textContent?: string }).textContent && (
                <pre
                  style={{
                    width: '100%',
                    maxHeight: '500px',
                    overflow: 'auto',
                    padding: '20px',
                    margin: 0,
                    fontFamily: 'var(--font-body)',
                    fontSize: '13px',
                    lineHeight: 1.7,
                    color: 'var(--text-primary)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    background: 'var(--bg-raised)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  {(document as unknown as { textContent: string }).textContent}
                </pre>
              )}

              {isVideo && (
                <video
                  src={`/api/documents/${document.id}/download`}
                  controls
                  style={{
                    width: '100%',
                    maxHeight: '500px',
                    borderRadius: 'var(--radius-md)',
                    background: '#000',
                  }}
                >
                  Votre navigateur ne supporte pas la lecture video.
                </video>
              )}

              {isAudio && (
                <div style={{ width: '100%', padding: '40px 0', textAlign: 'center' }}>
                  <div
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      background: fileType.bgColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: fileType.color,
                      margin: '0 auto 20px',
                    }}
                  >
                    <FileIcon mimeType={document.mimeType} size={36} />
                  </div>
                  <audio
                    src={`/api/documents/${document.id}/download`}
                    controls
                    style={{ width: '100%', maxWidth: '400px' }}
                  >
                    Votre navigateur ne supporte pas la lecture audio.
                  </audio>
                </div>
              )}

              {!isPdf && !isImage && !isText && !isVideo && !isAudio && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '20px',
                    textAlign: 'center',
                    padding: '40px',
                  }}
                >
                  <div
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: 'var(--radius-xl)',
                      background: fileType.bgColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: fileType.color,
                    }}
                  >
                    <FileIcon mimeType={document.mimeType} size={48} />
                  </div>
                  <div>
                    <p
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '16px',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        margin: '0 0 6px',
                      }}
                    >
                      Apercu non disponible
                    </p>
                    <p
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '13px',
                        color: 'var(--text-secondary)',
                        margin: '0 0 20px',
                      }}
                    >
                      {document.filename}
                    </p>
                    <a
                      href={`/api/documents/${document.id}/download`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 20px',
                        background: 'var(--accent)',
                        color: '#FFFFFF',
                        borderRadius: 'var(--radius-md)',
                        fontFamily: 'var(--font-body)',
                        fontSize: '13px',
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      <Download size={15} />
                      Telecharger pour consulter
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Metadata card */}
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-xl)',
              padding: '24px',
            }}
          >
            {/* Status + Category row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
              {document.category && <Badge variant="accent">{document.category.name}</Badge>}

              {/* Status badge with admin dropdown */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => isAdmin && setStatusDropdownOpen(!statusDropdownOpen)}
                  disabled={!isAdmin || changingStatus}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 10px',
                    borderRadius: '9999px',
                    background: `${statusColor}18`,
                    color: statusColor,
                    border: isAdmin ? `1px solid ${statusColor}33` : 'none',
                    fontSize: '11px',
                    fontWeight: 600,
                    fontFamily: 'var(--font-body)',
                    cursor: isAdmin ? 'pointer' : 'default',
                    letterSpacing: '0.02em',
                  }}
                >
                  {statusLabel}
                  {isAdmin && <ChevronDown size={11} />}
                </button>

                {statusDropdownOpen && isAdmin && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      marginTop: '4px',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: 'var(--shadow-md)',
                      zIndex: 50,
                      minWidth: '160px',
                      overflow: 'hidden',
                    }}
                  >
                    {ALL_STATUSES.filter((s) => s !== document.status).map((s) => (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(s)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          width: '100%',
                          padding: '8px 12px',
                          fontFamily: 'var(--font-body)',
                          fontSize: '12px',
                          fontWeight: 500,
                          color: STATUS_COLORS[s],
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'background 0.1s ease',
                        }}
                        onMouseEnter={(e) => { (e.target as HTMLElement).style.background = 'var(--bg-surface)' }}
                        onMouseLeave={(e) => { (e.target as HTMLElement).style.background = 'transparent' }}
                      >
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: STATUS_COLORS[s],
                          }}
                        />
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Version badge */}
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  fontSize: '11px',
                  fontWeight: 600,
                  fontFamily: 'var(--font-body)',
                }}
              >
                v{document.currentVersion}
              </span>
            </div>

            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '22px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: '0 0 10px',
                lineHeight: 1.2,
                letterSpacing: '-0.02em',
              }}
            >
              {document.title}
            </h1>

            {document.description && (
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  margin: '0 0 20px',
                  lineHeight: 1.65,
                }}
              >
                {document.description}
              </p>
            )}

            {/* Metadata rows */}
            <div>
              {document.authorName && (
                <MetadataRow icon={<User size={14} />} label="Auteur" value={document.authorName} />
              )}
              <MetadataRow
                icon={<User size={14} />}
                label="Mis en ligne par"
                value={document.uploader?.name || 'Inconnu'}
              />
              {document.publishedAt && (
                <MetadataRow
                  icon={<Calendar size={14} />}
                  label="Date de publication"
                  value={formatDate(document.publishedAt)}
                />
              )}
              <MetadataRow icon={<Calendar size={14} />} label="Date de creation" value={formatDate(document.createdAt)} />
              <MetadataRow icon={<HardDrive size={14} />} label="Taille" value={formatBytes(document.fileSize)} />
              <MetadataRow icon={<FileText size={14} />} label="Format" value={fileType.label} />
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '10px',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  <Tag size={12} />
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Tags
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-secondary)',
                        fontSize: '12px',
                        fontWeight: 500,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Download CTA */}
          <a
            href={`/api/documents/${document.id}/download`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '13px 20px',
              background: 'var(--accent)',
              color: '#FFFFFF',
              borderRadius: 'var(--radius-lg)',
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              fontWeight: 700,
              textDecoration: 'none',
              letterSpacing: '-0.01em',
            }}
          >
            <Download size={17} />
            Telecharger le document
          </a>
        </div>

        {/* RIGHT: Versions + Wiki tabs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {/* Tab selector */}
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
              border: '1px solid var(--border)',
              borderBottom: 'none',
              overflow: 'hidden',
            }}
          >
            <button
              onClick={() => setSideTab('wiki')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '12px 8px',
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                fontWeight: sideTab === 'wiki' ? 600 : 500,
                color: sideTab === 'wiki' ? 'var(--accent)' : 'var(--text-secondary)',
                background: sideTab === 'wiki' ? 'var(--bg-surface)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <BookOpen size={15} />
              Contributions
            </button>
            <button
              onClick={() => setSideTab('versions')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '12px 8px',
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                fontWeight: sideTab === 'versions' ? 600 : 500,
                color: sideTab === 'versions' ? 'var(--accent)' : 'var(--text-secondary)',
                background: sideTab === 'versions' ? 'var(--bg-surface)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <History size={15} />
              Versions
            </button>
          </div>

          {/* Tab content */}
          <AnimatePresence mode="wait">
            {sideTab === 'wiki' && (
              <motion.div
                key="wiki"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <WikiPanel
                  key={wikiRefreshKey}
                  documentId={documentId}
                  documentTitle={document.title}
                  documentMimeType={document.mimeType}
                  currentUser={{
                    id: session.user.id,
                    role: session.user.role,
                  }}
                />
              </motion.div>
            )}

            {sideTab === 'versions' && (
              <motion.div
                key="versions"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <VersionHistoryPanel versions={versions} documentId={documentId} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Click-away for status dropdown */}
      {statusDropdownOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 40 }}
          onClick={() => setStatusDropdownOpen(false)}
        />
      )}

    </div>
  )
}

/* ─── Metadata Row ────────────────────────────────────────────────────── */

function MetadataRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 0',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '32px',
          height: '32px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-elevated)',
          color: 'var(--text-tertiary)',
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <div style={{ flex: 1 }}>
        <span
          style={{
            display: 'block',
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
            marginBottom: '1px',
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '13px',
            color: 'var(--text-primary)',
            fontWeight: 500,
          }}
        >
          {value}
        </span>
      </div>
    </div>
  )
}

/* ─── Version History Panel ───────────────────────────────────────────── */

function VersionHistoryPanel({ versions, documentId }: { versions: DocumentVersion[]; documentId: string }) {
  if (versions.length === 0) {
    return (
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderTop: 'none',
          borderRadius: '0 0 var(--radius-xl) var(--radius-xl)',
          padding: '48px 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--bg-elevated)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-tertiary)',
          }}
        >
          <History size={22} />
        </div>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '13px',
            color: 'var(--text-tertiary)',
            margin: 0,
          }}
        >
          Aucune version supplementaire
        </p>
      </div>
    )
  }

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderTop: 'none',
        borderRadius: '0 0 var(--radius-xl) var(--radius-xl)',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.04em', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Historique des versions ({versions.length}/3)</span>
      </div>
      {versions.map((version, index) => (
        <div
          key={version.id}
          style={{
            padding: '14px 16px',
            borderBottom: index < versions.length - 1 ? '1px solid var(--border)' : 'none',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}
        >
          {/* Version indicator */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '22px',
                borderRadius: 'var(--radius-md)',
                background: version.type === 'MAJOR' ? 'rgba(0, 168, 142, 0.12)' : 'var(--bg-elevated)',
                color: version.type === 'MAJOR' ? '#00A88E' : 'var(--text-secondary)',
                fontSize: '11px',
                fontWeight: 700,
                fontFamily: 'var(--font-body)',
              }}
            >
              v{version.version}
            </span>
          </div>

          {/* Details */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                }}
              >
                {version.uploader?.name || 'Inconnu'}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '11px',
                  color: 'var(--text-tertiary)',
                }}
              >
                {formatDistanceToNow(new Date(version.createdAt), { addSuffix: true, locale: fr })}
              </span>
            </div>
            {version.changelog && (
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  margin: '4px 0 0',
                  lineHeight: 1.5,
                }}
              >
                {version.changelog}
              </p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '11px',
                  color: 'var(--text-tertiary)',
                }}
              >
                {version.filename} ({formatBytes(version.fileSize)})
              </span>
              <a
                href={`/api/documents/${documentId}/versions/${version.id}/download`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  background: 'var(--accent-dim)',
                  color: 'var(--accent)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '11px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  border: '1px solid rgba(0, 168, 142, 0.25)',
                }}
              >
                <Download size={11} />
                Telecharger
              </a>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
