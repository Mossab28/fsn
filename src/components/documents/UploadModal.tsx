'use client'

import React, { useState, useCallback } from 'react'
import { useDropzone, type FileRejection } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  FileText,
  BarChart2,
  Image as ImageIcon,
  File,
  X,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { formatBytes } from '@/lib/utils'
import type { Category } from '@/types'

interface UploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: Category[]
  onSuccess: () => void
}

interface SelectedFile {
  file: File
  name: string
  size: number
  mimeType: string
}

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

function getFileIcon(mimeType: string, size = 24) {
  if (mimeType === 'application/pdf') return <FileText size={size} color="#EF4444" />
  if (mimeType.includes('word') || mimeType.includes('document')) return <FileText size={size} color="#3B82F6" />
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return <BarChart2 size={size} color="#22C55E" />
  if (mimeType.startsWith('image/')) return <ImageIcon size={size} color="#A78BFA" />
  return <File size={size} color="#71717A" />
}

const ACCEPTED_TYPES = {
  // Documents
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  // Texte
  'text/plain': ['.txt'],
  'text/csv': ['.csv'],
  'text/html': ['.html', '.htm'],
  'text/markdown': ['.md'],
  // Images
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/svg+xml': ['.svg'],
  'image/tiff': ['.tiff', '.tif'],
  // Vidéo
  'video/mp4': ['.mp4'],
  'video/webm': ['.webm'],
  // Audio
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/ogg': ['.ogg'],
  'audio/mp4': ['.m4a'],
  'audio/flac': ['.flac'],
  'audio/aac': ['.aac'],
}

