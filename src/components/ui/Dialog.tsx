'use client'

import * as RadixDialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import React, { useState } from 'react'

interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
  title: string
  description?: string
  children: React.ReactNode
  maxWidth?: number | string
}

export function Dialog({
  open: controlledOpen,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  maxWidth = 520,
}: DialogProps) {
  // Support both controlled (open prop) and uncontrolled (trigger) usage
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen

  const handleOpenChange = (next: boolean) => {
    if (!isControlled) setUncontrolledOpen(next)
    onOpenChange?.(next)
  }

  return (
    <RadixDialog.Root open={isOpen} onOpenChange={handleOpenChange}>
      {trigger && <RadixDialog.Trigger asChild>{trigger}</RadixDialog.Trigger>}

      <AnimatePresence>
        {isOpen && (
          <RadixDialog.Portal forceMount>
            {/* Backdrop overlay */}
            <RadixDialog.Overlay asChild>
              <motion.div
                key="dialog-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(0, 0, 0, 0.72)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  zIndex: 50,
                }}
              />
            </RadixDialog.Overlay>

            {/* Dialog panel */}
            <RadixDialog.Content asChild>
              <motion.div
                key="dialog-content"
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                style={{
                  position: 'fixed',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: `min(${typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth}, calc(100vw - 32px))`,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-xl)',
                  boxShadow: 'var(--shadow-lg), 0 0 0 1px var(--border-subtle)',
                  zIndex: 51,
                  outline: 'none',
                  overflow: 'hidden',
                }}
              >
                {/* Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    padding: '20px 24px 16px',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ flex: 1, paddingRight: '16px' }}>
                    <RadixDialog.Title
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '17px',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        letterSpacing: '-0.02em',
                        margin: 0,
                        lineHeight: 1.3,
                      }}
                    >
                      {title}
                    </RadixDialog.Title>
                    {description && (
                      <RadixDialog.Description
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: '13px',
                          color: 'var(--text-secondary)',
                          marginTop: '4px',
                          lineHeight: 1.5,
                          margin: '4px 0 0',
                        }}
                      >
                        {description}
                      </RadixDialog.Description>
                    )}
                  </div>
                  <RadixDialog.Close
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 28,
                      height: 28,
                      borderRadius: 'var(--radius-sm)',
                      background: 'transparent',
                      border: '1px solid transparent',
                      color: 'var(--text-tertiary)',
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'all var(--transition)',
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLButtonElement
                      el.style.background = 'var(--bg-raised)'
                      el.style.borderColor = 'var(--border)'
                      el.style.color = 'var(--text-primary)'
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLButtonElement
                      el.style.background = 'transparent'
                      el.style.borderColor = 'transparent'
                      el.style.color = 'var(--text-tertiary)'
                    }}
                  >
                    <X size={14} />
                  </RadixDialog.Close>
                </div>

                {/* Body */}
                <div style={{ padding: '20px 24px 24px' }}>
                  {children}
                </div>
              </motion.div>
            </RadixDialog.Content>
          </RadixDialog.Portal>
        )}
      </AnimatePresence>
    </RadixDialog.Root>
  )
}
