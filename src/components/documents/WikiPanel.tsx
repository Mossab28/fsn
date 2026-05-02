'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare,
  StickyNote,
  BookMarked,
  Check,
  X,
  Trash2,
  Pencil,
  Send,
  Loader2,
  BookOpen,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { WikiContribution, ContributionType, SafeUser } from '@/types'

interface WikiPanelProps {
  documentId: string
  currentUser: { id: string; role: string }
}

type TabKey = 'NOTE' | 'COMMENTAIRE' | 'ANNOTATION'

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'NOTE', label: 'Notes', icon: <StickyNote size={15} /> },
  { key: 'COMMENTAIRE', label: 'Commentaires', icon: <MessageSquare size={15} /> },
  { key: 'ANNOTATION', label: 'Annotations', icon: <BookMarked size={15} /> },
]

const TYPE_LABELS: Record<ContributionType, string> = {
  NOTE: 'Note',
  COMMENTAIRE: 'Commentaire',
  ANNOTATION: 'Annotation',
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

export function WikiPanel({ documentId, currentUser }: WikiPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('NOTE')
  const [contributions, setContributions] = useState<WikiContribution[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [newType, setNewType] = useState<ContributionType>('NOTE')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [error, setError] = useState<string | null>(null)

  const isAdmin = currentUser.role === 'ADMIN'
  const canContribute = currentUser.role === 'ADMIN' || currentUser.role === 'MEMBER'

  const fetchContributions = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/documents/${documentId}/contributions?type=${activeTab}`)
      if (!res.ok) throw new Error('Erreur de chargement')
      const data = await res.json()
      setContributions(data)
      setError(null)
    } catch {
      setError('Impossible de charger les contributions')
    } finally {
      setLoading(false)
    }
  }, [documentId, activeTab])

  useEffect(() => {
    fetchContributions()
  }, [fetchContributions])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newContent.trim() || submitting) return

    try {
      setSubmitting(true)
      const res = await fetch(`/api/documents/${documentId}/contributions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent.trim(), type: newType }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur')
      }

      setNewContent('')
      // Switch to the tab of the newly created contribution
      if (newType !== activeTab) {
        setActiveTab(newType)
      } else {
        await fetchContributions()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la soumission')
    } finally {
      setSubmitting(false)
    }
  }

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

  const handleEdit = async (contribId: string) => {
    if (!editContent.trim()) return
    try {
      const res = await fetch(`/api/documents/${documentId}/contributions/${contribId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent.trim() }),
      })
      if (!res.ok) throw new Error('Erreur')
      setEditingId(null)
      setEditContent('')
      await fetchContributions()
    } catch {
      setError('Erreur lors de la modification')
    }
  }

  const startEditing = (contrib: WikiContribution) => {
    setEditingId(contrib.id)
    setEditContent(contrib.content)
  }

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-elevated)',
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '12px 8px',
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              fontWeight: activeTab === tab.key ? 600 : 500,
              color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-secondary)',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid var(--accent)' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

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
              Aucune {TYPE_LABELS[activeTab].toLowerCase()} pour le moment
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
                  isEditing={editingId === contrib.id}
                  editContent={editContent}
                  onEditContentChange={setEditContent}
                  onStartEdit={() => startEditing(contrib)}
                  onCancelEdit={() => { setEditingId(null); setEditContent('') }}
                  onSaveEdit={() => handleEdit(contrib.id)}
                  onApprove={(approved) => handleApprove(contrib.id, approved)}
                  onDelete={() => handleDelete(contrib.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Add contribution form */}
      {canContribute && (
        <form
          onSubmit={handleSubmit}
          style={{
            padding: '16px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-tertiary)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            Ajouter une contribution
          </div>

          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Votre contribution..."
            rows={3}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              color: 'var(--text-primary)',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              resize: 'vertical',
              outline: 'none',
              lineHeight: 1.6,
              boxSizing: 'border-box',
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as ContributionType)}
              style={{
                flex: 1,
                padding: '8px 12px',
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                color: 'var(--text-primary)',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="NOTE">Note</option>
              <option value="COMMENTAIRE">Commentaire</option>
              <option value="ANNOTATION">Annotation</option>
            </select>

            <button
              type="submit"
              disabled={!newContent.trim() || submitting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                fontWeight: 600,
                color: '#FFFFFF',
                background: !newContent.trim() || submitting ? 'var(--text-tertiary)' : 'var(--accent)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: !newContent.trim() || submitting ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {submitting ? (
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <Send size={14} />
              )}
              Envoyer
            </button>
          </div>

          {currentUser.role === 'MEMBER' && (
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '11px',
                color: 'var(--text-tertiary)',
                margin: 0,
                fontStyle: 'italic',
              }}
            >
              Votre contribution sera visible apres approbation par un administrateur.
            </p>
          )}
        </form>
      )}

      {/* Keyframe for spinner */}
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
  isEditing: boolean
  editContent: string
  onEditContentChange: (val: string) => void
  onStartEdit: () => void
  onCancelEdit: () => void
  onSaveEdit: () => void
  onApprove: (approved: boolean) => void
  onDelete: () => void
}

function ContributionCard({
  contribution,
  isAdmin,
  isOwner,
  isEditing,
  editContent,
  onEditContentChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
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
            fontSize: '11px',
            fontWeight: 700,
            flexShrink: 0,
            letterSpacing: '0.02em',
          }}
        >
          {getInitials(userName)}
        </div>

        {/* Body */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '4px',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-body)',
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

            {/* Status badge */}
            {!contribution.isApproved && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '1px 8px',
                  borderRadius: '9999px',
                  background: 'rgba(245, 158, 11, 0.12)',
                  color: '#F59E0B',
                  fontSize: '10px',
                  fontWeight: 600,
                  letterSpacing: '0.03em',
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
                  padding: '1px 8px',
                  borderRadius: '9999px',
                  background: 'rgba(0, 168, 142, 0.12)',
                  color: '#00A88E',
                  fontSize: '10px',
                  fontWeight: 600,
                  letterSpacing: '0.03em',
                }}
              >
                Approuve
              </span>
            )}
          </div>

          {/* Content */}
          {isEditing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
              <textarea
                value={editContent}
                onChange={(e) => onEditContentChange(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  fontFamily: 'var(--font-body)',
                  fontSize: '13px',
                  color: 'var(--text-primary)',
                  background: 'var(--bg)',
                  border: '1px solid var(--accent)',
                  borderRadius: 'var(--radius-md)',
                  resize: 'vertical',
                  outline: 'none',
                  lineHeight: 1.6,
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={onSaveEdit}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '5px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    fontFamily: 'var(--font-body)',
                    color: '#FFFFFF',
                    background: 'var(--accent)',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                  }}
                >
                  <Check size={12} /> Enregistrer
                </button>
                <button
                  onClick={onCancelEdit}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '5px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    fontFamily: 'var(--font-body)',
                    color: 'var(--text-secondary)',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                  }}
                >
                  <X size={12} /> Annuler
                </button>
              </div>
            </div>
          ) : (
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                color: 'var(--text-secondary)',
                margin: 0,
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {contribution.content}
            </p>
          )}

          {/* Action buttons */}
          {!isEditing && (isAdmin || isOwner) && (
            <div
              style={{
                display: 'flex',
                gap: '4px',
                marginTop: '8px',
              }}
            >
              {/* Admin: approve/reject */}
              {isAdmin && !contribution.isApproved && (
                <button
                  onClick={() => onApprove(true)}
                  title="Approuver"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    fontFamily: 'var(--font-body)',
                    color: '#00A88E',
                    background: 'rgba(0, 168, 142, 0.1)',
                    border: '1px solid rgba(0, 168, 142, 0.2)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Check size={12} /> Approuver
                </button>
              )}
              {isAdmin && contribution.isApproved && (
                <button
                  onClick={() => onApprove(false)}
                  title="Rejeter"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    fontFamily: 'var(--font-body)',
                    color: '#F59E0B',
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.2)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <X size={12} /> Rejeter
                </button>
              )}

              {/* Owner: edit */}
              {isOwner && (
                <button
                  onClick={onStartEdit}
                  title="Modifier"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    fontFamily: 'var(--font-body)',
                    color: 'var(--text-secondary)',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Pencil size={11} /> Modifier
                </button>
              )}

              {/* Admin or owner: delete */}
              {(isAdmin || isOwner) && (
                <button
                  onClick={onDelete}
                  title="Supprimer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    fontFamily: 'var(--font-body)',
                    color: '#EF4444',
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.15)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Trash2 size={11} /> Supprimer
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
