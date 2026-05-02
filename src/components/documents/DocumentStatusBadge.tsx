'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check, AlertTriangle } from 'lucide-react'
import {
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_COLORS,
  type DocumentStatus,
} from '@/types'

interface DocumentStatusBadgeProps {
  status: DocumentStatus
  isAdmin?: boolean
  onStatusChange?: (newStatus: DocumentStatus) => Promise<void>
}

const STATUS_FLOW: DocumentStatus[] = [
  'BROUILLON',
  'ENRICHISSEMENT',
  'RELECTURE',
  'DIFFUSION',
  'ARCHIVE',
]

export function DocumentStatusBadge({
  status,
  isAdmin = false,
  onStatusChange,
}: DocumentStatusBadgeProps) {
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState<DocumentStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
        setConfirming(null)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  const color = DOCUMENT_STATUS_COLORS[status]
  const label = DOCUMENT_STATUS_LABELS[status]

  const badgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '9999px',
    fontSize: '11px',
    fontWeight: 600,
    fontFamily: 'var(--font-body)',
    letterSpacing: '0.03em',
    background: `${color}18`,
    color: color,
    border: `1px solid ${color}30`,
    cursor: isAdmin && onStatusChange ? 'pointer' : 'default',
    userSelect: 'none',
    position: 'relative',
  }

  const handleConfirm = async (newStatus: DocumentStatus) => {
    if (!onStatusChange) return
    setLoading(true)
    try {
      await onStatusChange(newStatus)
      setConfirming(null)
      setOpen(false)
    } catch {
      // error handled by parent
    } finally {
      setLoading(false)
    }
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <motion.button
        onClick={() => {
          if (isAdmin && onStatusChange) {
            setOpen(!open)
            setConfirming(null)
          }
        }}
        style={{
          ...badgeStyle,
          background: `${color}18`,
        }}
        whileHover={
          isAdmin && onStatusChange
            ? { scale: 1.03, boxShadow: `0 0 12px ${color}30` }
            : {}
        }
        whileTap={isAdmin && onStatusChange ? { scale: 0.97 } : {}}
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: color,
            flexShrink: 0,
          }}
        />
        {label}
        {isAdmin && onStatusChange && (
          <ChevronDown
            size={11}
            style={{
              transition: 'transform 0.2s',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        )}
      </motion.button>

      <AnimatePresence>
        {open && isAdmin && onStatusChange && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '6px',
              background: 'var(--bg-overlay, var(--bg-surface))',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-md, 0 4px 16px rgba(0,0,0,0.3))',
              zIndex: 60,
              minWidth: '200px',
              overflow: 'hidden',
              padding: '4px',
            }}
          >
            <div
              style={{
                padding: '8px 10px 6px',
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--text-tertiary)',
                fontFamily: 'var(--font-body)',
              }}
            >
              Changer le statut
            </div>

            {STATUS_FLOW.map((s) => {
              const sColor = DOCUMENT_STATUS_COLORS[s]
              const sLabel = DOCUMENT_STATUS_LABELS[s]
              const isCurrent = s === status
              const isConfirmingThis = confirming === s

              return (
                <div key={s}>
                  <button
                    disabled={isCurrent || loading}
                    onClick={() => {
                      if (isConfirmingThis) {
                        handleConfirm(s)
                      } else {
                        setConfirming(s)
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: isConfirmingThis
                        ? `${sColor}15`
                        : 'transparent',
                      color: isCurrent
                        ? 'var(--text-tertiary)'
                        : 'var(--text-primary)',
                      fontSize: '13px',
                      fontFamily: 'var(--font-body)',
                      cursor: isCurrent || loading ? 'not-allowed' : 'pointer',
                      opacity: isCurrent ? 0.5 : 1,
                      transition: 'background 0.15s',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      if (!isCurrent && !isConfirmingThis) {
                        (e.currentTarget as HTMLButtonElement).style.background =
                          'var(--bg-raised)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isConfirmingThis) {
                        (e.currentTarget as HTMLButtonElement).style.background =
                          'transparent'
                      }
                    }}
                  >
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: sColor,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ flex: 1 }}>
                      {isConfirmingThis ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <AlertTriangle size={11} />
                          Confirmer : {sLabel}
                        </span>
                      ) : (
                        sLabel
                      )}
                    </span>
                    {isCurrent && (
                      <Check size={12} style={{ color: sColor, flexShrink: 0 }} />
                    )}
                  </button>
                </div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
