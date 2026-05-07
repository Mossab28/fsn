'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  X,
  FolderOpen,
  FileText,
  BookOpen,
  GraduationCap,
  Cpu,
  BarChart2,
  Scale,
  Sparkles,
  LayoutGrid,
  List,
  ArrowLeft,
  SlidersHorizontal,
  ChevronDown,
  RotateCcw,
  Calendar,
  User,
  Archive,
} from 'lucide-react'
import { DocumentGrid } from '@/components/documents/DocumentGrid'
import { FilterPanel } from '@/components/documents/FilterPanel'
import { Badge } from '@/components/ui/Badge'
import type { DocumentWithRelations, Category, PaginatedResponse, DocumentStatus } from '@/types'
import { DOCUMENT_STATUS_LABELS, DOCUMENT_STATUS_COLORS } from '@/types'

const ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  FileText,
  BookOpen,
  GraduationCap,
  Cpu,
  BarChart2,
  Scale,
  FolderOpen,
}

const FILE_TYPE_LABELS: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
  'image/': 'Images',
}

type ViewMode = 'grid' | 'list'

interface Folder {
  id: string
  name: string
  color: string | null
  parentId: string | null
}

interface AISearchResult {
  documents: DocumentWithRelations[]
  filters: {
    categoryIds: string[]
    mimeTypes: string[]
    dateFrom: string | null
    dateTo: string | null
  }
  explanation: string
  total: number
}

