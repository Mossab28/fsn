'use client'

import React, { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  Download,
  Clock,
  User,
  FileUp,
  GitBranch,
  ChevronRight,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Select } from '@/components/ui/Select'
import type { DocumentVersion, VersionType } from '@/types'

interface DocumentVersionPanelProps {
  documentId: string
  currentVersion: string
  versions: DocumentVersion[]
  canUpload: boolean
  onVersionUploaded?: () => void
}

function formatDateFr(dateStr: string | Date): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

export function DocumentVersionPanel({
  documentId,
  currentVersion,
  versions,
  canUpload,
  onVersionUploaded,
}: DocumentVersionPanelProps) {
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [changelog, setChangelog] = useState('')
  const [versionType, setVersionType] = useState<VersionType>('MINOR')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetForm = useCallback(() => {
    setFile(null)
    setChangelog('')
    setVersionType('MINOR')
    setError(null)
    setDragOver(false)
  }, [])

  const handleUpload = async () => {
    if (!file) {
      setError('Veuillez sélectionner un fichier')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', versionType)
      if (changelog.trim()) {
        formData.append('changelog', changelog.trim())
      }

      const res = await fetch(`/api/documents/${documentId}/versions`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Erreur lors du téléversement')
      }

      resetForm()
      setUploadOpen(false)
      onVersionUploaded?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) setFile(dropped)
  }

  const handleDownloadVersion = (version: DocumentVersion) => {
    window.open(
      `/api/documents/${documentId}/download?versionId=${version.id}`,
      '_blank'
    )
  }

  const sectionStyle: React.CSSProperties = {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
  }

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid var(--border)',
  }

  return (
    <div style={sectionStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <GitBranch size={16} style={{ color: 'var(--accent)' }} />
          <h3
            style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-display)',
            }}
          >
            Historique des versions
          </h3>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 700,
              background: 'var(--accent)',
              color: '#fff',
            }}
          >
            v{currentVersion}
          </span>
        </div>

        {canUpload && (
          <Button
            variant="primary"
            size="sm"
            icon={<Upload size={13} />}
            onClick={() => {
              resetForm()
              setUploadOpen(true)
            }}
          >
            Nouvelle version
          </Button>
        )}
      </div>

      {/* Version timeline */}
      <div style={{ padding: '12px 20px 16px' }}>
        {versions.length === 0 ? (
          <div
            style={{
              padding: '24px 0',
              textAlign: 'center',
              color: 'var(--text-tertiary)',
              fontSize: '13px',
              fontFamily: 'var(--font-body)',
            }}
          >
            Aucune version enregistrée
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {versions.map((v, i) => {
              const isFirst = i === 0
              const isMajor = v.type === 'MAJOR'

              return (
                <motion.div
                  key={v.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  style={{
                    display: 'flex',
                    gap: '14px',
                    position: 'relative',
                    paddingBottom: i < versions.length - 1 ? '16px' : 0,
                  }}
                >
                  {/* Timeline line */}
                  {i < versions.length - 1 && (
                    <div
                      style={{
                        position: 'absolute',
                        left: '9px',
                        top: '22px',
                        bottom: 0,
                        width: '2px',
                        background: 'var(--border)',
                      }}
                    />
                  )}

                  {/* Timeline dot */}
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: isFirst
                        ? 'var(--accent)'
                        : isMajor
                          ? 'rgba(245, 158, 11, 0.2)'
                          : 'var(--bg-raised)',
                      border: isFirst
                        ? 'none'
                        : `2px solid ${isMajor ? '#F59E0B' : 'var(--border)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      zIndex: 1,
                    }}
                  >
                    {isFirst && (
                      <ChevronRight size={10} style={{ color: '#fff' }} />
                    )}
                  </div>

                  {/* Version content */}
                  <div
                    style={{
                      flex: 1,
                      background: isFirst ? 'var(--bg-raised)' : 'transparent',
                      borderRadius: 'var(--radius-md)',
                      padding: isFirst ? '12px' : '2px 0',
                      border: isFirst ? '1px solid var(--border)' : 'none',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: '13px',
                            color: 'var(--text-primary)',
                            fontFamily: 'var(--font-body)',
                          }}
                        >
                          v{v.version}
                        </span>
                        <span
                          style={{
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 600,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            background: isMajor
                              ? 'rgba(245, 158, 11, 0.12)'
                              : 'rgba(59, 130, 246, 0.12)',
                            color: isMajor ? '#F59E0B' : '#3B82F6',
                          }}
                        >
                          {isMajor ? 'Majeure' : 'Mineure'}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-tertiary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {v.filename} ({formatBytes(v.fileSize)})
                        </span>
                      </div>

                      <motion.button
                        onClick={() => handleDownloadVersion(v)}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.94 }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '28px',
                          height: '28px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'transparent',
                          border: '1px solid var(--border)',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                        title="Télécharger cette version"
                      >
                        <Download size={12} />
                      </motion.button>
                    </div>

                    {v.changelog && (
                      <p
                        style={{
                          margin: '6px 0 0',
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                          lineHeight: 1.5,
                          fontFamily: 'var(--font-body)',
                        }}
                      >
                        {v.changelog}
                      </p>
                    )}

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginTop: '6px',
                        fontSize: '11px',
                        color: 'var(--text-tertiary)',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <User size={10} />
                        {v.uploader?.name || 'Inconnu'}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={10} />
                        {formatDateFr(v.createdAt)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <Dialog
        open={uploadOpen}
        onOpenChange={(o) => {
          setUploadOpen(o)
          if (!o) resetForm()
        }}
        title="Nouvelle version"
        description="Téléversez un nouveau fichier pour créer une version"
        maxWidth={500}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* File drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-md)',
              padding: '24px',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragOver ? 'var(--accent-dim, rgba(0,168,142,0.05))' : 'transparent',
              transition: 'all 0.2s',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) setFile(f)
              }}
              style={{ display: 'none' }}
            />
            {file ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <FileUp size={16} style={{ color: 'var(--accent)' }} />
                <span
                  style={{
                    fontSize: '13px',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {file.name}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  ({formatBytes(file.size)})
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setFile(null)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'var(--bg-raised)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-tertiary)',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  <X size={10} />
                </button>
              </div>
            ) : (
              <>
                <Upload
                  size={24}
                  style={{ color: 'var(--text-tertiary)', marginBottom: '8px' }}
                />
                <p
                  style={{
                    margin: 0,
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  Glissez un fichier ici ou cliquez pour parcourir
                </p>
              </>
            )}
          </div>

          {/* Version type */}
          <Select
            label="Type de version"
            value={versionType}
            onValueChange={(v) => setVersionType(v as VersionType)}
            options={[
              { value: 'MINOR', label: 'Mineure (correction, ajustement)' },
              { value: 'MAJOR', label: 'Majeure (refonte, restructuration)' },
            ]}
          />

          {/* Changelog */}
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
              Notes de version
            </label>
            <textarea
              value={changelog}
              onChange={(e) => setChangelog(e.target.value)}
              placeholder="Décrivez les changements apportés..."
              rows={3}
              style={{
                width: '100%',
                padding: '9px 12px',
                background: 'var(--bg-raised)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)',
                fontSize: '14px',
                lineHeight: 1.5,
                resize: 'vertical',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                (e.currentTarget as HTMLTextAreaElement).style.borderColor =
                  'var(--accent)'
              }}
              onBlur={(e) => {
                (e.currentTarget as HTMLTextAreaElement).style.borderColor =
                  'var(--border)'
              }}
            />
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  fontSize: '12px',
                  color: 'var(--red)',
                  fontFamily: 'var(--font-body)',
                  padding: '8px 12px',
                  background: 'var(--red-dim)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                }}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                setUploadOpen(false)
                resetForm()
              }}
              disabled={uploading}
            >
              Annuler
            </Button>
            <Button
              variant="primary"
              size="md"
              icon={<Upload size={14} />}
              onClick={handleUpload}
              loading={uploading}
              disabled={!file}
            >
              Téléverser
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
