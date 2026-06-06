'use client'

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  ChevronRight,
  ArrowLeft,
  Trash2,
  AlertCircle,
  Search,
  LayoutGrid,
  List,
  FolderPlus,
  Home,
  Folder as FolderIcon,
  MoreVertical,
  Pencil,
  FolderOpen,
  Archive,
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { DocumentGrid } from '@/components/documents/DocumentGrid'
import { ImportZipModal } from '@/components/documents/ImportZipModal'
import { UploadModal } from '@/components/documents/UploadModal'
import { BulkUploadModal } from '@/components/documents/BulkUploadModal'
import type { DocumentWithRelations, Category } from '@/types'

type ViewMode = 'grid' | 'list'

interface FolderData {
  id: string
  name: string
  color: string | null
  parentId: string | null
  _count: { children: number; documents: number }
}

interface BreadcrumbItem {
  id: string
  name: string
}

const FOLDER_COLORS = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B',
  '#00A88E', '#EF4444', '#06B6D4', '#84CC16',
]

function getFolderColor(color: string | null, index: number): string {
  return color || FOLDER_COLORS[index % FOLDER_COLORS.length]
}

function DocumentsPageInner() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'
  const searchParams = useSearchParams()
  const folderParam = searchParams.get('folder')

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(folderParam)

  useEffect(() => {
    if (folderParam !== currentFolderId) {
      setCurrentFolderId(folderParam)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderParam])
  const [folders, setFolders] = useState<FolderData[]>([])
  const [documents, setDocuments] = useState<DocumentWithRelations[]>([])
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [searchQuery, setSearchQuery] = useState('')

  // Folder creation
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderColor, setNewFolderColor] = useState<string | null>(null)

  // Folder context menu
  const [contextFolder, setContextFolder] = useState<string | null>(null)
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  // Folder move
  const [movingFolder, setMovingFolder] = useState<string | null>(null)
  const [moveTargetFolderId, setMoveTargetFolderId] = useState<string>('')
  const [allFolders, setAllFolders] = useState<FolderData[]>([])
  const [moveError, setMoveError] = useState('')
  const [moveSaving, setMoveSaving] = useState(false)

  // ZIP import
  const [showZipImport, setShowZipImport] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deletingType, setDeletingType] = useState<'document' | 'folder'>('document')
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const fetchContent = useCallback(async () => {
    setIsLoading(true)

    const folderParam = currentFolderId ? `?parentId=${currentFolderId}` : ''
    const docParams = new URLSearchParams({
      folderId: currentFolderId || '',
      pageSize: '100',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    })
    if (searchQuery.trim()) docParams.set('search', searchQuery.trim())

    const [foldersRes, docsRes, breadcrumbRes] = await Promise.all([
      fetch(`/api/folders${folderParam}`),
      fetch(`/api/documents?${docParams}`),
      currentFolderId
        ? fetch(`/api/folders/${currentFolderId}`)
        : Promise.resolve(null),
    ])

    const foldersData = await foldersRes.json()
    const docsData = await docsRes.json()

    setFolders(foldersData)
    setDocuments(docsData.data || [])

    if (breadcrumbRes) {
      const bcData = await breadcrumbRes.json()
      setBreadcrumb(bcData.breadcrumb || [])
    } else {
      setBreadcrumb([])
    }

    setIsLoading(false)
  }, [currentFolderId, searchQuery])

  // Fetch categories once for the upload modal
  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  const fetchAllFolders = useCallback(async () => {
    const res = await fetch('/api/folders?all=true')
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) setAllFolders(data)
    }
  }, [])

  useEffect(() => {
    fetchAllFolders()
  }, [fetchAllFolders, folders.length])

  const handleMoveFolder = async () => {
    if (!movingFolder) return
    setMoveSaving(true)
    setMoveError('')
    try {
      const res = await fetch(`/api/folders/${movingFolder}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId: moveTargetFolderId || null }),
      })
      if (!res.ok) {
        const b = await res.json()
        throw new Error(b.error || 'Échec du déplacement')
      }
      setMovingFolder(null)
      fetchContent()
      fetchAllFolders()
    } catch (e) {
      setMoveError((e as Error).message)
    } finally {
      setMoveSaving(false)
    }
  }

  function folderPathOptions(): { id: string; path: string }[] {
    const byId = new Map(allFolders.map((f) => [f.id, f]))
    const pathOf = (id: string): string => {
      const f = byId.get(id)
      if (!f) return ''
      if (!f.parentId) return f.name
      return `${pathOf(f.parentId)} / ${f.name}`
    }
    return allFolders
      .map((f) => ({ id: f.id, path: pathOf(f.id) }))
      .sort((a, b) => a.path.localeCompare(b.path, 'fr'))
  }

  useEffect(() => {
    const timer = setTimeout(() => fetchContent(), 200)
    return () => clearTimeout(timer)
  }, [fetchContent])

  const navigateToFolder = (folderId: string | null) => {
    setCurrentFolderId(folderId)
    setSearchQuery('')
    setContextFolder(null)
    setRenamingFolder(null)
  }

  const goBack = () => {
    if (breadcrumb.length >= 2) {
      navigateToFolder(breadcrumb[breadcrumb.length - 2].id)
    } else {
      navigateToFolder(null)
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    await fetch('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newFolderName.trim(),
        color: newFolderColor,
        parentId: currentFolderId,
      }),
    })
    setNewFolderName('')
    setNewFolderColor(null)
    setShowNewFolder(false)
    fetchContent()
  }

  const handleRenameFolder = async (folderId: string) => {
    if (!renameValue.trim()) return
    await fetch(`/api/folders/${folderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: renameValue.trim() }),
    })
    setRenamingFolder(null)
    setRenameValue('')
    fetchContent()
  }

  const handleDeleteRequest = (id: string, type: 'document' | 'folder') => {
    setDeleteId(id)
    setDeletingType(type)
    setDeleteError('')
  }

  const handleDeleteConfirm = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    setDeleteError('')

    try {
      // Documents et dossiers → soft delete (mise à la corbeille).
      const res = deletingType === 'folder'
        ? await fetch(`/api/folders/${deleteId}/archive`, { method: 'PATCH' })
        : await fetch(`/api/documents/${deleteId}/archive`, { method: 'PATCH' })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Erreur lors de la suppression')
      }
      setDeleteId(null)
      fetchContent()
    } catch (err) {
      setDeleteError((err as Error).message)
    } finally {
      setIsDeleting(false)
    }
  }

  const totalItems = folders.length + documents.length

  return (
    <>
      <PageHeader
        title="Documents"
        description={
          !isLoading && totalItems > 0
            ? `${folders.length} dossier${folders.length !== 1 ? 's' : ''}, ${documents.length} document${documents.length !== 1 ? 's' : ''}`
            : undefined
        }
        action={
          isAdmin ? (
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                variant="secondary"
                icon={<Archive size={15} />}
                onClick={() => setShowZipImport(true)}
              >
                Importer ZIP
              </Button>
              <Button
                variant="secondary"
                icon={<FolderPlus size={15} />}
                onClick={() => setShowNewFolder(true)}
              >
                Nouveau dossier
              </Button>
              <Button
                variant="secondary"
                icon={<Upload size={15} />}
                onClick={() => setShowBulkUpload(true)}
              >
                Lot
              </Button>
              <Button
                variant="primary"
                icon={<Upload size={15} />}
                onClick={() => setShowUpload(true)}
              >
                Ajouter
              </Button>
            </div>
          ) : undefined
        }
      />

      <div style={{ padding: '0 24px 40px' }}>
        {/* Breadcrumb + back button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '12px 0 16px',
            fontSize: '14px',
            fontFamily: 'var(--font-body)',
            flexWrap: 'wrap',
          }}
        >
          {/* Back button - only when inside a folder */}
          {currentFolderId && (
            <motion.button
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={goBack}
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
                cursor: 'pointer',
                transition: 'all var(--transition)',
                flexShrink: 0,
                marginRight: '4px',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-dim)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-raised)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
              }}
            >
              <ArrowLeft size={16} />
            </motion.button>
          )}

          <button
            onClick={() => navigateToFolder(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm)',
              background: currentFolderId === null ? 'var(--accent-dim)' : 'transparent',
              border: 'none',
              color: currentFolderId === null ? 'var(--accent)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              fontWeight: 500,
              transition: 'all var(--transition)',
            }}
          >
            <Home size={14} />
            Racine
          </button>
          {breadcrumb.map((item) => (
            <React.Fragment key={item.id}>
              <ChevronRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <button
                onClick={() => navigateToFolder(item.id)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: item.id === currentFolderId ? 'var(--accent-dim)' : 'transparent',
                  border: 'none',
                  color: item.id === currentFolderId ? 'var(--accent)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  fontSize: '13px',
                  fontWeight: 500,
                  transition: 'all var(--transition)',
                }}
              >
                {item.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Search + view toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <span
              style={{
                position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-tertiary)', display: 'flex', pointerEvents: 'none', zIndex: 1,
              }}
            >
              <Search size={16} />
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher dans ce dossier..."
              className="input-base"
              style={{
                width: '100%', padding: '10px 16px 10px 38px', fontSize: '14px',
                fontFamily: 'var(--font-body)', color: 'var(--text-primary)',
                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', outline: 'none',
              }}
            />
          </div>
          <div
            style={{
              display: 'flex', gap: '2px', padding: '2px',
              background: 'var(--bg-raised)', borderRadius: 'var(--radius-md)', flexShrink: 0,
            }}
          >
            {(['grid', 'list'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                aria-label={mode === 'grid' ? 'Vue grille' : 'Vue liste'}
                style={{
                  padding: '6px 10px', borderRadius: 'var(--radius-sm)',
                  background: viewMode === mode ? 'var(--bg-surface)' : 'transparent',
                  border: viewMode === mode ? '1px solid var(--border)' : '1px solid transparent',
                  boxShadow: viewMode === mode ? 'var(--shadow-sm)' : 'none',
                  color: viewMode === mode ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  transition: 'all var(--transition)',
                }}
              >
                {mode === 'grid' ? <LayoutGrid size={16} /> : <List size={16} />}
              </button>
            ))}
          </div>
        </div>

        {/* New folder inline form */}
        <AnimatePresence>
          {showNewFolder && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden', marginBottom: '16px' }}
            >
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '16px', background: 'var(--bg-surface)',
                  border: '1px solid var(--accent)', borderRadius: 'var(--radius-lg)',
                }}
              >
                <FolderIcon size={20} style={{ color: newFolderColor || 'var(--accent)', flexShrink: 0 }} />
                <input
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') setShowNewFolder(false) }}
                  placeholder="Nom du dossier..."
                  className="input-base"
                  style={{
                    flex: 1, padding: '8px 12px', fontSize: '14px',
                    fontFamily: 'var(--font-body)',
                  }}
                />
                <div style={{ display: 'flex', gap: '4px' }}>
                  {FOLDER_COLORS.slice(0, 6).map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewFolderColor(c)}
                      style={{
                        width: '20px', height: '20px', borderRadius: '50%',
                        background: c, border: newFolderColor === c ? '2px solid var(--text-primary)' : '2px solid transparent',
                        cursor: 'pointer', transition: 'all var(--transition)',
                      }}
                    />
                  ))}
                </div>
                <Button variant="primary" size="sm" onClick={handleCreateFolder}>Créer</Button>
                <Button variant="secondary" size="sm" onClick={() => { setShowNewFolder(false); setNewFolderName('') }}>Annuler</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Folders grid */}
        {!isLoading && folders.length > 0 && (
          <>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
              Dossiers
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(220px, 1fr))' : '1fr',
                gap: viewMode === 'grid' ? '12px' : '2px',
                marginBottom: '28px',
              }}
            >
              {folders.map((folder, i) => {
                const color = getFolderColor(folder.color, i)
                const itemCount = folder._count.children + folder._count.documents

                return (
                  <motion.div
                    key={folder.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => {
                      if (renamingFolder !== folder.id) navigateToFolder(folder.id)
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: viewMode === 'grid' ? '16px' : '10px 16px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      transition: 'all var(--transition)',
                      position: 'relative',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = color
                      ;(e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 16px ${color}20`
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'
                      ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
                    }}
                  >
                    <div
                      style={{
                        width: viewMode === 'grid' ? '40px' : '32px',
                        height: viewMode === 'grid' ? '40px' : '32px',
                        borderRadius: 'var(--radius-md)',
                        background: `${color}18`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: color,
                        flexShrink: 0,
                      }}
                    >
                      <FolderOpen size={viewMode === 'grid' ? 22 : 18} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {renamingFolder === folder.id ? (
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            e.stopPropagation()
                            if (e.key === 'Enter') handleRenameFolder(folder.id)
                            if (e.key === 'Escape') setRenamingFolder(null)
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="input-base"
                          style={{ width: '100%', padding: '4px 8px', fontSize: '13px', fontFamily: 'var(--font-body)' }}
                        />
                      ) : (
                        <>
                          <div style={{
                            fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {folder.name}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                            {itemCount} élément{itemCount !== 1 ? 's' : ''}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Context menu button */}
                    {isAdmin && (
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setContextFolder(contextFolder === folder.id ? null : folder.id)
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: '28px', height: '28px', borderRadius: 'var(--radius-sm)',
                            background: 'transparent', border: 'none', color: 'var(--text-tertiary)',
                            cursor: 'pointer',
                          }}
                        >
                          <MoreVertical size={16} />
                        </button>

                        <AnimatePresence>
                          {contextFolder === folder.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                position: 'absolute', right: 0, top: '100%', marginTop: '4px',
                                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)',
                                padding: '4px', zIndex: 20, minWidth: '140px',
                              }}
                            >
                              <button
                                onClick={() => {
                                  setRenamingFolder(folder.id)
                                  setRenameValue(folder.name)
                                  setContextFolder(null)
                                }}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                                  padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                                  background: 'transparent', border: 'none', color: 'var(--text-primary)',
                                  fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font-body)',
                                }}
                              >
                                <Pencil size={14} /> Renommer
                              </button>
                              <button
                                onClick={() => {
                                  setMovingFolder(folder.id)
                                  setMoveTargetFolderId(folder.parentId || '')
                                  setMoveError('')
                                  setContextFolder(null)
                                }}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                                  padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                                  background: 'transparent', border: 'none', color: 'var(--text-primary)',
                                  fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font-body)',
                                }}
                              >
                                <FolderOpen size={14} /> Déplacer
                              </button>
                              <button
                                onClick={() => {
                                  handleDeleteRequest(folder.id, 'folder')
                                  setContextFolder(null)
                                }}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                                  padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                                  background: 'transparent', border: 'none', color: 'var(--red)',
                                  fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font-body)',
                                }}
                              >
                                <Trash2 size={14} /> Supprimer
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </>
        )}

        {/* Documents section */}
        {!isLoading && documents.length > 0 && (
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
            Documents
          </div>
        )}

        {/* Only render DocumentGrid when there are docs, when loading, or when
            actively searching. Otherwise hide it so we don't double up the
            empty state ("Aucun document trouvé" + "Dossier vide") */}
        {(isLoading || documents.length > 0 || searchQuery) && (
          <DocumentGrid
            documents={documents}
            isLoading={isLoading}
            onDelete={isAdmin ? (id: string) => handleDeleteRequest(id, 'document') : undefined}
            viewMode={viewMode}
          />
        )}

        {/* Empty state for empty folder */}
        {!isLoading && folders.length === 0 && documents.length === 0 && !searchQuery && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: '80px 24px', gap: '16px', textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '72px', height: '72px', borderRadius: 'var(--radius-xl)',
                background: 'var(--accent-dim)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', color: 'var(--accent)',
              }}
            >
              <FolderOpen size={32} />
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Dossier vide
            </h3>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-secondary)', margin: 0, maxWidth: '360px', lineHeight: 1.6 }}>
              {currentFolderId
                ? 'Ce dossier ne contient aucun élément. Ajoutez des sous-dossiers ou des documents.'
                : 'Aucun dossier ni document. Commencez par créer un dossier.'}
            </p>
            {isAdmin && (
              <Button variant="primary" icon={<FolderPlus size={15} />} onClick={() => setShowNewFolder(true)}>
                Créer un dossier
              </Button>
            )}
          </motion.div>
        )}
      </div>

      {/* Delete confirmation overlay */}
      <AnimatePresence>
        {deleteId && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !isDeleting && setDeleteId(null)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 50 }}
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
                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-xl)', padding: '28px',
                width: '100%', maxWidth: '420px', boxShadow: 'var(--shadow-lg)',
              }}
            >
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: 'var(--radius-md)',
                  background: 'var(--red-dim)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', color: 'var(--red)', flexShrink: 0,
                }}>
                  <Trash2 size={18} />
                </div>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>
                    {deletingType === 'folder' ? 'Supprimer le dossier' : 'Mettre dans la corbeille'}
                  </h3>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55 }}>
                    {deletingType === 'folder'
                      ? 'Le dossier et tout son contenu (sous-dossiers, documents) seront définitivement supprimés.'
                      : 'Le document sera déplacé dans la corbeille. Vous pourrez le restaurer ou le supprimer définitivement plus tard.'}
                  </p>
                </div>
              </div>

              {deleteError && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 14px', borderRadius: 'var(--radius-md)',
                  background: 'var(--red-dim)', border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: 'var(--red)', fontSize: '13px', marginBottom: '16px',
                }}>
                  <AlertCircle size={15} /> {deleteError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <Button variant="secondary" onClick={() => { setDeleteId(null); setDeleteError('') }} disabled={isDeleting}>
                  Annuler
                </Button>
                <Button variant="danger" onClick={handleDeleteConfirm} loading={isDeleting} icon={!isDeleting ? <Trash2 size={14} /> : undefined}>
                  {isDeleting
                    ? (deletingType === 'folder' ? 'Suppression...' : 'Déplacement...')
                    : (deletingType === 'folder' ? 'Supprimer' : 'Mettre à la corbeille')}
                </Button>
              </div>
            </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* ZIP Import modal */}
      <ImportZipModal
        open={showZipImport}
        onOpenChange={setShowZipImport}
        currentFolderId={currentFolderId}
        onSuccess={fetchContent}
      />

      {/* Move folder modal */}
      {movingFolder && (
        <>
          <div
            onClick={() => !moveSaving && setMovingFolder(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 50 }}
          />
          <div
            style={{
              position: 'fixed', inset: 0, zIndex: 51,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', pointerEvents: 'none',
            }}
          >
            <div
              style={{
                pointerEvents: 'auto',
                background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)',
                padding: '28px', width: '100%', maxWidth: '440px', boxShadow: 'var(--shadow-lg)',
              }}
            >
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 14px' }}>
                Déplacer le dossier
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                Choisissez le dossier de destination. Sélectionnez « Racine » pour le placer au plus haut niveau.
              </p>
              <select
                value={moveTargetFolderId}
                onChange={(e) => setMoveTargetFolderId(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '14px', color: 'var(--text-primary)' }}
              >
                <option value="">— Racine —</option>
                {folderPathOptions()
                  .filter((f) => f.id !== movingFolder)
                  .map((f) => (
                    <option key={f.id} value={f.id}>{f.path}</option>
                  ))}
              </select>
              {moveError && (
                <div style={{ marginTop: '10px', padding: '8px 12px', background: 'var(--red-dim)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius-md)', color: 'var(--red)', fontSize: '13px' }}>
                  {moveError}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <Button variant="secondary" onClick={() => setMovingFolder(null)} disabled={moveSaving}>Annuler</Button>
                <Button variant="primary" onClick={handleMoveFolder} loading={moveSaving}>Déplacer</Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Single file upload modal */}
      <UploadModal
        open={showUpload}
        onOpenChange={setShowUpload}
        categories={categories}
        onSuccess={fetchContent}
        folderId={currentFolderId}
      />

      {/* Bulk upload modal */}
      <BulkUploadModal
        open={showBulkUpload}
        onOpenChange={setShowBulkUpload}
        categories={categories}
        onSuccess={fetchContent}
        folderId={currentFolderId}
      />
    </>
  )
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={null}>
      <DocumentsPageInner />
    </Suspense>
  )
}
