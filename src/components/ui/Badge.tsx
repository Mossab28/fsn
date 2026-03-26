import React from 'react'

type BadgeVariant = 'default' | 'accent' | 'amber' | 'blue' | 'red' | 'purple'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'badge badge-muted',
  accent: 'badge badge-accent',
  amber: 'badge badge-amber',
  blue: 'badge',
  red: 'badge',
  purple: 'badge',
}

const variantInlineStyles: Record<BadgeVariant, React.CSSProperties> = {
  default: {},
  accent: {},
  amber: {},
  blue: {
    background: 'var(--blue-dim)',
    color: 'var(--blue)',
    border: '1px solid rgba(59, 130, 246, 0.2)',
  },
  red: {
    background: 'var(--red-dim)',
    color: 'var(--red)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
  },
  purple: {
    background: 'rgba(139, 92, 246, 0.12)',
    color: '#A78BFA',
    border: '1px solid rgba(139, 92, 246, 0.2)',
  },
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span
      className={`${variantClasses[variant]}${className ? ` ${className}` : ''}`}
      style={variantInlineStyles[variant]}
    >
      {children}
    </span>
  )
}
