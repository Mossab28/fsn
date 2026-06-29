'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trash2,
  AlertCircle,
  ArchiveRestore,
  FileText,
  Calendar,
  FolderOpen,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { formatBytes, formatDate } from '@/lib/utils'
import type { DocumentWithRelations } from '@/types'

interface ArchivedFolder {
  id: string
  name: string
  color: string | null
  parentId: string | null
  _count: { children: number; documents: number }
  updatedAt: string
}

export default function CorbeillePage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [items, setItems] = useState<DocumentWithRelations[]>([])
  const [folderItems, setFolderItems] = useState<ArchivedFolder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [confirmDeleteFolder, setConfirmDeleteFolder] = useState<string | null>(null)
  const [confirmEmpty, setConfirmEmpty] = useState(false)
  const [emptying, setEmptying] = useState(false)
  const [error, setError] = useState('')

  const isAdmin = session?.user?.role === 'ADMIN'

  useEffect(() => {
    if (status === 'authenticated' && !isAdmin) {
      router.replace('/dashboard')
    }
  }, [status, isAdmin, router])

  const fetchTrash = useCallback(async () => {
    setIsLoading(true)
    try {
      const [docsRes, foldersRes] = await Promise.all([
        fetch('/api/search?includeArchived=true&pageSize=200'),
        fetch('/api/folders?all=true&archivedOnly=true'),
      ])
      const docsData = await docsRes.json()
      const archivedDocs = (docsData.data || []).filter((d: DocumentWithRelations) => d.isArchived)
      setItems(archivedDocs)
      const foldersData = await foldersRes.json()
      setFolderItems(Array.isArray(foldersData) ? foldersData : [])
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAdmin) fetchTrash()
  }, [isAdmin, fetchTrash])

  const handleRestore = async (id: string) => {
    setBusyId(id)
    setError('')
    try {
      const res = await fetch(`/api/documents/${id}/archive`, { method: 'PATCH' })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Erreur lors de la restauration')
      }
      setItems((prev) => prev.filter((d) => d.id !== id))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  const handlePermanentDelete = async () => {
    if (!confirmDelete) return
    setBusyId(confirmDelete)
    setError('')
    try {
      const res = await fetch(`/api/documents/${confirmDelete}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Erreur lors de la suppression')
      }
      setItems((prev) => prev.filter((d) => d.id !== confirmDelete))
      setConfirmDelete(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  const handleEmptyTrash = async () => {
    setEmptying(true)
    setError('')
    const failures: string[] = []
    for (const item of items) {
      try {
        const res = await fetch(`/api/documents/${item.id}`, { method: 'DELETE' })
        if (!res.ok) failures.push(`Document "${item.title}" (HTTP ${res.status})`)
      } catch (e) {
        failures.push(`Document "${item.title}" — ${(e as Error).message}`)
      }
    }
    for (const folder of folderItems) {
      try {
        const res = await fetch(`/api/folders/${folder.id}`, { method: 'DELETE' })
        if (!res.ok) failures.push(`Dossier "${folder.name}" (HTTP ${res.status})`)
      } catch (e) {
        failures.push(`Dossier "${folder.name}" — ${(e as Error).message}`)
      }
    }
    setEmptying(false)
    setConfirmEmpty(false)
    if (failures.length > 0) {
      setError(`${failures.length} élément(s) n'ont pas pu être supprimés : ${failures.slice(0, 3).join(' ; ')}${failures.length > 3 ? '…' : ''}`)
    }
    fetchTrash()
  }

  const handleRestoreFolder = async (id: string) => {
    setBusyId(id)
    setError('')
    try {
      const res = await fetch(`/api/folders/${id}/archive`, { method: 'PATCH' })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Erreur lors de la restauration')
      }
      setFolderItems((prev) => prev.filter((f) => f.id !== id))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  const handlePermanentDeleteFolder = async () => {
    if (!confirmDeleteFolder) return
    setBusyId(confirmDeleteFolder)
    setError('')
    try {
      const res = await fetch(`/api/folders/${confirmDeleteFolder}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Erreur lors de la suppression')
      }
      setFolderItems((prev) => prev.filter((f) => f.id !== confirmDeleteFolder))
      setConfirmDeleteFolder(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  if (status === 'loading' || !isAdmin) {
    return null
  }

  return (
    <>
      <PageHeader
        title="Corbeille"
        description={
          !isLoading
            ? items.length === 0 && folderItems.length === 0
              ? 'La corbeille est vide'
              : [
                  folderItems.length > 0
                    ? `${folderItems.length} dossier${folderItems.length > 1 ? 's' : ''}`
                    : null,
                  items.length > 0
                    ? `${items.length} document${items.length > 1 ? 's' : ''}`
                    : null,
                ].filter(Boolean).join(', ')
            : undefined
        }
        action={
          items.length > 0 || folderItems.length > 0 ? (
            <Button variant="danger" icon={<Trash2 size={14} />} onClick={() => setConfirmEmpty(true)}>
              Vider la corbeille
            </Button>
          ) : undefined
        }
      />

      <div style={{ padding: '24px 32px' }}>
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--red-dim)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: 'var(--red)',
              fontSize: '13px',
              marginBottom: '16px',
            }}
          >
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
            Chargement...
          </div>
        ) : items.length === 0 && folderItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: 'center', padding: '80px 24px' }}
          >
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: 'var(--radius-xl)',
                background: 'var(--bg-raised)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 18px',
                color: 'var(--text-tertiary)',
              }}
            >
              <Trash2 size={30} />
            </div>
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '18px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                margin: '0 0 6px',
              }}
            >
              La corbeille est vide
            </h3>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                color: 'var(--text-secondary)',
                margin: 0,
              }}
            >
              Les documents que vous supprimez seront déplacés ici avant suppression définitive.
            </p>
          </motion.div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {folderItems.length > 0 && (
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>
                  Dossiers
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {folderItems.map((folder) => (
                    <motion.div
                      key={folder.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '14px',
                        padding: '14px 16px', background: 'var(--bg-surface)',
                        border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <div style={{
                        width: '36px', height: '36px', borderRadius: 'var(--radius-sm)',
                        background: folder.color ? `${folder.color}22` : 'var(--bg-raised)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: folder.color || 'var(--text-tertiary)', flexShrink: 0,
                      }}>
                        <FolderOpen size={16} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {folder.name}
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '2px', fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-body)' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={10} /> {formatDate(folder.updatedAt)}
                          </span>
                          {folder._count.documents > 0 && <span>{folder._count.documents} doc{folder._count.documents > 1 ? 's' : ''}</span>}
                          {folder._count.children > 0 && <span>{folder._count.children} sous-dossier{folder._count.children > 1 ? 's' : ''}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        <Button variant="secondary" size="sm" icon={<ArchiveRestore size={13} />}
                          onClick={() => handleRestoreFolder(folder.id)}
                          disabled={busyId === folder.id}>
                          Restaurer
                        </Button>
                        <Button variant="danger" size="sm" icon={<Trash2 size={13} />}
                          onClick={() => setConfirmDeleteFolder(folder.id)}
                          disabled={busyId === folder.id}>
                          Supprimer
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {items.length > 0 && (
              <div>
                {folderItems.length > 0 && (
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>
                    Documents
                  </h3>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {items.map((doc) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '14px 16px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-raised)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-tertiary)',
                    flexShrink: 0,
                  }}
                >
                  <FileText size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {doc.title}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: '12px',
                      marginTop: '2px',
                      fontSize: '11px',
                      color: 'var(--text-tertiary)',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={10} /> {formatDate(doc.updatedAt)}
                    </span>
                    <span>{formatBytes(doc.fileSize)}</span>
                    {doc.category && <span>{doc.category.name}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<ArchiveRestore size={13} />}
                    onClick={() => handleRestore(doc.id)}
                    disabled={busyId === doc.id}
                  >
                    Restaurer
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    icon={<Trash2 size={13} />}
                    onClick={() => setConfirmDelete(doc.id)}
                    disabled={busyId === doc.id}
                  >
                    Supprimer
                  </Button>
                </div>
              </motion.div>
            ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDeleteFolder !== null}
        title="Supprimer définitivement ce dossier"
        description="Le dossier et tous ses sous-dossiers seront supprimés. Les documents qu'ils contenaient resteront dans la corbeille."
        confirmLabel="Supprimer définitivement"
        variant="danger"
        loading={busyId !== null && busyId === confirmDeleteFolder}
        onConfirm={handlePermanentDeleteFolder}
        onCancel={() => setConfirmDeleteFolder(null)}
      />

      <ConfirmDialog
        open={confirmEmpty}
        title="Vider la corbeille"
        description={`Tous les documents (${items.length}) seront supprimés définitivement. Cette action est irréversible.`}
        confirmLabel="Vider la corbeille"
        variant="danger"
        loading={emptying}
        onConfirm={handleEmptyTrash}
        onCancel={() => setConfirmEmpty(false)}
      />

      {/* Permanent delete confirm */}
      <AnimatePresence>
        {confirmDelete && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => busyId === null && setConfirmDelete(null)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(4px)',
                zIndex: 50,
              }}
            />
            <div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 51,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
                padding: '20px',
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                style={{
                  pointerEvents: 'auto',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '28px',
                  width: '100%',
                  maxWidth: '420px',
                  boxShadow: 'var(--shadow-lg)',
                }}
              >
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--red-dim)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--red)',
                      flexShrink: 0,
                    }}
                  >
                    <Trash2 size={18} />
                  </div>
                  <div>
                    <h3
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '16px',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        margin: '0 0 6px',
                      }}
                    >
                      Supprimer définitivement
                    </h3>
                    <p
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '13px',
                        color: 'var(--text-secondary)',
                        margin: 0,
                        lineHeight: 1.55,
                      }}
                    >
                      Le document et son fichier seront supprimés définitivement. Cette action est irréversible.
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <Button
                    variant="secondary"
                    onClick={() => setConfirmDelete(null)}
                    disabled={busyId !== null}
                  >
                    Annuler
                  </Button>
                  <Button
                    variant="danger"
                    onClick={handlePermanentDelete}
                    loading={busyId !== null}
                    icon={busyId === null ? <Trash2 size={14} /> : undefined}
                  >
                    {busyId !== null ? 'Suppression...' : 'Supprimer définitivement'}
                  </Button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
