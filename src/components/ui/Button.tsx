'use client'

import { motion, type HTMLMotionProps } from 'framer-motion'
import React from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: React.ReactNode
  children?: React.ReactNode
}

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: { padding: '6px 12px', fontSize: '12px', gap: '6px', borderRadius: 'var(--radius-sm)' },
  md: { padding: '8px 16px', fontSize: '13px', gap: '8px', borderRadius: 'var(--radius-md)' },
  lg: { padding: '10px 20px', fontSize: '14px', gap: '10px', borderRadius: 'var(--radius-md)' },
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: 'var(--accent)',
    color: '#FFFFFF',
    border: 'none',
    fontWeight: 600,
  },
  secondary: {
    background: 'var(--bg-raised)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    fontWeight: 500,
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-secondary)',
    border: 'none',
    fontWeight: 500,
  },
  danger: {
    background: 'var(--red-dim)',
    color: 'var(--red)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    fontWeight: 500,
  },
}

const SpinnerIcon = ({ size }: { size: ButtonSize }) => {
  const dim = size === 'sm' ? 12 : size === 'lg' ? 16 : 14
  return (
    <svg
      width={dim}
      height={dim}
      viewBox="0 0 24 24"
      fill="none"
      style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }}
    >
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading

  const baseStyle = {
    display: 'inline-flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    fontFamily: 'var(--font-body)',
    fontWeight: 500,
    lineHeight: 1,
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.5 : 1,
    transition: 'all var(--transition)',
    userSelect: 'none' as const,
    whiteSpace: 'nowrap' as const,
    ...sizeStyles[size],
    ...variantStyles[variant],
    ...(style as React.CSSProperties),
  }

  return (
    <motion.button
      style={baseStyle}
      whileHover={isDisabled ? {} : { scale: 1.02, filter: variant === 'primary' ? 'brightness(1.08)' : 'brightness(1.04)' }}
      whileTap={isDisabled ? {} : { scale: 0.97 }}
      transition={{ duration: 0.12 }}
      disabled={isDisabled}
      {...props}
    >
      {loading ? <SpinnerIcon size={size} /> : icon ? <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{icon}</span> : null}
      {children && (
        <span style={{ lineHeight: 1 }}>{children}</span>
      )}
    </motion.button>
  )
}
