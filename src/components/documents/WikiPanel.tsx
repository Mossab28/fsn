'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check,
  X,
  Trash2,
  Pencil,
  Loader2,
  BookOpen,
  StickyNote,
  MessageSquare,
  BookMarked,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { AnnotateModal } from '@/components/documents/AnnotateModal'
import type { WikiContribution, ContributionType, SafeUser } from '@/types'

interface WikiPanelProps {
  documentId: string
  documentTitle: string
  documentMimeType: string
  currentUser: { id: string; role: string }
}

const TYPE_LABELS: Record<ContributionType, string> = {
  NOTE: 'Note',
  COMMENTAIRE: 'Commentaire',
  ANNOTATION: 'Annotation',
}

const TYPE_ICONS: Record<ContributionType, React.ReactNode> = {
  NOTE: <StickyNote size={11} />,
  COMMENTAIRE: <MessageSquare size={11} />,
  ANNOTATION: <BookMarked size={11} />,
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function relativeTime(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr })
}

export function WikiPanel({ documentId, documentTitle, documentMimeType, currentUser }: WikiPanelProps) {
  const [contributions, setContributions] = useState<WikiContribution[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAnnotate, setShowAnnotate] = useState(false)

  const isAdmin = currentUser.role === 'ADMIN'
  const canContribute = currentUser.role === 'ADMIN' || currentUser.role === 'MEMBER'

  const fetchContributions = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/documents/${documentId}/contributions`)
      if (!res.ok) throw new Error('Erreur de chargement')
      const data = await res.json()
      setContributions(data)
      setError(null)
    } catch {
      setError('Impossible de charger les contributions')
    } finally {
      setLoading(false)
    }
  }, [documentId])

  useEffect(() => {
    fetchContributions()
  }, [fetchContributions])

  const handleApprove = async (contribId: string, approved: boolean) => {
    try {
      const res = await fetch(`/api/documents/${documentId}/contributions/${contribId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isApproved: approved }),
      })
      if (!res.ok) throw new Error('Erreur')
      await fetchContributions()
    } catch {
      setError('Erreur lors de la modération')
    }
  }

  const handleDelete = async (contribId: string) => {
    try {
      const res = await fetch(`/api/documents/${documentId}/contributions/${contribId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Erreur')
      await fetchContributions()
    } catch {
      setError('Erreur lors de la suppression')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Annotate button */}
      {canContribute && (
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <button
            onClick={() => setShowAnnotate(true)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px',
              background: 'var(--accent)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <Pencil size={14} />
            Annoter ce document
          </button>
          <p
            style={{
              margin: '8px 0 0',
              fontSize: '11px',
              color: 'var(--text-tertiary)',
              textAlign: 'center',
              lineHeight: 1.5,
            }}
          >
            Téléchargez le fichier, annotez-le, puis renvoyez-le. Les modifications sont détectées automatiquement.
          </p>
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, minHeight: '200px' }}>
        {error && (
          <div
            style={{
              padding: '10px 16px',
              margin: '12px 16px 0',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: 'var(--radius-md)',
              color: '#EF4444',
              fontSize: '13px',
              fontFamily: 'var(--font-body)',
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '48px 16px',
              color: 'var(--text-tertiary)',
            }}
          >
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : contributions.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '48px 16px',
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
              <BookOpen size={22} />
            </div>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                color: 'var(--text-tertiary)',
                margin: 0,
                textAlign: 'center',
              }}
            >
              Aucune contribution pour le moment
            </p>
          </div>
        ) : (
          <div style={{ padding: '8px 0' }}>
            <AnimatePresence mode="popLayout">
              {contributions.map((contrib) => (
                <ContributionCard
                  key={contrib.id}
                  contribution={contrib}
                  isAdmin={isAdmin}
                  isOwner={contrib.userId === currentUser.id}
                  onApprove={(approved) => handleApprove(contrib.id, approved)}
                  onDelete={() => handleDelete(contrib.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Annotate modal */}
      <AnnotateModal
        isOpen={showAnnotate}
        onClose={() => setShowAnnotate(false)}
        documentId={documentId}
        documentTitle={documentTitle}
        documentMimeType={documentMimeType}
        onSuccess={() => fetchContributions()}
      />

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

/* ─── Contribution Card ─────────────────────────────────────────────────── */

interface ContributionCardProps {
  contribution: WikiContribution
  isAdmin: boolean
  isOwner: boolean
  onApprove: (approved: boolean) => void
  onDelete: () => void
}

function ContributionCard({
  contribution,
  isAdmin,
  isOwner,
  onApprove,
  onDelete,
}: ContributionCardProps) {
  const user = contribution.user as SafeUser | undefined
  const userName = user?.name ?? 'Utilisateur'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      style={{
        padding: '14px 16px',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div style={{ display: 'flex', gap: '10px' }}>
        {/* Avatar */}
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'var(--accent-dim)',
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-display)',
            fontSize: '12px',
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {getInitials(userName)}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header: name + date + type + status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              {userName}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '11px',
                color: 'var(--text-tertiary)',
              }}
            >
              {relativeTime(contribution.createdAt)}
            </span>

            {/* Type badge */}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '9999px',
                fontSize: '10px',
                fontWeight: 600,
                background: 'var(--bg-elevated)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
              }}
            >
              {TYPE_ICONS[contribution.type as ContributionType]}
              {TYPE_LABELS[contribution.type as ContributionType]}
            </span>

            {/* Approval status */}
            {!contribution.isApproved && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  fontSize: '10px',
                  fontWeight: 600,
                  background: 'rgba(245, 158, 11, 0.12)',
                  color: '#F59E0B',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                }}
              >
                En attente
              </span>
            )}
            {contribution.isApproved && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  fontSize: '10px',
                  fontWeight: 600,
                  background: 'rgba(0, 168, 142, 0.12)',
                  color: 'var(--accent)',
                  border: '1px solid rgba(0, 168, 142, 0.25)',
                }}
              >
                Approuve
              </span>
            )}
          </div>

          {/* Content */}
          {contribution.type === 'ANNOTATION' ? (
            <div>
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '12px',
                  color: 'var(--text-tertiary)',
                  fontStyle: 'italic',
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                Document modifié{contribution.content ? ' :' : ''}
              </p>
              {contribution.content && (
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '13px',
                    color: 'var(--text-primary)',
                    margin: '4px 0 0',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {contribution.content}
                </p>
              )}
            </div>
          ) : (
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                color: 'var(--text-primary)',
                margin: 0,
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {contribution.content}
            </p>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
            {isAdmin && !contribution.isApproved && (
              <button
                onClick={() => onApprove(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--accent)',
                  background: 'rgba(0, 168, 142, 0.1)',
                  border: '1px solid rgba(0, 168, 142, 0.25)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                }}
              >
                <Check size={11} />
                Approuver
              </button>
            )}
            {isAdmin && contribution.isApproved && (
              <button
                onClick={() => onApprove(false)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                }}
              >
                <X size={11} />
                Retirer approbation
              </button>
            )}
            {(isAdmin || isOwner) && (
              <button
                onClick={() => {
                  if (confirm('Supprimer cette contribution ?')) onDelete()
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 500,
                  color: 'var(--red)',
                  background: 'transparent',
                  border: '1px solid transparent',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                }}
              >
                <Trash2 size={11} />
                Supprimer
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
