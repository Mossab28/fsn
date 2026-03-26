'use client'

import React, { useState } from 'react'

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  error?: string
  hint?: string
  icon?: React.ReactNode
  rightElement?: React.ReactNode
}

export function Input({
  label,
  error,
  hint,
  icon,
  rightElement,
  id,
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false)
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)
  const hasValue = Boolean(props.value ?? props.defaultValue)

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    width: '100%',
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-body)',
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: error ? 'var(--red)' : focused ? 'var(--accent)' : 'var(--text-secondary)',
    transition: 'color var(--transition)',
  }

  const wrapperStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: icon ? '9px 12px 9px 36px' : '9px 12px',
    paddingRight: rightElement ? '40px' : '12px',
    border: error
      ? '1px solid var(--red)'
      : focused
      ? '1px solid var(--accent)'
      : '1px solid var(--border)',
    boxShadow: error
      ? '0 0 0 3px var(--red-dim)'
      : focused
      ? '0 0 0 3px var(--accent-dim)'
      : 'none',
    background: 'var(--bg-raised)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)',
    fontSize: '14px',
    lineHeight: 1.5,
    outline: 'none',
    transition: 'border-color var(--transition), box-shadow var(--transition)',
  }

  const iconStyle: React.CSSProperties = {
    position: 'absolute',
    left: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: error ? 'var(--red)' : focused ? 'var(--accent)' : 'var(--text-tertiary)',
    display: 'flex',
    alignItems: 'center',
    pointerEvents: 'none',
    transition: 'color var(--transition)',
  }

  const rightStyle: React.CSSProperties = {
    position: 'absolute',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    alignItems: 'center',
    color: 'var(--text-tertiary)',
  }

  const messageStyle: React.CSSProperties = {
    fontFamily: 'var(--font-body)',
    fontSize: '12px',
    marginTop: '2px',
  }

  return (
    <div style={containerStyle}>
      {label && (
        <label htmlFor={inputId} style={labelStyle}>
          {label}
        </label>
      )}
      <div style={wrapperStyle}>
        {icon && <span style={iconStyle}>{icon}</span>}
        <input
          id={inputId}
          className="input-base"
          style={inputStyle}
          onFocus={(e) => {
            setFocused(true)
            props.onFocus?.(e)
          }}
          onBlur={(e) => {
            setFocused(false)
            props.onBlur?.(e)
          }}
          {...props}
        />
        {rightElement && <span style={rightStyle}>{rightElement}</span>}
      </div>
      {error && (
        <span style={{ ...messageStyle, color: 'var(--red)' }}>{error}</span>
      )}
      {!error && hint && (
        <span style={{ ...messageStyle, color: 'var(--text-tertiary)' }}>{hint}</span>
      )}
    </div>
  )
}
