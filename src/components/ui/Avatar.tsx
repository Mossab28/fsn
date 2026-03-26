import React from 'react'

type AvatarSize = 'sm' | 'md' | 'lg'

interface AvatarProps {
  name: string
  size?: AvatarSize
  src?: string
  className?: string
}

const sizePx: Record<AvatarSize, number> = {
  sm: 24,
  md: 32,
  lg: 40,
}

const fontSizes: Record<AvatarSize, number> = {
  sm: 9,
  md: 12,
  lg: 14,
}

// Deterministic color palette — generated from name hash
const GRADIENTS = [
  ['#00C9A7', '#00E5C4'],  // teal
  ['#3B82F6', '#60A5FA'],  // blue
  ['#F59E0B', '#FCD34D'],  // amber
  ['#8B5CF6', '#A78BFA'],  // purple
  ['#EF4444', '#F87171'],  // red
  ['#EC4899', '#F472B6'],  // pink
  ['#06B6D4', '#22D3EE'],  // cyan
]

function getColorIndex(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash) % GRADIENTS.length
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function Avatar({ name, size = 'md', src, className }: AvatarProps) {
  const dim = sizePx[size]
  const fontSize = fontSizes[size]
  const idx = getColorIndex(name)
  const [from, to] = GRADIENTS[idx]
  const initials = getInitials(name)

  const style: React.CSSProperties = {
    width: dim,
    height: dim,
    borderRadius: '9999px',
    background: src ? undefined : `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize,
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    color: '#FFFFFF',
    flexShrink: 0,
    border: '1.5px solid rgba(0,0,0,0.06)',
    overflow: 'hidden',
    userSelect: 'none',
    letterSpacing: '-0.01em',
  }

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        style={{ ...style, objectFit: 'cover' }}
        className={className}
      />
    )
  }

  return (
    <div style={style} className={className} title={name} aria-label={name}>
      {initials}
    </div>
  )
}
