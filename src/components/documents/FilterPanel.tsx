'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  BarChart2,
  Image as ImageIcon,
  Check,
  RotateCcw,
  ChevronDown,
} from 'lucide-react'
import type { Category, DocumentStatus } from '@/types'
import { DOCUMENT_STATUS_LABELS, DOCUMENT_STATUS_COLORS } from '@/types'

interface FilterPanelProps {
  categories: Category[]
  selectedCategories: string[]
  selectedTypes: string[]
  selectedStatuses?: DocumentStatus[]
  sortBy: string
  sortOrder: string
  onCategoryChange: (ids: string[]) => void
  onTypeChange: (types: string[]) => void
  onStatusChange?: (statuses: DocumentStatus[]) => void
  onSortChange: (sortBy: string, sortOrder: string) => void
  onReset: () => void
  documentCounts?: Record<string, number>
}

const FILE_TYPES = [
  {
    value: 'application/pdf',
    label: 'PDF',
    icon: <FileText size={14} />,
    color: '#EF4444',
  },
  {
    value: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    label: 'Word',
    icon: <FileText size={14} />,
    color: '#3B82F6',
  },
  {
    value: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    label: 'Excel',
    icon: <BarChart2 size={14} />,
    color: '#22C55E',
  },
  {
    value: 'image/',
    label: 'Images',
    icon: <ImageIcon size={14} />,
    color: '#A78BFA',
  },
]

const SORT_OPTIONS = [
  { sortBy: 'createdAt', sortOrder: 'desc', label: 'Plus récent' },
  { sortBy: 'title', sortOrder: 'asc', label: 'Alphabétique' },
  { sortBy: 'fileSize', sortOrder: 'desc', label: 'Taille' },
]

function Checkbox({
  checked,
  onChange,
  label,
  color,
  icon,
  count,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  color?: string
  icon?: React.ReactNode
  count?: number
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '5px 0',
        cursor: 'pointer',
        transition: 'color var(--transition)',
      }}
      onMouseEnter={(e) => {
        const span = e.currentTarget.querySelector('.filter-label') as HTMLElement
        if (span) span.style.color = 'var(--text-primary)'
      }}
      onMouseLeave={(e) => {
        const span = e.currentTarget.querySelector('.filter-label') as HTMLElement
        if (span) span.style.color = checked ? 'var(--text-primary)' : 'var(--text-secondary)'
      }}
    >
      <motion.div
        onClick={(e) => {
          e.preventDefault()
          onChange(!checked)
        }}
        whileTap={{ scale: 0.9 }}
        style={{
          width: '18px',
          height: '18px',
          borderRadius: '5px',
          background: checked ? 'var(--accent)' : '#FFFFFF',
          border: checked ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          cursor: 'pointer',
          transition: 'all var(--transition)',
        }}
      >
        <AnimatePresence>
          {checked && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.12 }}
            >
              <Check size={12} color="#FFFFFF" strokeWidth={3} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {color && (
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: color,
            flexShrink: 0,
          }}
        />
      )}

      {icon && (
        <span style={{ display: 'flex', flexShrink: 0, color: color ?? 'var(--text-tertiary)' }}>
          {icon}
        </span>
      )}

      <span
        className="filter-label"
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '13px',
          color: checked ? 'var(--text-primary)' : 'var(--text-secondary)',
          flex: 1,
          transition: 'color var(--transition)',
        }}
      >
        {label}
      </span>

      {count !== undefined && (
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '11px',
            color: 'var(--text-tertiary)',
            fontWeight: 500,
          }}
        >
          {count}
        </span>
      )}
    </label>
  )
}

function RadioButton({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: () => void
  label: string
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '5px 0',
        cursor: 'pointer',
      }}
      onClick={(e) => {
        e.preventDefault()
        onChange()
      }}
      onMouseEnter={(e) => {
        const span = e.currentTarget.querySelector('.radio-label') as HTMLElement
        if (span) span.style.color = 'var(--text-primary)'
      }}
      onMouseLeave={(e) => {
        const span = e.currentTarget.querySelector('.radio-label') as HTMLElement
        if (span) span.style.color = checked ? 'var(--text-primary)' : 'var(--text-secondary)'
      }}
    >
      <div
        style={{
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          background: '#FFFFFF',
          border: checked ? '2px solid var(--accent)' : '1.5px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'all var(--transition)',
        }}
      >
        {checked && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--accent)',
            }}
          />
        )}
      </div>

      <span
        className="radio-label"
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '13px',
          color: checked ? 'var(--text-primary)' : 'var(--text-secondary)',
          transition: 'color var(--transition)',
        }}
      >
        {label}
      </span>
    </label>
  )
}

function SectionTitle({ children, collapsed, onToggle }: { children: string; collapsed?: boolean; onToggle?: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        fontFamily: 'var(--font-body)',
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'var(--text-tertiary)',
        marginBottom: collapsed ? '0' : '8px',
        padding: 0,
        background: 'transparent',
        border: 'none',
        cursor: onToggle ? 'pointer' : 'default',
      }}
    >
      {children}
      {onToggle && (
        <motion.span
          animate={{ rotate: collapsed ? -90 : 0 }}
          transition={{ duration: 0.15 }}
          style={{ display: 'flex' }}
        >
          <ChevronDown size={12} />
        </motion.span>
      )}
    </button>
  )
}

const ALL_STATUSES: DocumentStatus[] = ['BROUILLON', 'ENRICHISSEMENT', 'RELECTURE', 'DIFFUSION', 'ARCHIVE']

