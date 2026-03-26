'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { Search, LayoutGrid, List, SlidersHorizontal } from 'lucide-react'
import type { SearchFilters, Category } from '@/types'

interface FilterBarProps {
  onFiltersChange: (filters: SearchFilters) => void
  categories: Category[]
  initialFilters?: SearchFilters
}

type ViewMode = 'grid' | 'list'

type SortOption = {
  value: `${SearchFilters['sortBy']}_${SearchFilters['sortOrder']}`
  label: string
}

const SORT_OPTIONS: SortOption[] = [
  { value: 'createdAt_desc', label: 'Plus récents' },
  { value: 'createdAt_asc', label: 'Plus anciens' },
  { value: 'title_asc', label: 'Alphabétique' },
  { value: 'fileSize_desc', label: 'Taille décroissante' },
]

const FILE_TYPE_OPTIONS = [
  { value: '', label: 'Tous les types' },
  { value: 'application/pdf', label: 'PDF' },
  { value: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', label: 'Word' },
  { value: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', label: 'Excel' },
  { value: 'image/', label: 'Images' },
]

const selectStyle: React.CSSProperties = {
  padding: '7px 12px',
  paddingRight: '32px',
  background: 'var(--bg-raised)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-body)',
  fontSize: '13px',
  outline: 'none',
  cursor: 'pointer',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2352525B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 8px center',
  minWidth: '140px',
  transition: 'border-color var(--transition)',
}

export function FilterBar({ onFiltersChange, categories, initialFilters = {} }: FilterBarProps) {
  const [query, setQuery] = useState(initialFilters.query ?? '')
  const [categoryId, setCategoryId] = useState(initialFilters.categoryId ?? '')
  const [mimeType, setMimeType] = useState(initialFilters.mimeType ?? '')
  const [sortValue, setSortValue] = useState<string>('createdAt_desc')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const filtersRef = useRef<SearchFilters>(initialFilters)

  const emitFilters = useCallback(
    (filters: SearchFilters) => {
      filtersRef.current = filters
      onFiltersChange(filters)
    },
    [onFiltersChange]
  )

  // Debounce query changes, immediate for other filters
  useEffect(() => {
    const [sortBy, sortOrder] = sortValue.split('_') as [SearchFilters['sortBy'], SearchFilters['sortOrder']]

    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      emitFilters({
        query: query.trim() || undefined,
        categoryId: categoryId || undefined,
        mimeType: mimeType || undefined,
        sortBy,
        sortOrder,
      })
    }, 300)

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [query, categoryId, mimeType, sortValue, emitFilters])

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0',
    padding: '12px 0',
    background: 'var(--bg)',
    borderBottom: '1px solid var(--border)',
    flexWrap: 'wrap',
    rowGap: '8px',
  }

  const groupStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  }

  const separatorStyle: React.CSSProperties = {
    width: '1px',
    height: '24px',
    background: 'var(--border)',
    margin: '0 12px',
    flexShrink: 0,
  }

  return (
    <motion.div
      style={containerStyle}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Search */}
      <div style={{ ...groupStyle, flex: 1, minWidth: '200px' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '360px' }}>
          <span
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-tertiary)',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          >
            <Search size={15} />
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un document..."
            className="input-base"
            style={{
              width: '100%',
              padding: '7px 12px 7px 34px',
              fontSize: '13px',
              fontFamily: 'var(--font-body)',
              color: 'var(--text-primary)',
              background: 'var(--bg-raised)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              outline: 'none',
            }}
          />
        </div>
      </div>

      <div style={separatorStyle} />

      {/* Filters group */}
      <div style={groupStyle}>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: 'var(--text-tertiary)',
            fontWeight: 500,
            letterSpacing: '0.02em',
          }}
        >
          <SlidersHorizontal size={13} />
          Filtres
        </span>

        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          style={selectStyle}
          aria-label="Catégorie"
        >
          <option value="">Toutes les catégories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>

        <select
          value={mimeType}
          onChange={(e) => setMimeType(e.target.value)}
          style={selectStyle}
          aria-label="Type de fichier"
        >
          {FILE_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div style={separatorStyle} />

      {/* Sort */}
      <div style={groupStyle}>
        <select
          value={sortValue}
          onChange={(e) => setSortValue(e.target.value)}
          style={selectStyle}
          aria-label="Trier par"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div style={separatorStyle} />

      {/* View toggle */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'var(--bg-raised)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
          padding: '3px',
          gap: '2px',
        }}
      >
        {(['grid', 'list'] as ViewMode[]).map((mode) => (
          <motion.button
            key={mode}
            onClick={() => setViewMode(mode)}
            whileTap={{ scale: 0.93 }}
            aria-label={mode === 'grid' ? 'Vue grille' : 'Vue liste'}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '30px',
              height: '28px',
              borderRadius: '6px',
              background: viewMode === mode ? 'var(--accent-dim)' : 'transparent',
              border: viewMode === mode ? '1px solid rgba(0, 201, 167, 0.2)' : '1px solid transparent',
              color: viewMode === mode ? 'var(--accent)' : 'var(--text-tertiary)',
              cursor: 'pointer',
              transition: 'all var(--transition)',
            }}
          >
            {mode === 'grid' ? <LayoutGrid size={15} /> : <List size={15} />}
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
}
