'use client'

import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Floating geometric shape
function FloatingShape({
  size,
  x,
  y,
  delay,
  duration,
  shape,
}: {
  size: number
  x: string
  y: string
  delay: number
  duration: number
  shape: 'circle' | 'square' | 'diamond'
}) {
  const shapeStyle: React.CSSProperties = {
    position: 'absolute',
    left: x,
    top: y,
    width: size,
    height: size,
    opacity: 0.1,
    border: '1px solid rgba(0, 168, 142, 0.6)',
    borderRadius: shape === 'circle' ? '50%' : shape === 'diamond' ? '4px' : '3px',
    transform: shape === 'diamond' ? 'rotate(45deg)' : 'none',
  }

  return (
    <motion.div
      style={shapeStyle}
      animate={{
        y: [0, -20, 0],
        opacity: [0.1, 0.2, 0.1],
        rotate: shape === 'diamond' ? [45, 65, 45] : [0, 8, 0],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  )
}

const SHAPES = [
  { size: 64, x: '10%', y: '15%', delay: 0, duration: 7, shape: 'circle' as const },
  { size: 40, x: '20%', y: '55%', delay: 1.2, duration: 9, shape: 'square' as const },
  { size: 80, x: '5%', y: '72%', delay: 0.5, duration: 8, shape: 'diamond' as const },
  { size: 32, x: '35%', y: '25%', delay: 2, duration: 6, shape: 'circle' as const },
  { size: 56, x: '70%', y: '10%', delay: 0.8, duration: 10, shape: 'square' as const },
  { size: 24, x: '80%', y: '40%', delay: 1.8, duration: 7.5, shape: 'diamond' as const },
  { size: 48, x: '60%', y: '70%', delay: 0.3, duration: 8.5, shape: 'circle' as const },
  { size: 36, x: '88%', y: '80%', delay: 1.5, duration: 11, shape: 'square' as const },
]

const FEATURES = [
  'Gestion centralisee des documents reglementaires',
  'Acces securise pour tous les membres de la filiere',
  'Recherche avancee par categorie et metadonnees',
]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Identifiants incorrects. Verifiez votre email et mot de passe.')
        setIsLoading(false)
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Une erreur est survenue. Reessayez.')
      setIsLoading(false)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        fontFamily: 'var(--font-body)',
      }}
    >
      {/* LEFT PANEL — Dark branding panel */}
      <div
        style={{
          width: '45%',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '48px',
          background: '#0D1520',
          borderRight: 'none',
        }}
      >
        {/* Radial gradient background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse 80% 60% at 0% 100%, rgba(0, 168, 142, 0.15) 0%, transparent 65%)',
            pointerEvents: 'none',
          }}
        />
        {/* Secondary glow */}
        <div
          style={{
            position: 'absolute',
            bottom: '-80px',
            left: '-80px',
            width: '320px',
            height: '320px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0, 168, 142, 0.1) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Floating shapes */}
        {mounted &&
          SHAPES.map((s, i) => (
            <FloatingShape key={i} {...s} />
          ))}

        {/* Top: Logo mark */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ position: 'relative', zIndex: 1 }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '6px 14px',
              background: 'rgba(0, 168, 142, 0.12)',
              border: '1px solid rgba(0, 168, 142, 0.25)',
              borderRadius: '9999px',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#00A88E',
                display: 'block',
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '11px',
                fontWeight: 700,
                color: '#00A88E',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              Filiere Sante Numerique
            </span>
          </div>
        </motion.div>

        {/* Center: Main branding */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          style={{ position: 'relative', zIndex: 1 }}
        >
          {/* Monogram */}
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(80px, 10vw, 120px)',
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: '-0.04em',
              color: '#FAFAFA',
              marginBottom: '12px',
            }}
          >
            FSN
            <span
              style={{
                display: 'block',
                width: '48px',
                height: '4px',
                background: '#00A88E',
                borderRadius: '2px',
                marginTop: '12px',
              }}
            />
          </div>

          {/* Subtitle */}
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '20px',
              fontWeight: 600,
              color: '#A1A1AA',
              marginBottom: '8px',
              letterSpacing: '-0.01em',
            }}
          >
            Base Documentaire
          </p>

          {/* Tagline */}
          <p
            style={{
              fontSize: '14px',
              color: '#71717A',
              lineHeight: 1.6,
              maxWidth: '340px',
            }}
          >
            La plateforme documentaire de la Filiere Sante Numerique — un acces unifie aux ressources reglementaires et strategiques.
          </p>
        </motion.div>

        {/* Bottom: Feature list */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          style={{ position: 'relative', zIndex: 1 }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {FEATURES.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.4 + i * 0.1 }}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#00A88E',
                    flexShrink: 0,
                    marginTop: '6px',
                  }}
                />
                <span
                  style={{
                    fontSize: '13px',
                    color: '#A1A1AA',
                    lineHeight: 1.5,
                  }}
                >
                  {feature}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Version */}
          <p
            style={{
              marginTop: '32px',
              fontSize: '11px',
              color: '#52525B',
              letterSpacing: '0.04em',
            }}
          >
            v1.0.0 — Plateforme interne FSN
          </p>
        </motion.div>
      </div>

      {/* RIGHT PANEL — Login form (adapts to theme) */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px',
          background: 'var(--bg-surface)',
          position: 'relative',
        }}
      >
        {/* Subtle top-right glow */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            right: '-100px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0, 168, 142, 0.04) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          style={{
            width: '100%',
            maxWidth: '400px',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Form header */}
          <div style={{ marginBottom: '36px' }}>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '32px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                marginBottom: '8px',
              }}
            >
              Connexion
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Accedez a votre espace documentaire
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '8px' }}>
              {/* Email field */}
              <div>
                <label
                  htmlFor="email"
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    marginBottom: '6px',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  Adresse email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.fr"
                  required
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    fontSize: '14px',
                    background: 'var(--bg-raised)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-body)',
                    outline: 'none',
                    transition: 'border-color var(--transition), box-shadow var(--transition)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent)'
                    e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-dim)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                />
              </div>

              {/* Password field */}
              <div>
                <label
                  htmlFor="password"
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    marginBottom: '6px',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  Mot de passe
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    fontSize: '14px',
                    background: 'var(--bg-raised)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-body)',
                    outline: 'none',
                    transition: 'border-color var(--transition), box-shadow var(--transition)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent)'
                    e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-dim)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                />
              </div>
            </div>

            {/* Error message */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: -6, height: 0 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    height: 'auto',
                    x: [0, -6, 6, -4, 4, 0],
                  }}
                  exit={{ opacity: 0, y: -6, height: 0 }}
                  transition={{
                    opacity: { duration: 0.2 },
                    height: { duration: 0.2 },
                    x: { duration: 0.4, delay: 0.1 },
                  }}
                  style={{
                    marginTop: '12px',
                    padding: '10px 14px',
                    background: 'rgba(220, 38, 38, 0.06)',
                    border: '1px solid rgba(220, 38, 38, 0.15)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '13px',
                    color: '#DC2626',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none"
                    style={{ flexShrink: 0 }}
                  >
                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                    <path
                      d="M8 4.5v4M8 11h.01"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit button */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: isLoading ? 1 : 1.01 }}
              whileTap={{ scale: isLoading ? 1 : 0.98 }}
              style={{
                width: '100%',
                marginTop: '20px',
                padding: '13px 20px',
                background: isLoading ? 'rgba(0, 168, 142, 0.08)' : '#00A88E',
                color: isLoading ? '#00A88E' : '#FFFFFF',
                border: isLoading ? '1px solid rgba(0, 168, 142, 0.2)' : 'none',
                borderRadius: 'var(--radius-md)',
                fontFamily: 'var(--font-body)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all var(--transition)',
                letterSpacing: '0.01em',
              }}
            >
              {isLoading ? (
                <>
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    style={{
                      display: 'block',
                      width: '14px',
                      height: '14px',
                      border: '2px solid #00A88E',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                    }}
                  />
                  Connexion en cours...
                </>
              ) : (
                <>
                  Se connecter
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M3 8h10M9 4l4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </>
              )}
            </motion.button>
          </form>

          {/* Contact admin for access */}
          <div
            style={{
              marginTop: '32px',
              padding: '12px 16px',
              background: 'var(--bg-raised)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--text-tertiary)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginBottom: '6px',
              }}
            >
              Acces demo
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontFamily: 'monospace', margin: 0 }}>
              admin@fsn.fr
              <span style={{ color: 'var(--border)', margin: '0 6px' }}>/</span>
              Admin2026!
            </p>
          </div>

          {/* Footer */}
          <p
            style={{
              marginTop: '40px',
              fontSize: '11px',
              color: 'var(--text-muted)',
              textAlign: 'center',
            }}
          >
            &copy; 2026 Filiere Sante Numerique. Acces reserve aux membres.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
