'use client'

import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, X, CheckCircle2, AlertCircle, FileText } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatBytes } from '@/lib/utils'
import { getFileTypeInfo } from '@/lib/file-types'
import type { Category } from '@/types'

interface BulkUploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: Category[]
  onSuccess: () => void
  folderId?: string | null
}

interface QueuedFile {
  id: string
  file: File
  title: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
}

function deriveTitle(filename: string): string {
  return filename.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()
}

export function BulkUploadModal({ open, onOpenChange, categories, onSuccess, folderId = null }: BulkUploadModalProps) {
  const [files, setFiles] = useState<QueuedFile[]>([])
  const [sharedAuthor, setSharedAuthor] = useState('')
  const [sharedCategory, setSharedCategory] = useState('')
  const [sharedTagsInput, setSharedTagsInput] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [globalError, setGlobalError] = useState('')

  const handleDrop = useCallback((accepted: File[]) => {
    const queued: QueuedFile[] = accepted.map((f, i) => ({
      id: `${Date.now()}-${i}-${f.name}`,
      file: f,
      title: deriveTitle(f.name),
      status: 'pending',
    }))
    setFiles((prev) => [...prev, ...queued])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    multiple: true,
    maxSize: 50 * 1024 * 1024,
    disabled: isUploading,
  })

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const updateTitle = (id: string, title: string) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, title } : f)))
  }

  const resetAll = () => {
    setFiles([])
    setSharedAuthor('')
    setSharedCategory('')
    setSharedTagsInput('')
    setGlobalError('')
    setIsUploading(false)
  }

  const handleClose = () => {
    if (isUploading) return
    resetAll()
    onOpenChange(false)
  }

  const handleUploadAll = async () => {
    if (files.length === 0) return
    const invalid = files.find((f) => !f.title.trim())
    if (invalid) {
      setGlobalError('Tous les fichiers doivent avoir un titre.')
      return
    }
    setGlobalError('')
    setIsUploading(true)

    const tags = sharedTagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    let anySuccess = false

    for (const queued of files) {
      if (queued.status === 'success') continue
      setFiles((prev) => prev.map((f) => (f.id === queued.id ? { ...f, status: 'uploading' } : f)))
      try {
        const fd = new FormData()
        fd.append('file', queued.file)
        fd.append('title', queued.title.trim())
        if (sharedAuthor.trim()) fd.append('authorName', sharedAuthor.trim())
        if (sharedCategory) fd.append('categoryId', sharedCategory)
        if (folderId) fd.append('folderId', folderId)
        if (tags.length > 0) fd.append('tags', JSON.stringify(tags))

        const res = await fetch('/api/documents', { method: 'POST', body: fd })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || `Erreur ${res.status}`)
        }
        setFiles((prev) => prev.map((f) => (f.id === queued.id ? { ...f, status: 'success' } : f)))
        anySuccess = true
      } catch (e) {
        setFiles((prev) => prev.map((f) => (f.id === queued.id ? { ...f, status: 'error', error: (e as Error).message } : f)))
      }
    }

    setIsUploading(false)
    if (anySuccess) onSuccess()
  }

  const pendingCount = files.filter((f) => f.status === 'pending' || f.status === 'error').length
  const successCount = files.filter((f) => f.status === 'success').length

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 50 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <div style={{ position: 'fixed', inset: 0, zIndex: 51, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', pointerEvents: 'none' }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 14 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 14 }}
                style={{
                  pointerEvents: 'auto',
                  background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)',
                  width: 'min(720px, calc(100vw - 40px))', maxHeight: '90vh', overflowY: 'auto',
                  padding: '28px', boxShadow: 'var(--shadow-lg)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <Dialog.Title style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    Téléverser plusieurs documents
                  </Dialog.Title>
                  <button onClick={handleClose} disabled={isUploading}
                    style={{ background: 'transparent', border: 'none', cursor: isUploading ? 'not-allowed' : 'pointer', color: 'var(--text-tertiary)', padding: 4 }}>
                    <X size={20} />
                  </button>
                </div>

                {/* Shared metadata */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Auteur (commun)</span>
                    <Input value={sharedAuthor} onChange={(e) => setSharedAuthor(e.target.value)} placeholder="ex: Dr. Martin" disabled={isUploading} />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Catégorie (commune)</span>
                    <select value={sharedCategory} onChange={(e) => setSharedCategory(e.target.value)} disabled={isUploading}
                      style={{ padding: '10px 12px', background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '14px', color: 'var(--text-primary)' }}>
                      <option value="">— Aucune —</option>
                      {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                    </select>
                  </label>
                </div>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Tags communs (séparés par virgule)</span>
                  <Input value={sharedTagsInput} onChange={(e) => setSharedTagsInput(e.target.value)} placeholder="ex: 2026, plénière" disabled={isUploading} />
                </label>

                {/* Dropzone */}
                <div
                  {...getRootProps()}
                  style={{
                    border: `2px dashed ${isDragActive ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-md)', padding: '24px', textAlign: 'center',
                    background: isDragActive ? 'rgba(0, 168, 142, 0.06)' : 'var(--bg-raised)',
                    cursor: isUploading ? 'not-allowed' : 'pointer', marginBottom: '16px',
                    transition: 'all 0.18s',
                  }}
                >
                  <input {...getInputProps()} />
                  <Upload size={28} style={{ color: 'var(--text-tertiary)', marginBottom: 8 }} />
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {isDragActive ? 'Déposez ici' : 'Glissez-déposez vos fichiers ici ou cliquez'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: 4 }}>
                    Max 50 Mo par fichier
                  </div>
                </div>

                {/* Files list */}
                {files.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                    {files.map((qf) => {
                      const info = getFileTypeInfo(qf.file.type)
                      return (
                        <div key={qf.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '12px',
                            padding: '10px 12px', background: 'var(--bg-raised)',
                            border: `1px solid ${qf.status === 'error' ? 'rgba(239,68,68,0.3)' : qf.status === 'success' ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
                            borderRadius: 'var(--radius-md)',
                          }}
                        >
                          <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: info.bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: info.color, flexShrink: 0 }}>
                            <FileText size={16} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <input
                              value={qf.title}
                              onChange={(e) => updateTitle(qf.id, e.target.value)}
                              disabled={isUploading || qf.status === 'success'}
                              style={{ width: '100%', padding: '4px 6px', background: 'transparent', border: 'none', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', outline: 'none' }}
                            />
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                              {qf.file.name} · {formatBytes(qf.file.size)} · {info.label}
                              {qf.error && <span style={{ color: 'var(--red)', marginLeft: 8 }}>{qf.error}</span>}
                            </div>
                          </div>
                          {qf.status === 'success' && <CheckCircle2 size={18} style={{ color: '#22C55E' }} />}
                          {qf.status === 'error' && <AlertCircle size={18} style={{ color: 'var(--red)' }} />}
                          {qf.status === 'uploading' && (
                            <div style={{ width: 18, height: 18, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                          )}
                          {qf.status === 'pending' && (
                            <button onClick={() => removeFile(qf.id)}
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 4 }}>
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {globalError && (
                  <div style={{ marginBottom: '12px', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--red-dim)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--red)', fontSize: '13px' }}>
                    {globalError}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                    {successCount > 0 && <span>{successCount} envoyé{successCount > 1 ? 's' : ''}</span>}
                    {successCount > 0 && pendingCount > 0 && <span> · </span>}
                    {pendingCount > 0 && <span>{pendingCount} en attente</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <Button variant="secondary" onClick={handleClose} disabled={isUploading}>
                      {successCount > 0 && pendingCount === 0 ? 'Fermer' : 'Annuler'}
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleUploadAll}
                      loading={isUploading}
                      disabled={files.length === 0 || pendingCount === 0}
                    >
                      Téléverser {pendingCount > 0 ? `(${pendingCount})` : ''}
                    </Button>
                  </div>
                </div>
              </motion.div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
