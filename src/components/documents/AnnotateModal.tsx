'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import { Upload, X, FileText, AlertCircle, CheckCircle2, Pencil } from 'lucide-react'

interface AnnotateModalProps {
  isOpen: boolean
  onClose: () => void
  documentId: string
  documentTitle: string
  documentMimeType: string
  onSuccess: () => void
}

const SUPPORTED_MIMES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'text/csv',
  'text/html',
]

export function AnnotateModal({
  isOpen,
  onClose,
  documentId,
  documentTitle,
  documentMimeType,
  onSuccess,
}: AnnotateModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [note, setNote] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ summary: string; addedChars: number; removedChars: number } | null>(null)

  const isSupported = SUPPORTED_MIMES.includes(documentMimeType)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { [documentMimeType]: [] },
    maxFiles: 1,
    onDrop: (accepted) => {
      if (accepted[0]) {
        setFile(accepted[0])
        setError(null)
      }
    },
  })

  const handleClose = () => {
    if (uploading) return
    setFile(null)
    setNote('')
    setError(null)
    setResult(null)
    onClose()
  }

  const handleSubmit = async () => {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      if (note.trim()) formData.append('note', note.trim())

      const res = await fetch(`/api/documents/${documentId}/annotate`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Erreur lors de l\'envoi')
        setUploading(false)
        return
      }
      setResult(data.diff)
      setUploading(false)
      // Auto-close after 2.5s
      setTimeout(() => {
        onSuccess()
        handleClose()
      }, 2500)
    } catch {
      setError('Erreur réseau')
      setUploading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 100,
            }}
          />
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 101,
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
              transition={{ duration: 0.2 }}
              style={{
                pointerEvents: 'auto',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-xl)',
                padding: '28px',
                width: '100%',
                maxWidth: '520px',
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '20px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(245, 158, 11, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#F59E0B',
                    flexShrink: 0,
                  }}
                >
                  <Pencil size={20} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>
                    Annoter le document
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    Téléchargez le document, annotez-le, puis renvoyez-le ici. Les modifications seront détectées automatiquement.
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  disabled={uploading}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-tertiary)',
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    padding: '4px',
                    flexShrink: 0,
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {!isSupported && (
                <div style={{ padding: '12px 14px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius-md)', color: '#EF4444', fontSize: '13px' }}>
                  Type de fichier non supporté pour l&apos;annotation automatique. Formats acceptés : PDF, DOCX, TXT, MD, CSV, HTML.
                </div>
              )}

              {isSupported && !result && (
                <>
                  {/* Step 1: download original */}
                  <div style={{ marginBottom: '16px', padding: '12px 14px', background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)', flex: 1 }}>
                      1. Téléchargez le document original
                    </span>
                    <a
                      href={`/api/documents/${documentId}/download`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        background: 'var(--accent)',
                        color: '#fff',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '12px',
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      <FileText size={12} />
                      Télécharger
                    </a>
                  </div>

                  {/* Step 2: dropzone */}
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 8px', fontWeight: 500 }}>
                    2. Renvoyez la version annotée
                  </p>
                  <div
                    {...getRootProps()}
                    style={{
                      border: `2px dashed ${isDragActive ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius-lg)',
                      padding: '24px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all var(--transition)',
                      background: isDragActive ? 'var(--accent-dim)' : 'var(--bg-raised)',
                      marginBottom: '16px',
                    }}
                  >
                    <input {...getInputProps()} />
                    <Upload size={24} style={{ color: 'var(--text-tertiary)', margin: '0 auto 8px' }} />
                    {file ? (
                      <p style={{ fontSize: '13px', color: 'var(--text-primary)', margin: 0, fontWeight: 500 }}>
                        {file.name} <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>({(file.size / 1024).toFixed(1)} Ko)</span>
                      </p>
                    ) : (
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                        Glissez le fichier annoté ici, ou cliquez pour parcourir
                      </p>
                    )}
                  </div>

                  {/* Optional note */}
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Note (optionnelle)
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Décrivez vos annotations..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'var(--bg-raised)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-body)',
                      fontSize: '13px',
                      resize: 'vertical',
                      outline: 'none',
                      marginBottom: '16px',
                    }}
                  />

                  {error && (
                    <div style={{ padding: '10px 14px', marginBottom: '16px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius-md)', color: '#EF4444', fontSize: '13px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span>{error}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={handleClose}
                      disabled={uploading}
                      style={{
                        padding: '10px 18px',
                        background: 'transparent',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--text-secondary)',
                        fontFamily: 'var(--font-body)',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: uploading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={!file || uploading}
                      style={{
                        padding: '10px 18px',
                        background: !file || uploading ? 'var(--bg-raised)' : 'var(--accent)',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        color: !file || uploading ? 'var(--text-tertiary)' : '#fff',
                        fontFamily: 'var(--font-body)',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: !file || uploading ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '7px',
                      }}
                    >
                      {uploading ? 'Analyse en cours...' : 'Soumettre l\'annotation'}
                    </button>
                  </div>

                  {documentTitle && (
                    <p style={{ marginTop: '14px', fontSize: '11px', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                      Document : {documentTitle}
                    </p>
                  )}
                </>
              )}

              {/* Success state */}
              {result && (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(0, 168, 142, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', margin: '0 auto 14px' }}>
                    <CheckCircle2 size={28} />
                  </div>
                  <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
                    Annotation enregistrée
                  </h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 12px' }}>
                    {result.addedChars > 0 && `+${result.addedChars} caractères ajoutés`}
                    {result.addedChars > 0 && result.removedChars > 0 && ', '}
                    {result.removedChars > 0 && `${result.removedChars} retirés`}
                  </p>
                  <pre style={{ textAlign: 'left', padding: '12px', background: 'var(--bg-raised)', borderRadius: 'var(--radius-md)', fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-secondary)', maxHeight: '200px', overflow: 'auto', whiteSpace: 'pre-wrap', margin: 0 }}>
                    {result.summary}
                  </pre>
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
