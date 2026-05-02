'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Archive,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  FileText,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatBytes } from '@/lib/utils'

interface FolderOption {
  id: string
  name: string
  parentId: string | null
}

interface ImportResult {
  foldersCreated: number
  documentsCreated: number
  errors: string[]
}

interface ImportZipModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentFolderId: string | null
  onSuccess: () => void
}

export function ImportZipModal({ open, onOpenChange, currentFolderId, onSuccess }: ImportZipModalProps) {
  const [zipFile, setZipFile] = useState<File | null>(null)
  const [parentFolderId, setParentFolderId] = useState<string>(currentFolderId || '')
  const [folders, setFolders] = useState<FolderOption[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  // Fetch all folders for the selector
  useEffect(() => {
    if (!open) return
    async function loadFolders() {
      try {
        const res = await fetch('/api/folders?all=true')
        if (res.ok) {
          const data = await res.json()
          setFolders(Array.isArray(data) ? data : [])
        }
      } catch {
        // ignore
      }
    }
    loadFolders()
  }, [open])

  const reset = useCallback(() => {
    setZipFile(null)
    setParentFolderId(currentFolderId || '')
    setIsImporting(false)
    setProgress(0)
    setResult(null)
    setErrorMessage('')
  }, [currentFolderId])

  const handleClose = useCallback(() => {
    if (isImporting) return
    if (result) {
      onSuccess()
    }
    reset()
    onOpenChange(false)
  }, [isImporting, result, onSuccess, reset, onOpenChange])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      setZipFile(file)
      setErrorMessage('')
      setResult(null)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/zip': ['.zip'],
      'application/x-zip-compressed': ['.zip'],
    },
    maxFiles: 1,
    multiple: false,
    disabled: isImporting,
  })

  const handleImport = async () => {
    if (!zipFile) return

    setIsImporting(true)
    setProgress(10)
    setErrorMessage('')
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', zipFile)
      if (parentFolderId) {
        formData.append('parentFolderId', parentFolderId)
      }

      setProgress(30)

      const res = await fetch('/api/documents/import-zip', {
        method: 'POST',
        body: formData,
      })

      setProgress(80)

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur lors de l\'import')
      }

      const data: ImportResult = await res.json()
      setProgress(100)
      setResult(data)
    } catch (err) {
      setErrorMessage((err as Error).message)
    } finally {
      setIsImporting(false)
    }
  }

  if (!open) return null

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 50,
            }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-xl)',
              padding: '28px',
              width: '100%',
              maxWidth: '520px',
              zIndex: 51,
              boxShadow: 'var(--shadow-lg)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--accent-dim)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent)',
                  }}
                >
                  <Archive size={20} />
                </div>
                <div>
                  <h2 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '16px',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    margin: 0,
                  }}>
                    Importer un ZIP
                  </h2>
                  <p style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    margin: 0,
                  }}>
                    Importez une arborescence de dossiers et documents
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={isImporting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-md)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-tertiary)',
                  cursor: isImporting ? 'not-allowed' : 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Result display */}
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  padding: '20px',
                  borderRadius: 'var(--radius-lg)',
                  background: result.errors.length === 0 ? 'rgba(0, 168, 142, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                  border: `1px solid ${result.errors.length === 0 ? 'rgba(0, 168, 142, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
                  marginBottom: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <CheckCircle2 size={20} style={{ color: 'var(--accent)' }} />
                  <span style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                  }}>
                    Import terminé
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '20px', marginBottom: result.errors.length > 0 ? '12px' : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FolderOpen size={16} style={{ color: 'var(--accent)' }} />
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-primary)' }}>
                      {result.foldersCreated} dossier{result.foldersCreated !== 1 ? 's' : ''} créé{result.foldersCreated !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={16} style={{ color: 'var(--accent)' }} />
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-primary)' }}>
                      {result.documentsCreated} document{result.documentsCreated !== 1 ? 's' : ''} importé{result.documentsCreated !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {result.errors.length > 0 && (
                  <div style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(239, 68, 68, 0.06)',
                    border: '1px solid rgba(239, 68, 68, 0.15)',
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginBottom: '6px',
                      color: 'var(--red)',
                      fontFamily: 'var(--font-body)',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}>
                      <AlertCircle size={14} />
                      {result.errors.length} erreur{result.errors.length !== 1 ? 's' : ''}
                    </div>
                    <div style={{ maxHeight: '100px', overflowY: 'auto' }}>
                      {result.errors.map((err, i) => (
                        <div key={i} style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: '11px',
                          color: 'var(--text-secondary)',
                          lineHeight: 1.5,
                        }}>
                          {err}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Dropzone (hidden after success) */}
            {!result && (
              <>
                <div
                  {...getRootProps()}
                  style={{
                    padding: zipFile ? '16px' : '32px 20px',
                    borderRadius: 'var(--radius-lg)',
                    border: `2px dashed ${isDragActive ? 'var(--accent)' : 'var(--border)'}`,
                    background: isDragActive ? 'var(--accent-dim)' : 'var(--bg-raised)',
                    cursor: isImporting ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'center',
                    marginBottom: '16px',
                  }}
                >
                  <input {...getInputProps()} />

                  {zipFile ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: 'var(--radius-md)',
                          background: 'var(--accent-dim)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--accent)',
                          flexShrink: 0,
                        }}
                      >
                        <Archive size={20} />
                      </div>
                      <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                        <div style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: '14px',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {zipFile.name}
                        </div>
                        <div style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                        }}>
                          {formatBytes(zipFile.size)}
                        </div>
                      </div>
                      {!isImporting && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setZipFile(null)
                          }}
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
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: 'var(--radius-lg)',
                          background: 'var(--accent-dim)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--accent)',
                          margin: '0 auto 12px',
                        }}
                      >
                        <Upload size={22} />
                      </div>
                      <p style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '14px',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        margin: '0 0 4px',
                      }}>
                        Glissez votre fichier ZIP ici
                      </p>
                      <p style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                        margin: 0,
                      }}>
                        ou cliquez pour parcourir (max 50 Mo)
                      </p>
                    </>
                  )}
                </div>

                {/* Parent folder selector */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    fontFamily: 'var(--font-body)',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: '6px',
                  }}>
                    Dossier de destination (optionnel)
                  </label>
                  <select
                    value={parentFolderId}
                    onChange={(e) => setParentFolderId(e.target.value)}
                    disabled={isImporting}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      fontSize: '13px',
                      fontFamily: 'var(--font-body)',
                      color: 'var(--text-primary)',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      outline: 'none',
                      cursor: isImporting ? 'not-allowed' : 'pointer',
                      appearance: 'auto',
                    }}
                  >
                    <option value="">Racine</option>
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>

                {/* Progress bar */}
                {isImporting && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{ marginBottom: '16px' }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginBottom: '8px',
                    }}>
                      <Loader2
                        size={16}
                        style={{
                          color: 'var(--accent)',
                          animation: 'spin 1s linear infinite',
                        }}
                      />
                      <span style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '13px',
                        color: 'var(--text-secondary)',
                      }}>
                        Import en cours...
                      </span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '4px',
                      borderRadius: '2px',
                      background: 'var(--border)',
                      overflow: 'hidden',
                    }}>
                      <motion.div
                        initial={{ width: '0%' }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                        style={{
                          height: '100%',
                          borderRadius: '2px',
                          background: 'var(--accent)',
                        }}
                      />
                    </div>
                    <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                  </motion.div>
                )}

                {/* Error message */}
                {errorMessage && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    color: 'var(--red)',
                    fontSize: '13px',
                    fontFamily: 'var(--font-body)',
                    marginBottom: '16px',
                  }}>
                    <AlertCircle size={15} />
                    {errorMessage}
                  </div>
                )}
              </>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              {result ? (
                <Button variant="primary" onClick={handleClose}>
                  Fermer
                </Button>
              ) : (
                <>
                  <Button variant="secondary" onClick={handleClose} disabled={isImporting}>
                    Annuler
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleImport}
                    disabled={!zipFile || isImporting}
                    loading={isImporting}
                    icon={!isImporting ? <Upload size={15} /> : undefined}
                  >
                    {isImporting ? 'Import en cours...' : 'Importer'}
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