function slugFromFilename(filename: string): string {
  return filename
    .replace(/\.[^/.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()
}

export function UploadModal({ open, onOpenChange, categories, onSuccess }: UploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const resetForm = useCallback(() => {
    setSelectedFile(null)
    setTitle('')
    setDescription('')
    setCategoryId('')
    setAuthorName('')
    setTagInput('')
    setTags([])
    setUploadProgress(0)
    setUploadStatus('idle')
    setErrorMessage('')
  }, [])

  const handleClose = useCallback(() => {
    if (uploadStatus !== 'uploading') {
      resetForm()
      onOpenChange(false)
    }
  }, [uploadStatus, resetForm, onOpenChange])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return
    const file = acceptedFiles[0]
    setErrorMessage('')
    setSelectedFile({
      file,
      name: file.name,
      size: file.size,
      mimeType: file.type,
    })
    setTitle(slugFromFilename(file.name))
  }, [])

  const onDropRejected = useCallback((rejections: FileRejection[]) => {
    const r = rejections[0]
    if (!r) return
    const err = r.errors[0]
    if (err?.code === 'file-too-large') {
      setErrorMessage(`Fichier trop volumineux : ${(r.file.size / 1024 / 1024).toFixed(1)} Mo (max 50 Mo)`)
    } else if (err?.code === 'file-invalid-type') {
      setErrorMessage(`Type de fichier non supporté : ${r.file.type || r.file.name.split('.').pop()}`)
    } else {
      setErrorMessage(err?.message ?? 'Fichier rejeté')
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    onDropRejected,
    // Accept any file — we validate server-side. Browsers don't always report correct MIME types
    // for video/audio files (especially MP4 → application/octet-stream sometimes).
    accept: undefined,
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50MB
  })

  const addTag = useCallback(() => {
    const trimmed = tagInput.trim().toLowerCase()
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed])
    }
    setTagInput('')
  }, [tagInput, tags])

  const removeTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag))
  }, [])

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag()
    }
    if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile || !title.trim()) return

    setUploadStatus('uploading')
    setUploadProgress(0)
    setErrorMessage('')

    const formData = new FormData()
    formData.append('file', selectedFile.file)
    formData.append('title', title.trim())
    if (description.trim()) formData.append('description', description.trim())
    if (categoryId) formData.append('categoryId', categoryId)
    if (authorName.trim()) formData.append('authorName', authorName.trim())
    if (tags.length > 0) formData.append('tags', JSON.stringify(tags))

    // Simulate progress using XMLHttpRequest for real progress tracking
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          setUploadProgress(Math.round((event.loaded / event.total) * 90))
        }
      })
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setUploadProgress(100)
          resolve()
        } else {
          try {
            const body = JSON.parse(xhr.responseText)
            reject(new Error(body.error ?? 'Erreur lors du téléversement'))
          } catch {
            reject(new Error('Erreur lors du téléversement'))
          }
        }
      })
      xhr.addEventListener('error', () => reject(new Error('Erreur réseau')))
      xhr.open('POST', '/api/documents')
      xhr.send(formData)
    }).then(() => {
      setUploadStatus('success')
      setTimeout(() => {
        onSuccess()
        handleClose()
      }, 1200)
    }).catch((err: Error) => {
      setUploadStatus('error')
      setErrorMessage(err.message)
      setUploadProgress(0)
    })
  }

  const canSubmit = selectedFile && title.trim() && uploadStatus !== 'uploading'

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(4px)',
    zIndex: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  }

  const contentStyle: React.CSSProperties = {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-xl)',
    width: '100%',
    maxWidth: '580px',
    maxHeight: '90vh',
    overflowY: 'auto',
    position: 'relative',
    boxShadow: 'var(--shadow-lg)',
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay asChild>
          <motion.div
            style={overlayStyle}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        </Dialog.Overlay>
        <Dialog.Content asChild>
          <motion.div
            style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', zIndex: 51, pointerEvents: 'none' }}
          >
            <motion.div
              style={{ ...contentStyle, pointerEvents: 'auto' }}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            >
              {/* Header */}
              <div
                style={{
                  padding: '24px 24px 20px',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <Dialog.Title
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '18px',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      margin: 0,
                    }}
                  >
                    Ajouter un document
                  </Dialog.Title>
                  <Dialog.Description
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '13px',
                      color: 'var(--text-secondary)',
                      margin: '4px 0 0',
                    }}
                  >
                    Téléversez un fichier et renseignez ses métadonnées
                  </Dialog.Description>
                </div>
                <motion.button
                  onClick={handleClose}
                  whileHover={{ scale: 1.08, color: 'var(--text-primary)' }}
                  whileTap={{ scale: 0.92 }}
                  disabled={uploadStatus === 'uploading'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-raised)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-secondary)',
                    cursor: uploadStatus === 'uploading' ? 'not-allowed' : 'pointer',
                    opacity: uploadStatus === 'uploading' ? 0.5 : 1,
                    transition: 'color var(--transition)',
                  }}
                  aria-label="Fermer"
                >
                  <X size={16} />
                </motion.button>
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Drop zone */}
                  <AnimatePresence mode="wait">
                    {!selectedFile ? (
                      <motion.div
                        key="dropzone"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        {...(getRootProps() as any)}
                        style={{
                          border: `2px dashed ${isDragReject ? 'var(--red)' : isDragActive ? 'var(--accent)' : 'var(--border)'}`,
                          borderRadius: 'var(--radius-lg)',
                          padding: '40px 24px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '12px',
                          cursor: 'pointer',
                          background: isDragActive ? 'var(--accent-dim)' : isDragReject ? 'var(--red-dim)' : 'var(--bg-raised)',
                          transition: 'all var(--transition)',
                          textAlign: 'center',
                        }}
                      >
                        <input {...getInputProps()} />
                        <div
                          style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: 'var(--radius-xl)',
                            background: isDragActive ? 'var(--accent-dim)' : 'var(--bg-overlay)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isDragActive ? 'var(--accent)' : 'var(--text-tertiary)',
                            transition: 'all var(--transition)',
                          }}
                        >
                          <Upload size={24} />
                        </div>
                        <div>
                          <p
                            style={{
                              fontFamily: 'var(--font-display)',
                              fontSize: '15px',
                              fontWeight: 600,
                              color: isDragActive ? 'var(--accent)' : 'var(--text-primary)',
                              margin: '0 0 4px',
                            }}
                          >
                            {isDragActive ? 'Déposez le fichier ici' : 'Glissez vos fichiers ici'}
                          </p>
                          <p
                            style={{
                              fontFamily: 'var(--font-body)',
                              fontSize: '13px',
                              color: 'var(--text-secondary)',
                              margin: 0,
                            }}
                          >
                            ou{' '}
                            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                              cliquez pour parcourir
                            </span>
                          </p>
                        </div>
                        <p
                          style={{
                            fontFamily: 'var(--font-body)',
                            fontSize: '11px',
                            color: 'var(--text-tertiary)',
                            margin: 0,
                          }}
                        >
                          PDF, Word, Excel, Images · Max 50 Mo
                        </p>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="file-preview"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                          padding: '16px',
                          borderRadius: 'var(--radius-lg)',
                          background: 'var(--bg-raised)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <div
                          style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: 'var(--radius-md)',
                            background: 'var(--bg-surface)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            border: '1px solid var(--border)',
                          }}
                        >
                          {getFileIcon(selectedFile.mimeType)}
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <p
                            style={{
                              fontFamily: 'var(--font-body)',
                              fontSize: '14px',
                              fontWeight: 500,
                              color: 'var(--text-primary)',
                              margin: 0,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {selectedFile.name}
                          </p>
                          <p
                            style={{
                              fontFamily: 'var(--font-body)',
                              fontSize: '12px',
                              color: 'var(--text-secondary)',
                              margin: '2px 0 0',
                            }}
                          >
                            {formatBytes(selectedFile.size)}
                          </p>
                        </div>
                        <motion.button
                          type="button"
                          onClick={() => setSelectedFile(null)}
                          whileHover={{ scale: 1.08, color: 'var(--red)' }}
                          whileTap={{ scale: 0.92 }}
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
                            flexShrink: 0,
                            transition: 'color var(--transition)',
                          }}
                        >
                          <X size={14} />
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Metadata form */}
                  <AnimatePresence>
                    {selectedFile && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.22 }}
                        style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' }}
                      >
                        <Input
                          label="Titre"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Titre du document"
                          required
                        />

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label
                            style={{
                              fontFamily: 'var(--font-body)',
                              fontSize: '12px',
                              fontWeight: 600,
                              letterSpacing: '0.04em',
                              textTransform: 'uppercase',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            Description
                          </label>
                          <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Description optionnelle..."
                            rows={3}
                            className="input-base"
                            style={{
                              padding: '9px 12px',
                              resize: 'vertical',
                              minHeight: '80px',
                              fontFamily: 'var(--font-body)',
                              fontSize: '14px',
                              color: 'var(--text-primary)',
                              background: 'var(--bg-raised)',
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius-md)',
                              outline: 'none',
                              lineHeight: 1.5,
                              width: '100%',
                            }}
                          />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          {/* Category select */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label
                              style={{
                                fontFamily: 'var(--font-body)',
                                fontSize: '12px',
                                fontWeight: 600,
                                letterSpacing: '0.04em',
                                textTransform: 'uppercase',
                                color: 'var(--text-secondary)',
                              }}
                            >
                              Catégorie
                            </label>
                            <select
                              value={categoryId}
                              onChange={(e) => setCategoryId(e.target.value)}
                              className="input-base"
                              style={{
                                padding: '9px 12px',
                                fontFamily: 'var(--font-body)',
                                fontSize: '14px',
                                color: categoryId ? 'var(--text-primary)' : 'var(--text-tertiary)',
                                background: 'var(--bg-raised)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)',
                                outline: 'none',
                                width: '100%',
                                cursor: 'pointer',
                              }}
                            >
                              <option value="">Sans catégorie</option>
                              {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                  {cat.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <Input
                            label="Auteur"
                            value={authorName}
                            onChange={(e) => setAuthorName(e.target.value)}
                            placeholder="Nom de l'auteur"
                          />
                        </div>

                        {/* Tag input */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <label
                            style={{
                              fontFamily: 'var(--font-body)',
                              fontSize: '12px',
                              fontWeight: 600,
                              letterSpacing: '0.04em',
                              textTransform: 'uppercase',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            Tags
                          </label>
                          <div
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '6px',
                              padding: '8px',
                              background: 'var(--bg-raised)',
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius-md)',
                              minHeight: '44px',
                              alignItems: 'center',
                              cursor: 'text',
                            }}
                            onClick={() => {
                              const el = document.getElementById('tag-input')
                              el?.focus()
                            }}
                          >
                            {tags.map((tag) => (
                              <span
                                key={tag}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '2px 8px 2px 10px',
                                  borderRadius: '9999px',
                                  background: 'var(--accent-dim)',
                                  color: 'var(--accent)',
                                  border: '1px solid rgba(0, 201, 167, 0.2)',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                }}
                              >
                                {tag}
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); removeTag(tag) }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--accent)',
                                    padding: 0,
                                    lineHeight: 0,
                                  }}
                                >
                                  <X size={11} />
                                </button>
                              </span>
                            ))}
                            <input
                              id="tag-input"
                              value={tagInput}
                              onChange={(e) => setTagInput(e.target.value)}
                              onKeyDown={handleTagKeyDown}
                              onBlur={addTag}
                              placeholder={tags.length === 0 ? 'Appuyez sur Entrée pour ajouter...' : ''}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                outline: 'none',
                                fontFamily: 'var(--font-body)',
                                fontSize: '13px',
                                color: 'var(--text-primary)',
                                flex: 1,
                                minWidth: '120px',
                              }}
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Progress bar */}
                  <AnimatePresence>
                    {uploadStatus === 'uploading' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            Téléversement en cours...
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 600 }}>
                            {uploadProgress}%
                          </span>
                        </div>
                        <div
                          style={{
                            height: '4px',
                            borderRadius: '9999px',
                            background: 'var(--bg-raised)',
                            overflow: 'hidden',
                          }}
                        >
                          <motion.div
                            style={{
                              height: '100%',
                              background: 'linear-gradient(90deg, var(--accent), #00E5C4)',
                              borderRadius: '9999px',
                            }}
                            initial={{ width: '0%' }}
                            animate={{ width: `${uploadProgress}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Success state */}
                  <AnimatePresence>
                    {uploadStatus === 'success' && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '12px 16px',
                          borderRadius: 'var(--radius-md)',
                          background: 'rgba(34, 197, 94, 0.1)',
                          border: '1px solid rgba(34, 197, 94, 0.2)',
                          color: '#22C55E',
                        }}
                      >
                        <CheckCircle2 size={18} />
                        <span style={{ fontSize: '13px', fontWeight: 500 }}>
                          Document téléversé avec succès !
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Error state */}
                  <AnimatePresence>
                    {uploadStatus === 'error' && errorMessage && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '12px 16px',
                          borderRadius: 'var(--radius-md)',
                          background: 'var(--red-dim)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          color: 'var(--red)',
                        }}
                      >
                        <AlertCircle size={18} />
                        <span style={{ fontSize: '13px', fontWeight: 500 }}>{errorMessage}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Footer */}
                <div
                  style={{
                    padding: '16px 24px',
                    borderTop: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '10px',
                  }}
                >
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleClose}
                    disabled={uploadStatus === 'uploading'}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={!canSubmit}
                    loading={uploadStatus === 'uploading'}
                    icon={uploadStatus !== 'uploading' ? <Upload size={15} /> : undefined}
                  >
                    {uploadStatus === 'uploading' ? 'Téléversement...' : 'Publier le document'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
