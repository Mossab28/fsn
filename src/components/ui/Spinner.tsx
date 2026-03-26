import React from 'react'

type SpinnerSize = 'sm' | 'md' | 'lg'

interface SpinnerProps {
  size?: SpinnerSize
  color?: string
}

const dimensions: Record<SpinnerSize, number> = {
  sm: 16,
  md: 24,
  lg: 36,
}

const strokeWidths: Record<SpinnerSize, number> = {
  sm: 2.5,
  md: 2.5,
  lg: 3,
}

export function Spinner({ size = 'md', color = 'var(--accent)' }: SpinnerProps) {
  const dim = dimensions[size]
  const stroke = strokeWidths[size]

  return (
    <svg
      width={dim}
      height={dim}
      viewBox="0 0 24 24"
      fill="none"
      aria-label="Chargement..."
      style={{ animation: 'spin 0.7s linear infinite', display: 'inline-block', flexShrink: 0 }}
    >
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke={color}
        strokeWidth={stroke}
        strokeOpacity="0.15"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
      />
    </svg>
  )
}