export function FilterPanel({
  categories,
  selectedCategories,
  selectedTypes,
  selectedStatuses = [],
  sortBy,
  sortOrder,
  onCategoryChange,
  onTypeChange,
  onStatusChange,
  onSortChange,
  onReset,
  documentCounts,
}: FilterPanelProps) {
  const [categoriesCollapsed, setCategoriesCollapsed] = useState(false)
  const [typesCollapsed, setTypesCollapsed] = useState(false)
  const [statusCollapsed, setStatusCollapsed] = useState(false)
  const [sortCollapsed, setSortCollapsed] = useState(false)

  const hasActiveFilters = selectedCategories.length > 0 || selectedTypes.length > 0 || selectedStatuses.length > 0

  const toggleCategory = (id: string) => {
    if (selectedCategories.includes(id)) {
      onCategoryChange(selectedCategories.filter((c) => c !== id))
    } else {
      onCategoryChange([...selectedCategories, id])
    }
  }

  const toggleType = (value: string) => {
    if (selectedTypes.includes(value)) {
      onTypeChange(selectedTypes.filter((t) => t !== value))
    } else {
      onTypeChange([...selectedTypes, value])
    }
  }

  const toggleStatus = (status: DocumentStatus) => {
    if (!onStatusChange) return
    if (selectedStatuses.includes(status)) {
      onStatusChange(selectedStatuses.filter((s) => s !== status))
    } else {
      onStatusChange([...selectedStatuses, status])
    }
  }

  const panelStyle: React.CSSProperties = {
    width: '260px',
    flexShrink: 0,
    background: 'var(--bg-surface)',
    borderLeft: '1px solid var(--border)',
    borderRadius: '0 var(--radius-lg) var(--radius-lg) 0',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    alignSelf: 'flex-start',
    position: 'sticky',
    top: '20px',
  }

  const sectionStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
  }

  const dividerStyle: React.CSSProperties = {
    height: '1px',
    background: 'var(--border-subtle)',
    margin: '0',
  }

  return (
    <motion.aside
      style={panelStyle}
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '14px',
            fontWeight: 700,
            color: 'var(--text-primary)',
          }}
        >
          Filtres
        </span>
        {hasActiveFilters && (
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
            {selectedCategories.length + selectedTypes.length + selectedStatuses.length}
          </span>
        )}
      </div>

      <div style={dividerStyle} />

      {/* Categories */}
      <div style={sectionStyle}>
        <SectionTitle
          collapsed={categoriesCollapsed}
          onToggle={() => setCategoriesCollapsed(!categoriesCollapsed)}
        >
          Catégories
        </SectionTitle>
        <AnimatePresence initial={false}>
          {!categoriesCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden' }}
            >
              {categories.map((cat) => (
                <Checkbox
                  key={cat.id}
                  checked={selectedCategories.includes(cat.id)}
                  onChange={() => toggleCategory(cat.id)}
                  label={cat.name}
                  color={cat.color ?? 'var(--accent)'}
                  count={documentCounts?.[cat.id]}
                />
              ))}
              {categories.length === 0 && (
                <span
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-tertiary)',
                    fontStyle: 'italic',
                  }}
                >
                  Aucune catégorie
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={dividerStyle} />

      {/* File types */}
      <div style={sectionStyle}>
        <SectionTitle
          collapsed={typesCollapsed}
          onToggle={() => setTypesCollapsed(!typesCollapsed)}
        >
          Type de fichier
        </SectionTitle>
        <AnimatePresence initial={false}>
          {!typesCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden' }}
            >
              {FILE_TYPES.map((ft) => (
                <Checkbox
                  key={ft.value}
                  checked={selectedTypes.includes(ft.value)}
                  onChange={() => toggleType(ft.value)}
                  label={ft.label}
                  icon={ft.icon}
                  color={ft.color}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={dividerStyle} />

      {/* Status */}
      {onStatusChange && (
        <>
          <div style={sectionStyle}>
            <SectionTitle
              collapsed={statusCollapsed}
              onToggle={() => setStatusCollapsed(!statusCollapsed)}
            >
              Statut
            </SectionTitle>
            <AnimatePresence initial={false}>
              {!statusCollapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: 'hidden' }}
                >
                  {ALL_STATUSES.map((s) => (
                    <Checkbox
                      key={s}
                      checked={selectedStatuses.includes(s)}
                      onChange={() => toggleStatus(s)}
                      label={DOCUMENT_STATUS_LABELS[s]}
                      color={DOCUMENT_STATUS_COLORS[s]}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div style={dividerStyle} />
        </>
      )}

      {/* Sort */}
      <div style={sectionStyle}>
        <SectionTitle
          collapsed={sortCollapsed}
          onToggle={() => setSortCollapsed(!sortCollapsed)}
        >
          Trier par
        </SectionTitle>
        <AnimatePresence initial={false}>
          {!sortCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden' }}
            >
              {SORT_OPTIONS.map((opt) => (
                <RadioButton
                  key={`${opt.sortBy}_${opt.sortOrder}`}
                  checked={sortBy === opt.sortBy && sortOrder === opt.sortOrder}
                  onChange={() => onSortChange(opt.sortBy, opt.sortOrder)}
                  label={opt.label}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={dividerStyle} />

      {/* Reset button */}
      <motion.button
        onClick={onReset}
        whileHover={{ scale: 1.01, background: 'var(--bg-raised)' }}
        whileTap={{ scale: 0.98 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          padding: '9px 16px',
          background: hasActiveFilters ? 'var(--accent-dim)' : 'transparent',
          border: hasActiveFilters
            ? '1px solid rgba(0, 168, 142, 0.2)'
            : '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          color: hasActiveFilters ? 'var(--accent)' : 'var(--text-tertiary)',
          fontFamily: 'var(--font-body)',
          fontSize: '12px',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all var(--transition)',
        }}
      >
        <RotateCcw size={12} />
        Réinitialiser
      </motion.button>
    </motion.aside>
  )
}