const ALL_STATUSES: DocumentStatus[] = ['BROUILLON', 'ENRICHISSEMENT', 'RELECTURE', 'DIFFUSION', 'ARCHIVE']

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<DocumentWithRelations[]>([])
  const [categories, setCategories] = useState<(Category & { documentCount?: number })[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  // Filter state
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')

  // Advanced filter state
  const [selectedStatuses, setSelectedStatuses] = useState<DocumentStatus[]>([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [selectedFolderId, setSelectedFolderId] = useState('')
  const [includeArchived, setIncludeArchived] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [folders, setFolders] = useState<Folder[]>([])

  // AI search state
  const [isAISearching, setIsAISearching] = useState(false)
  const [aiResults, setAiResults] = useState<AISearchResult | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((data: (Category & { documentCount?: number })[]) => setCategories(data))
      .catch(console.error)

    fetch('/api/folders')
      .then((r) => r.json())
      .then((data: Folder[]) => setFolders(Array.isArray(data) ? data : []))
      .catch(console.error)

    inputRef.current?.focus()
  }, [])

  const performSearch = useCallback(
    async (q: string) => {
      if (abortRef.current) abortRef.current.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setIsLoading(true)
      setHasSearched(true)

      const params = new URLSearchParams()
      if (q.trim()) params.set('q', q.trim())
      if (selectedCategories.length === 1) params.set('categoryId', selectedCategories[0])
      if (selectedTypes.length === 1) params.set('mimeType', selectedTypes[0])
      if (selectedStatuses.length > 0) params.set('status', selectedStatuses.join(','))
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      if (authorName.trim()) params.set('authorName', authorName.trim())
      if (selectedFolderId) params.set('folderId', selectedFolderId)
      if (includeArchived) params.set('includeArchived', 'true')
      params.set('pageSize', '24')

      try {
        const res = await fetch(`/api/search?${params}`, { signal: controller.signal })
        if (!res.ok) throw new Error('Search failed')
        const data: PaginatedResponse<DocumentWithRelations> = await res.json()

        let filtered = data.data

        // Client-side filtering for multiple categories/types
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

        setResults(filtered)
        setTotal(filtered.length)
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Search error:', err)
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    },
    [selectedCategories, selectedTypes, selectedStatuses, dateFrom, dateTo, authorName, selectedFolderId, includeArchived]
  )

  // Debounced search on query / filter changes
  useEffect(() => {
    if (!hasSearched && !query.trim()) return

    // Don't trigger classic search while showing AI results
    if (aiResults) return

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      performSearch(query)
    }, 400)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, selectedCategories, selectedTypes, selectedStatuses, dateFrom, dateTo, authorName, selectedFolderId, includeArchived, hasSearched, performSearch, aiResults])

  const handleAISearch = useCallback(async () => {
    if (!query.trim() || isAISearching) return

    setIsAISearching(true)
    setAiError(null)
    setAiResults(null)

    try {
      const res = await fetch('/api/search/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Erreur inconnue' }))
        throw new Error(errorData.error ?? `Erreur ${res.status}`)
      }

      const data: AISearchResult = await res.json()
      setAiResults(data)
      setHasSearched(true)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors de la recherche IA'
      setAiError(message)
      setTimeout(() => setAiError(null), 5000)
    } finally {
      setIsAISearching(false)
    }
  }, [query, isAISearching])

  const dismissAIResults = () => {
    setAiResults(null)
    if (query.trim()) {
      performSearch(query)
    }
  }

  const clearSearch = () => {
    setQuery('')
    setHasSearched(false)
    setResults([])
    setTotal(0)
    setAiResults(null)
    setAiError(null)
    inputRef.current?.focus()
  }

  const handleCategoryChange = useCallback((ids: string[]) => {
    setSelectedCategories(ids)
  }, [])

  const handleTypeChange = useCallback((types: string[]) => {
    setSelectedTypes(types)
  }, [])

  const handleSortChange = useCallback((newSortBy: string, newSortOrder: string) => {
    setSortBy(newSortBy)
    setSortOrder(newSortOrder)
  }, [])

  const handleReset = useCallback(() => {
    setSelectedCategories([])
    setSelectedTypes([])
    setSelectedStatuses([])
    setDateFrom('')
    setDateTo('')
    setAuthorName('')
    setSelectedFolderId('')
    setIncludeArchived(false)
    setSortBy('createdAt')
    setSortOrder('desc')
  }, [])

  const handleStatusChange = useCallback((statuses: DocumentStatus[]) => {
    setSelectedStatuses(statuses)
  }, [])

  const advancedFilterCount =
    selectedStatuses.length +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0) +
    (authorName.trim() ? 1 : 0) +
    (selectedFolderId ? 1 : 0) +
    (includeArchived ? 1 : 0)

  const resetAdvancedFilters = useCallback(() => {
    setSelectedStatuses([])
    setDateFrom('')
    setDateTo('')
    setAuthorName('')
    setSelectedFolderId('')
    setIncludeArchived(false)
  }, [])

  const handleSearchSubmit = () => {
    if (query.trim() || selectedCategories.length > 0 || selectedTypes.length > 0) {
      performSearch(query)
    }
  }

  const documentCounts: Record<string, number> = {}
  categories.forEach((cat) => {
    if (cat.documentCount !== undefined) {
      documentCounts[cat.id] = cat.documentCount
    }
  })

  const showingAI = aiResults !== null

  return (
    <div className="search-page" style={{ padding: '0 0 60px' }}>
      {/* Remove browser default search input styling */}
      <style>{`
        input[type="search"]::-webkit-search-decoration,
        input[type="search"]::-webkit-search-cancel-button,
        input[type="search"]::-webkit-search-results-button,
        input[type="search"]::-webkit-search-results-decoration {
          -webkit-appearance: none;
        }
        input[type="search"] {
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
        }
        /* Remove default focus outlines on search page buttons (custom focus styles used instead) */
        .search-page button:focus-visible,
        .search-page select:focus-visible {
          outline: none;
        }
      `}</style>
      {/* Hero search section */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{
          paddingTop: '40px',
          paddingBottom: '32px',
          textAlign: 'left',
          maxWidth: '100%',
          paddingLeft: '32px',
          paddingRight: '32px',
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '36px',
            fontWeight: 800,
            color: 'var(--text-primary)',
            margin: '0 0 8px',
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
          }}
        >
          Recherche documentaire
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '15px',
            color: 'var(--text-secondary)',
            margin: '0 0 32px',
          }}
        >
          Trouvez rapidement n&apos;importe quel document dans la base
        </p>

        {/* Search bar + buttons */}
        <div
          style={{
            position: 'relative',
            maxWidth: '780px',
          }}
        >
          <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'var(--bg-surface)',
                border: `1px solid ${query ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: '16px',
                overflow: 'hidden',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                flex: 1,
                boxShadow: query
                  ? '0 0 0 3px var(--accent-dim), 0 8px 32px rgba(0,0,0,0.08)'
                  : '0 4px 24px rgba(0,0,0,0.06)',
              }}
            >
              <span
                style={{
                  paddingLeft: '20px',
                  paddingRight: '4px',
                  color: query ? 'var(--accent)' : 'var(--text-tertiary)',
                  display: 'flex',
                  alignItems: 'center',
                  flexShrink: 0,
                  transition: 'color var(--transition)',
                }}
              >
                <Search size={20} />
              </span>
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearchSubmit()
                }}
                placeholder="Rechercher par titre, auteur, cat&#233;gorie, tag..."
                style={{
                  flex: 1,
                  padding: '18px 16px',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontFamily: 'var(--font-body)',
                  fontSize: '16px',
                  color: 'var(--text-primary)',
                  minWidth: 0,
                }}
              />
              <AnimatePresence>
                {query && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={clearSearch}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '36px',
                      height: '36px',
                      marginRight: '10px',
                      borderRadius: '50%',
                      background: 'var(--bg-raised)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'all var(--transition)',
                    }}
                    aria-label="Effacer la recherche"
                  >
                    <X size={14} />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Search button */}
            <motion.button
              onClick={handleSearchSubmit}
              whileHover={{ scale: 1.02, filter: 'brightness(1.08)' }}
              whileTap={{ scale: 0.97 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0 24px',
                background: 'var(--accent)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '16px',
                fontFamily: 'var(--font-body)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'all var(--transition)',
              }}
            >
              <Search size={16} />
              Rechercher
            </motion.button>
          </div>

          {/* AI Search button */}
          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-start' }}>
            <motion.button
              onClick={handleAISearch}
              disabled={!query.trim() || isAISearching}
              whileHover={query.trim() && !isAISearching ? { scale: 1.04 } : {}}
              whileTap={query.trim() && !isAISearching ? { scale: 0.97 } : {}}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '8px 18px',
                borderRadius: '9999px',
                background: query.trim() && !isAISearching
                  ? 'linear-gradient(135deg, rgba(0, 201, 167, 0.12), rgba(0, 184, 153, 0.06))'
                  : 'var(--accent-dim)',
                border: '1px solid rgba(0, 168, 142, 0.2)',
                color: 'var(--accent)',
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: query.trim() && !isAISearching ? 'pointer' : 'not-allowed',
                transition: 'all var(--transition)',
                boxShadow: query.trim() && !isAISearching
                  ? '0 0 20px rgba(0, 201, 167, 0.15)'
                  : 'none',
                opacity: !query.trim() ? 0.5 : 1,
              }}
            >
              <motion.span
                animate={isAISearching ? { rotate: 360 } : { rotate: 0 }}
                transition={isAISearching ? { repeat: Infinity, duration: 1.5, ease: 'linear' } : { duration: 0 }}
                style={{ display: 'flex', alignItems: 'center' }}
              >
                <Sparkles size={14} />
              </motion.span>
              {isAISearching ? 'Recherche en cours...' : 'Recherche IA'}
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Advanced Filters Panel */}
      <div style={{ maxWidth: '780px', padding: '0 32px' }}>
        <button
          onClick={() => setAdvancedOpen(!advancedOpen)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: advancedFilterCount > 0 ? 'var(--accent-dim)' : 'var(--bg-surface)',
            border: `1px solid ${advancedFilterCount > 0 ? 'rgba(0, 168, 142, 0.3)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-md)',
            color: advancedFilterCount > 0 ? 'var(--accent)' : 'var(--text-secondary)',
            fontFamily: 'var(--font-body)',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all var(--transition)',
            marginBottom: advancedOpen ? '0' : '20px',
          }}
        >
          <SlidersHorizontal size={14} />
          Filtres avanc&#233;s
          {advancedFilterCount > 0 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '18px',
                height: '18px',
                borderRadius: '9999px',
                background: 'var(--accent)',
                color: '#FFFFFF',
                fontSize: '10px',
                fontWeight: 700,
                padding: '0 5px',
              }}
            >
              {advancedFilterCount}
            </span>
          )}
          <motion.span
            animate={{ rotate: advancedOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            style={{ display: 'flex', alignItems: 'center' }}
          >
            <ChevronDown size={14} />
          </motion.span>
        </button>

        <AnimatePresence initial={false}>
          {advancedOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{ overflow: 'hidden' }}
            >
              <div
                style={{
                  marginTop: '12px',
                  marginBottom: '20px',
                  padding: '20px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                {/* Status multi-select */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontFamily: 'var(--font-body)',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      marginBottom: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Statut
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {ALL_STATUSES.map((s) => {
                      const isActive = selectedStatuses.includes(s)
                      return (
                        <button
                          key={s}
                          onClick={() => {
                            if (isActive) {
                              setSelectedStatuses(selectedStatuses.filter((st) => st !== s))
                            } else {
                              setSelectedStatuses([...selectedStatuses, s])
                            }
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            borderRadius: '9999px',
                            background: isActive ? `${DOCUMENT_STATUS_COLORS[s]}18` : 'var(--bg-raised)',
                            border: `1px solid ${isActive ? DOCUMENT_STATUS_COLORS[s] : 'var(--border)'}`,
                            color: isActive ? DOCUMENT_STATUS_COLORS[s] : 'var(--text-secondary)',
                            fontFamily: 'var(--font-body)',
                            fontSize: '12px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all var(--transition)',
                          }}
                        >
                          <span
                            style={{
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              background: DOCUMENT_STATUS_COLORS[s],
                              flexShrink: 0,
                            }}
                          />
                          {DOCUMENT_STATUS_LABELS[s]}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Date range + Author row */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {/* Date from */}
                  <div style={{ flex: '1 1 140px', minWidth: '140px' }}>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontFamily: 'var(--font-body)',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--text-secondary)',
                        marginBottom: '6px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      <Calendar size={12} />
                      Date d&#233;but
                    </label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: 'var(--bg-raised)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        fontFamily: 'var(--font-body)',
                        fontSize: '13px',
                        color: 'var(--text-primary)',
                        outline: 'none',
                      }}
                    />
                  </div>

                  {/* Date to */}
                  <div style={{ flex: '1 1 140px', minWidth: '140px' }}>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontFamily: 'var(--font-body)',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--text-secondary)',
                        marginBottom: '6px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      <Calendar size={12} />
                      Date fin
                    </label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: 'var(--bg-raised)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        fontFamily: 'var(--font-body)',
                        fontSize: '13px',
                        color: 'var(--text-primary)',
                        outline: 'none',
                      }}
                    />
                  </div>

                  {/* Author name */}
                  <div style={{ flex: '1 1 180px', minWidth: '180px' }}>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontFamily: 'var(--font-body)',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--text-secondary)',
                        marginBottom: '6px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      <User size={12} />
                      Auteur
                    </label>
                    <input
                      type="text"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      placeholder="Nom de l'auteur..."
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: 'var(--bg-raised)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        fontFamily: 'var(--font-body)',
                        fontSize: '13px',
                        color: 'var(--text-primary)',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                {/* Folder + Archived row */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  {/* Folder selector */}
                  <div style={{ flex: '1 1 200px', minWidth: '200px' }}>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontFamily: 'var(--font-body)',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--text-secondary)',
                        marginBottom: '6px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      <FolderOpen size={12} />
                      Dossier
                    </label>
                    <select
                      value={selectedFolderId}
                      onChange={(e) => setSelectedFolderId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: 'var(--bg-raised)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        fontFamily: 'var(--font-body)',
                        fontSize: '13px',
                        color: selectedFolderId ? 'var(--text-primary)' : 'var(--text-tertiary)',
                        outline: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="">Tous les dossiers</option>
                      {folders.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Include archived toggle */}
                  <div style={{ flex: '0 0 auto' }}>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 14px',
                        background: includeArchived ? 'rgba(107, 114, 128, 0.1)' : 'var(--bg-raised)',
                        border: `1px solid ${includeArchived ? '#6B7280' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        transition: 'all var(--transition)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={includeArchived}
                        onChange={(e) => setIncludeArchived(e.target.checked)}
                        style={{ display: 'none' }}
                      />
                      <Archive
                        size={14}
                        style={{ color: includeArchived ? '#6B7280' : 'var(--text-tertiary)' }}
                      />
                      <span
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: '12px',
                          fontWeight: 500,
                          color: includeArchived ? 'var(--text-primary)' : 'var(--text-secondary)',
                        }}
                      >
                        Inclure les archiv&#233;s
                      </span>
                    </label>
                  </div>
                </div>

                {/* Reset advanced filters */}
                {advancedFilterCount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={resetAdvancedFilters}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        background: 'transparent',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--text-secondary)',
                        fontFamily: 'var(--font-body)',
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all var(--transition)',
                      }}
                    >
                      <RotateCcw size={12} />
                      R&#233;initialiser les filtres
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* AI Error toast */}
      <AnimatePresence>
        {aiError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            style={{
              maxWidth: '780px',
              margin: '0 0 20px',
              padding: '14px 20px',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '14px',
                color: '#EF4444',
              }}
            >
              {aiError}
            </span>
            <button
              onClick={() => setAiError(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'transparent',
                border: 'none',
                color: '#EF4444',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI search loading state */}
      <AnimatePresence>
        {isAISearching && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              maxWidth: '780px',
              margin: '0 0 24px',
              padding: '40px 24px',
              background: 'linear-gradient(135deg, rgba(0, 201, 167, 0.04), rgba(0, 184, 153, 0.02))',
              border: '1px solid rgba(0, 201, 167, 0.15)',
              borderRadius: 'var(--radius-lg)',
              textAlign: 'center',
            }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'rgba(0, 201, 167, 0.1)',
                color: 'var(--accent)',
                marginBottom: '16px',
              }}
            >
              <Sparkles size={22} />
            </motion.div>
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '16px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                margin: '0 0 6px',
              }}
            >
              Analyse IA en cours...
            </p>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                color: 'var(--text-tertiary)',
                margin: 0,
              }}
            >
              L&apos;IA analyse votre requ&#234;te et parcourt les documents
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results area */}
      <AnimatePresence mode="wait">
        {showingAI && aiResults ? (
          /* AI results view */
          <motion.div
            key="ai-results"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            style={{ padding: '0 24px' }}
          >
            {/* AI explanation banner */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              style={{
                marginBottom: '24px',
                padding: '20px 24px',
                background: 'linear-gradient(135deg, rgba(0, 201, 167, 0.06), rgba(0, 184, 153, 0.03))',
                border: '1px solid rgba(0, 201, 167, 0.2)',
                borderRadius: 'var(--radius-lg)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Subtle glow decoration */}
              <div
                style={{
                  position: 'absolute',
                  top: '-50%',
                  right: '-20%',
                  width: '200px',
                  height: '200px',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(0, 201, 167, 0.08) 0%, transparent 70%)',
                  pointerEvents: 'none',
                }}
              />
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '10px',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(0, 201, 167, 0.15)',
                        color: 'var(--accent)',
                      }}
                    >
                      <Sparkles size={14} />
                    </div>
                    <span
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '16px',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                      }}
                    >
                      R&#233;sultats IA
                    </span>
                    <Badge variant="accent">{aiResults.total}</Badge>
                  </div>
                  <button
                    onClick={dismissAIResults}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: '9999px',
                      background: 'var(--bg-raised)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-secondary)',
                      fontFamily: 'var(--font-body)',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all var(--transition)',
                    }}
                  >
                    <ArrowLeft size={12} />
                    Recherche classique
                  </button>
                </div>
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '14px',
                    color: 'var(--text-secondary)',
                    margin: 0,
                    lineHeight: 1.6,
                  }}
                >
                  {aiResults.explanation}
                </p>

                {/* Suggested filters badges */}
                {(aiResults.filters.categoryIds.length > 0 ||
                  aiResults.filters.mimeTypes.length > 0 ||
                  aiResults.filters.dateFrom ||
                  aiResults.filters.dateTo) && (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '6px',
                      marginTop: '12px',
                    }}
                  >
                    {aiResults.filters.categoryIds.map((catId) => {
                      const cat = categories.find((c) => c.id === catId)
                      return cat ? (
                        <span
                          key={catId}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            background: 'rgba(0, 201, 167, 0.1)',
                            border: '1px solid rgba(0, 201, 167, 0.15)',
                            fontFamily: 'var(--font-body)',
                            fontSize: '11px',
                            fontWeight: 500,
                            color: 'var(--accent)',
                          }}
                        >
                          <FolderOpen size={10} />
                          {cat.name}
                        </span>
                      ) : null
                    })}
                    {aiResults.filters.mimeTypes.map((mime) => (
                      <span
                        key={mime}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          background: 'rgba(0, 201, 167, 0.1)',
                          border: '1px solid rgba(0, 201, 167, 0.15)',
                          fontFamily: 'var(--font-body)',
                          fontSize: '11px',
                          fontWeight: 500,
                          color: 'var(--accent)',
                        }}
                      >
                        <FileText size={10} />
                        {FILE_TYPE_LABELS[mime] ?? mime}
                      </span>
                    ))}
                    {aiResults.filters.dateFrom && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          background: 'rgba(0, 201, 167, 0.1)',
                          border: '1px solid rgba(0, 201, 167, 0.15)',
                          fontFamily: 'var(--font-body)',
                          fontSize: '11px',
                          fontWeight: 500,
                          color: 'var(--accent)',
                        }}
                      >
                        Depuis {aiResults.filters.dateFrom}
                      </span>
                    )}
                    {aiResults.filters.dateTo && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          background: 'rgba(0, 201, 167, 0.1)',
                          border: '1px solid rgba(0, 201, 167, 0.15)',
                          fontFamily: 'var(--font-body)',
                          fontSize: '11px',
                          fontWeight: 500,
                          color: 'var(--accent)',
                        }}
                      >
                        Jusqu&apos;au {aiResults.filters.dateTo}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </motion.div>

            {/* AI document grid */}
            {aiResults.documents.length > 0 ? (
              <DocumentGrid documents={aiResults.documents} viewMode={viewMode} />
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ textAlign: 'center', padding: '60px 24px' }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: 'var(--radius-xl)',
                    background: 'var(--bg-raised)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  <Search size={28} />
                </div>
                <h3
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '18px',
                    color: 'var(--text-primary)',
                    margin: '0 0 8px',
                    fontWeight: 600,
                  }}
                >
                  Aucun r&#233;sultat trouv&#233; par l&apos;IA
                </h3>
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '14px',
                    color: 'var(--text-secondary)',
                    margin: '0 0 20px',
                  }}
                >
                  Essayez de reformuler votre recherche ou utilisez la recherche classique
                </p>
                <button
                  onClick={dismissAIResults}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                    padding: '9px 18px',
                    background: 'var(--bg-raised)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-body)',
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all var(--transition)',
                  }}
                >
                  <ArrowLeft size={13} />
                  Retour &#224; la recherche classique
                </button>
              </motion.div>
            )}
          </motion.div>
        ) : hasSearched ? (
          <motion.div
            key="results-layout"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div
              style={{
                display: 'flex',
                gap: '0',
                maxWidth: '100%',
                minHeight: '400px',
              }}
            >
              {/* Left: results */}
              <div style={{ flex: 1, minWidth: 0, padding: '0 24px' }}>
                {/* Results count + view toggle */}
                {!isLoading && (
                  <div
                    style={{
                      marginBottom: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: '14px',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {total === 0
                          ? query
                            ? `Aucun r\u00e9sultat pour "${query}"`
                            : 'Aucun r\u00e9sultat'
                          : `${total} r\u00e9sultat${total > 1 ? 's' : ''}${query ? ` pour "${query}"` : ''}`}
                      </span>
                      {total > 0 && (
                        <Badge variant="accent">{total}</Badge>
                      )}
                    </div>

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
                )}

                {/* Results */}
                {isLoading || results.length > 0 ? (
                  <DocumentGrid
                    documents={results}
                    isLoading={isLoading}
                    viewMode={viewMode}
                  />
                ) : (
                  /* No results state */
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      textAlign: 'center',
                      padding: '60px 24px',
                    }}
                  >
                    <div
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: 'var(--radius-xl)',
                        background: 'var(--bg-raised)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px',
                        color: 'var(--text-tertiary)',
                      }}
                    >
                      <Search size={28} />
                    </div>
                    <h3
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '18px',
                        color: 'var(--text-primary)',
                        margin: '0 0 8px',
                        fontWeight: 600,
                      }}
                    >
                      Aucun r&#233;sultat pour &ldquo;{query}&rdquo;
                    </h3>
                    <p
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '14px',
                        color: 'var(--text-secondary)',
                        margin: '0 0 20px',
                      }}
                    >
                      Essayez des termes diff&#233;rents ou supprimez vos filtres
                    </p>
                    <button
                      onClick={clearSearch}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '7px',
                        padding: '9px 18px',
                        background: 'var(--bg-raised)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--text-secondary)',
                        fontFamily: 'var(--font-body)',
                        fontSize: '13px',
                        cursor: 'pointer',
                        transition: 'all var(--transition)',
                      }}
                    >
                      <X size={13} />
                      Effacer la recherche
                    </button>
                  </motion.div>
                )}
              </div>

              {/* Right: Filter panel */}
              <FilterPanel
                categories={categories}
                selectedCategories={selectedCategories}
                selectedTypes={selectedTypes}
                selectedStatuses={selectedStatuses}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onCategoryChange={handleCategoryChange}
                onTypeChange={handleTypeChange}
                onStatusChange={handleStatusChange}
                onSortChange={handleSortChange}
                onReset={handleReset}
                documentCounts={documentCounts}
              />
            </div>
          </motion.div>
        ) : (
          /* Initial state: browse by category */
          <motion.div
            key="categories"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            style={{ maxWidth: '100%', padding: '0 32px' }}
          >
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                fontWeight: 600,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: 'var(--text-tertiary)',
                marginBottom: '16px',
              }}
            >
              Explorer par cat&#233;gorie
            </p>
            {categories.length > 0 ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '12px',
                }}
              >
                {categories.map((cat, i) => (
                  <motion.button
                    key={cat.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => {
                      setSelectedCategories([cat.id])
                      setHasSearched(true)
                      performSearch(query)
                    }}
                    whileHover={{ y: -2, boxShadow: 'var(--shadow-accent)', borderColor: 'var(--accent)' }}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '16px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-lg)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all var(--transition)',
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: 'var(--radius-md)',
                        background: cat.color ? `${cat.color}20` : 'var(--accent-dim)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: cat.color ?? 'var(--accent)',
                        flexShrink: 0,
                      }}
                    >
                      {(() => {
                        const IconComponent = cat.icon ? ICON_MAP[cat.icon] : undefined
                        return IconComponent ? <IconComponent size={16} /> : <FolderOpen size={16} />
                      })()}
                    </div>
                    <span
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {cat.name}
                    </span>
                  </motion.button>
                ))}
              </div>
            ) : (
              <div
                style={{
                  padding: '40px',
                  textAlign: 'center',
                  color: 'var(--text-tertiary)',
                  fontSize: '14px',
                }}
              >
                Aucune cat&#233;gorie disponible
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
