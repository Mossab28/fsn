import React from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '16px',
        padding: '28px 32px 20px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '22px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.03em',
            lineHeight: 1.2,
            margin: 0,
          }}
        >
          {title}
        </h1>
        {description && (
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              color: 'var(--text-secondary)',
              marginTop: '4px',
              marginBottom: 0,
              lineHeight: 1.5,
            }}
          >
            {description}
          </p>
        )}
      </div>
      {action && (
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          {action}
        </div>
      )}
    </div>
  )
}
