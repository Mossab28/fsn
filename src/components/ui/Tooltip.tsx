'use client'

import * as RadixTooltip from '@radix-ui/react-tooltip'
import { motion, AnimatePresence } from 'framer-motion'
import React from 'react'

interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  align?: 'start' | 'center' | 'end'
  delayDuration?: number
}

export function Tooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  delayDuration = 400,
}: TooltipProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <RadixTooltip.Provider delayDuration={delayDuration}>
      <RadixTooltip.Root open={open} onOpenChange={setOpen}>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>

        <AnimatePresence>
          {open && (
            <RadixTooltip.Portal forceMount>
              <RadixTooltip.Content asChild side={side} align={align} sideOffset={6}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.94, y: side === 'top' ? 4 : side === 'bottom' ? -4 : 0 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{ duration: 0.12, ease: [0.4, 0, 0.2, 1] }}
                  style={{
                    background: 'var(--bg-overlay)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '5px 10px',
                    fontSize: '12px',
                    fontFamily: 'var(--font-body)',
                    fontWeight: 500,
                    color: 'var(--accent)',
                    boxShadow: 'var(--shadow-md)',
                    zIndex: 200,
                    maxWidth: 260,
                    lineHeight: 1.5,
                    pointerEvents: 'none',
                  }}
                >
                  {content}
                  <RadixTooltip.Arrow
                    style={{ fill: 'var(--border)' }}
                    width={8}
                    height={4}
                  />
                </motion.div>
              </RadixTooltip.Content>
            </RadixTooltip.Portal>
          )}
        </AnimatePresence>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  )
}
