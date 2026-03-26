'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  ChevronLeft,
  ChevronRight,
  Trash2,
  AlertCircle,
  Search,
  LayoutGrid,
  List,
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { DocumentGrid } from '@/components/documents/DocumentGrid'
import { FilterPanel } from '@/components/documents/FilterPanel'
import type { DocumentWithRelations, Category, PaginatedResponse } from '@/types'

const PAGE_SIZE = 12

type ViewMode = 'grid' | 'list'

export default function DocumentsPage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'

  const [documents, setDocuments] = useState<DocumentWithRelations[]>([])
  const [categories, setCategories] = useState<(Category & { documentCount?: number })[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  // Filters state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')

  // Delete confirm state
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const fetchAbortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load categories once
  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((data: (Category & { documentCount?: number })[]) => setCategories(data))
      .catch(console.error)
  }, [])

  const fetchDocuments = useCallback(async () => {
    if (fetchAbortRef.current) fetchAbortRef.current.abort()
    const controller = new AbortController()
    fetchAbortRef.current = controller

    setIsLoading(true)

    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
      sortBy,
      sortOrder,
    })
    if (searchQuery.trim()) params.set('search', searchQuery.trim())
    // For categories, we use the first selected one (API supports single categoryId)
    if (selectedCategories.length === 1) {
      params.set('categoryId', selectedCategories[0])
    }
    // For mime type, use the first selected one
    if (selectedTypes.length === 1) {
      params.set('mimeType', selectedTypes[0])
    }

    try {
      const res = await fetch(`/api/documents?${params}`, { signal: controller.signal })
      if (!res.ok) throw new Error('Failed to fetch documents')
      const data: PaginatedResponse<DocumentWithRelations> = await res.json()

      // Client-side filtering for multiple categories/types
      let filtered = data.data
      if (selectedCategories.length > 1) {
        filtered = filtered.filter((d) => d.categoryId && selectedCategories.includes(d.categoryId))
      }
      if (selectedTypes.length > 1) {
        filtered = filtered.filter((d) =>
          selectedTypes.some((t) => d.mimeType.startsWith(t) || d.mimeType === t)
        )
      } else if (selectedTypes.length === 1 && selectedTypes[0] === 'image/') {
        filtered = filtered.filter((d) => d.mimeType.startsWith('image/'))
      }

      setDocuments(filtered)
      setTotal(data.total)
      setTotalPages(data.totalPages)
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Failed to fetch documents:', err)
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false)
      }
    }
  }, [page, searchQuery, selectedCategories, selectedTypes, sortBy, sortOrder])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchDocuments()
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [fetchDocuments])

  const handleCategoryChange = useCallback((ids: string[]) => {
    setSelectedCategories(ids)
    setPage(1)
  }, [])

  const handleTypeChange = useCallback((types: string[]) => {
    setSelectedTypes(types)
    setPage(1)
  }, [])

  const handleSortChange = useCallback((newSortBy: string, newSortOrder: string) => {
    setSortBy(newSortBy)
    setSortOrder(newSortOrder)
    setPage(1)
  }, [])

  const handleReset = useCallback(() => {
    setSelectedCategories([])
    setSelectedTypes([])
    setSortBy('createdAt')
    setSortOrder('desc')
    setSearchQuery('')
    setPage(1)
  }, [])

  const handleDeleteRequest = useCallback((id: string) => {
    setDeleteId(id)
    setDeleteError('')
  }, [])

  const handleDeleteConfirm = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    setDeleteError('')

    try {
      const res = await fetch(`/api/documents/${deleteId}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Erreur lors de la suppression')
      }
      setDeleteId(null)
      fetchDocuments()
    } catch (err) {
      setDeleteError((err as Error).message)
    } finally {
      setIsDeleting(false)
    }
  }

  const documentCounts: Record<string, number> = {}
  categories.forEach((cat) => {
    if (cat.documentCount !== undefined) {
      documentCounts[cat.id] = cat.documentCount
    }
  })

  const pageStart = (page - 1) * PAGE_SIZE + 1
  const pageEnd = Math.min(page * PAGE_SIZE, total)

  return (
    <>
      <PageHeader
        title="Documents"
        description={
          !isLoading && total > 0
            ? `${total} document${total > 1 ? 's' : ''} disponible${total > 1 ? 's' : ''}`
            : undefined
        }
        action={
          isAdmin ? (
            <Button
              variant="primary"
              icon={<Upload size={15} />}
              onClick={() => alert('Fonctionnalité bientôt disponible — les documents seront ajoutés manuellement.')}
            >
              Ajouter un document
            </Button>
          ) : undefined
        }
      />

      {/* Main layout: content + filter panel */}
      <div
        style={{
          display: 'flex',
          gap: '0',
          minHeight: '600px',
        }}
      >
        {/* Left: search + grid */}
        <div style={{ flex: 1, minWidth: 0, padding: '20px 24px 40px' }}>
          {/* Search bar + view toggle row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px',
            }}
          >
            {/* Search input */}
            <div style={{ position: 'relative', flex: 1 }}>
              <span
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-tertiary)',
                  display: 'flex',
                  alignItems: 'center',
                  pointerEvents: 'none',
                  zIndex: 1,
                }}
              >
                <Search size={16} />
              </span>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setPage(1)
                }}
                placeholder="Rechercher un document..."
                className="input-base"
                style={{
                  width: '100%',
                  padding: '10px 16px 10px 38px',
                  fontSize: '14px',
                  fontFamily: 'var(--font-body)',
                  color: 'var(--text-primary)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  outline: 'none',
                }}
              />
            </div>

            {/* Results count */}
            {!isLoading && total > 0 && (
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {total} résultat{total > 1 ? 's' : ''}
              </span>
            )}

            {/* View toggle */}
            <div
              style={{
                display: 'flex',
                gap: '2px',
                padding: '2px',
                background: 'var(--bg-raised)',
                borderRadius: 'var(--radius-md)',
                flexShrink: 0,
              }}
            >
              <button
                onClick={() => setViewMode('grid')}
                aria-label="Vue grille"
                style={{
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: viewMode === 'grid' ? 'var(--bg-surface)' : 'transparent',
                  border: viewMode === 'grid' ? '1px solid var(--border)' : '1px solid transparent',
                  boxShadow: viewMode === 'grid' ? 'var(--shadow-sm)' : 'none',
                  color: viewMode === 'grid' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all var(--transition)',
                }}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                aria-label="Vue liste"
                style={{
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: viewMode === 'list' ? 'var(--bg-surface)' : 'transparent',
                  border: viewMode === 'list' ? '1px solid var(--border)' : '1px solid transparent',
                  boxShadow: viewMode === 'list' ? 'var(--shadow-sm)' : 'none',
                  color: viewMode === 'list' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all var(--transition)',
                }}
              >
                <List size={16} />
              </button>
            </div>
          </div>

          {/* Document grid/list */}
          <motion.div
            style={{ minHeight: '400px' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <DocumentGrid
              documents={documents}
              isLoading={isLoading}
              onDelete={isAdmin ? handleDeleteRequest : undefined}
              viewMode={viewMode}
            />
          </motion.div>

          {/* Pagination */}
          <AnimatePresence>
            {!isLoading && totalPages > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '20px 0 0',
                  borderTop: '1px solid var(--border)',
                  marginTop: '24px',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {pageStart}–{pageEnd} sur {total} résultats
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<ChevronLeft size={15} />}
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Précédent
                  </Button>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
                      let pageNum: number
                      if (totalPages <= 7) {
                        pageNum = i + 1
                      } else if (page <= 4) {
                        pageNum = i + 1
                      } else if (page >= totalPages - 3) {
                        pageNum = totalPages - 6 + i
                      } else {
                        pageNum = page - 3 + i
                      }

                      const isActive = pageNum === page
                      return (
                        <motion.button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: 'var(--radius-sm)',
                            background: isActive ? 'var(--accent-dim)' : 'transparent',
                            border: isActive ? '1px solid rgba(0, 201, 167, 0.25)' : '1px solid transparent',
                            color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                            fontFamily: 'var(--font-body)',
                            fontSize: '13px',
                            fontWeight: isActive ? 600 : 400,
                            cursor: 'pointer',
                            transition: 'all var(--transition)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {pageNum}
                        </motion.button>
                      )
                    })}
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Suivant <ChevronRight size={15} /></span>
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Filter panel */}
        <FilterPanel
          categories={categories}
          selectedCategories={selectedCategories}
          selectedTypes={selectedTypes}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onCategoryChange={handleCategoryChange}
          onTypeChange={handleTypeChange}
          onSortChange={handleSortChange}
          onReset={handleReset}
          documentCounts={documentCounts}
        />
      </div>

      {/* Delete confirmation overlay */}
      <AnimatePresence>
        {deleteId && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeleting && setDeleteId(null)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(4px)',
                zIndex: 50,
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'fixed',
                top: '50%',
                left: 'calc(50% + 120px)',
                transform: 'translate(-50%, -50%)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-xl)',
                padding: '28px',
                width: '100%',
                maxWidth: '420px',
                zIndex: 51,
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
                    Supprimer le document
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
                    Cette action est irréversible. Le document et son fichier seront définitivement supprimés.
                  </p>
                </div>
              </div>

              {deleteError && (
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
                  <AlertCircle size={15} />
                  {deleteError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <Button
                  variant="secondary"
                  onClick={() => { setDeleteId(null); setDeleteError('') }}
                  disabled={isDeleting}
                >
                  Annuler
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDeleteConfirm}
                  loading={isDeleting}
                  icon={!isDeleting ? <Trash2 size={14} /> : undefined}
                >
                  {isDeleting ? 'Suppression...' : 'Supprimer définitivement'}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
