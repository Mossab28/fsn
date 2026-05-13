'use client'

import { useSession, signOut } from 'next-auth/react'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Lock,
  Mail,
  Sun,
  Moon,
  Globe,
  Trash2,
  Save,
  AlertTriangle,
  Check,
  X,
  Eye,
  EyeOff,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { useTheme } from '@/lib/theme-context'
import { useLang, type Lang } from '@/lib/lang-context'

type MessageState = { type: 'success' | 'error'; text: string } | null

const SECTION_STYLE: React.CSSProperties = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
}

const TITLE_STYLE: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '15px',
  fontWeight: 600,
  color: 'var(--text-primary)',
  letterSpacing: '-0.01em',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
}

const LABEL_STYLE: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
}

const INPUT_STYLE: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-body)',
  fontSize: '13px',
  outline: 'none',
  transition: 'border-color 0.15s',
  width: '100%',
}

export default function ParametresPage() {
  const { data: session, update: updateSession } = useSession()
  const { theme, toggleTheme } = useTheme()
  const { lang, setLang } = useLang()

  const [email, setEmail] = useState('')
  const [originalEmail, setOriginalEmail] = useState('')
  const [savingEmail, setSavingEmail] = useState(false)

  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [savingPwd, setSavingPwd] = useState(false)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [message, setMessage] = useState<MessageState>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/users/me')
      if (!res.ok) throw new Error('Erreur de chargement')
      const data = await res.json()
      setEmail(data.email)
      setOriginalEmail(data.email)
    } catch {
      setMessage({ type: 'error', text: 'Impossible de charger les paramètres' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const handleEmailSave = async () => {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setMessage({ type: 'error', text: 'Adresse email invalide' })
      return
    }
    setSavingEmail(true)
    setMessage(null)
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur de mise à jour')
      }
      const updated = await res.json()
      setEmail(updated.email)
      setOriginalEmail(updated.email)
      await updateSession({ email: updated.email })
      setMessage({ type: 'success', text: 'Email mis à jour avec succès' })
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erreur inconnue' })
    } finally {
      setSavingEmail(false)
    }
  }

  const handlePasswordSave = async () => {
    if (!currentPwd) {
      setMessage({ type: 'error', text: 'Mot de passe actuel requis' })
      return
    }
    if (newPwd.length < 8) {
      setMessage({ type: 'error', text: 'Le nouveau mot de passe doit contenir au moins 8 caractères' })
      return
    }
    if (newPwd !== confirmPwd) {
      setMessage({ type: 'error', text: 'Les mots de passe ne correspondent pas' })
      return
    }
    setSavingPwd(true)
    setMessage(null)
    try {
      const res = await fetch('/api/users/me/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur de changement de mot de passe')
      }
      setCurrentPwd('')
      setNewPwd('')
      setConfirmPwd('')
      setMessage({ type: 'success', text: 'Mot de passe modifié avec succès' })
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erreur inconnue' })
    } finally {
      setSavingPwd(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch('/api/users/me', { method: 'DELETE' })
      if (!res.ok) throw new Error('Erreur de suppression')
      await signOut({ callbackUrl: '/login' })
    } catch {
      setMessage({ type: 'error', text: 'Erreur lors de la suppression du compte' })
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const emailChanged = email.trim().toLowerCase() !== originalEmail.toLowerCase()
  const pwdReady = currentPwd && newPwd.length >= 8 && newPwd === confirmPwd

  if (!session || loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
        Chargement...
      </div>
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title="Paramètres"
        description="Gérez votre compte, vos préférences et la sécurité"
      />

      <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>
        <div style={{ maxWidth: '720px', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          <AnimatePresence>
            {message && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  fontFamily: 'var(--font-body)',
                  background: message.type === 'success' ? 'rgba(0, 168, 142, 0.1)' : 'var(--red-dim)',
                  color: message.type === 'success' ? 'var(--accent)' : 'var(--red)',
                  border: `1px solid ${message.type === 'success' ? 'rgba(0, 168, 142, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                }}
              >
                {message.type === 'success' ? <Check size={14} /> : <AlertTriangle size={14} />}
                {message.text}
                <button
                  onClick={() => setMessage(null)}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '2px', display: 'flex' }}
                >
                  <X size={14} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Email */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} style={SECTION_STYLE}>
            <div style={TITLE_STYLE}><Mail size={15} /> Adresse email</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={LABEL_STYLE}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={INPUT_STYLE}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="primary" icon={<Save size={14} />} onClick={handleEmailSave} loading={savingEmail} disabled={!emailChanged}>
                Mettre à jour
              </Button>
            </div>
          </motion.div>

          {/* Password */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }} style={SECTION_STYLE}>
            <div style={TITLE_STYLE}><Lock size={15} /> Mot de passe</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={LABEL_STYLE}>Mot de passe actuel</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                  style={{ ...INPUT_STYLE, paddingRight: '36px' }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex' }}
                  aria-label={showCurrent ? 'Masquer' : 'Afficher'}
                >
                  {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={LABEL_STYLE}>Nouveau mot de passe (min. 8 caractères)</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  style={{ ...INPUT_STYLE, paddingRight: '36px' }}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex' }}
                  aria-label={showNew ? 'Masquer' : 'Afficher'}
                >
                  {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={LABEL_STYLE}>Confirmer le nouveau mot de passe</label>
              <input
                type={showNew ? 'text' : 'password'}
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                style={INPUT_STYLE}
                autoComplete="new-password"
              />
              {confirmPwd && newPwd !== confirmPwd && (
                <span style={{ fontSize: '11px', color: 'var(--red)', fontFamily: 'var(--font-body)' }}>
                  Les mots de passe ne correspondent pas
                </span>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="primary" icon={<Save size={14} />} onClick={handlePasswordSave} loading={savingPwd} disabled={!pwdReady}>
                Modifier le mot de passe
              </Button>
            </div>
          </motion.div>

          {/* Theme */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }} style={SECTION_STYLE}>
            <div style={TITLE_STYLE}>{theme === 'dark' ? <Moon size={15} /> : <Sun size={15} />} Apparence</div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
              Choisissez le thème clair ou sombre pour l&apos;interface.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              {(['light', 'dark'] as const).map((t) => {
                const active = theme === t
                return (
                  <button
                    key={t}
                    onClick={() => { if (theme !== t) toggleTheme() }}
                    style={{
                      flex: 1,
                      padding: '14px 16px',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                      background: active ? 'rgba(0, 168, 142, 0.06)' : 'var(--bg)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      transition: 'all 0.15s',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    {t === 'light' ? <Sun size={16} color={active ? 'var(--accent)' : 'var(--text-secondary)'} /> : <Moon size={16} color={active ? 'var(--accent)' : 'var(--text-secondary)'} />}
                    <span style={{ fontSize: '13px', fontWeight: 600, color: active ? 'var(--accent)' : 'var(--text-primary)' }}>
                      {t === 'light' ? 'Clair' : 'Sombre'}
                    </span>
                  </button>
                )
              })}
            </div>
          </motion.div>

          {/* Language */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.15 }} style={SECTION_STYLE}>
            <div style={TITLE_STYLE}><Globe size={15} /> Langue</div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
              Langue de l&apos;interface. L&apos;anglais sera progressivement déployé.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              {(['fr', 'en'] as Lang[]).map((l) => {
                const active = lang === l
                return (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    style={{
                      flex: 1,
                      padding: '14px 16px',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                      background: active ? 'rgba(0, 168, 142, 0.06)' : 'var(--bg)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'all 0.15s',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    <span style={{ fontSize: '18px' }}>{l === 'fr' ? '🇫🇷' : '🇬🇧'}</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: active ? 'var(--accent)' : 'var(--text-primary)' }}>
                      {l === 'fr' ? 'Français' : 'English'}
                    </span>
                  </button>
                )
              })}
            </div>
          </motion.div>

          {/* Danger zone */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            style={{ ...SECTION_STYLE, border: '1px solid rgba(239, 68, 68, 0.2)' }}
          >
            <div style={{ ...TITLE_STYLE, color: 'var(--red)' }}>
              <AlertTriangle size={15} /> Zone de danger
            </div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              La suppression de votre compte est irréversible. Toutes vos contributions et logs seront supprimés,
              et vos documents seront réassignés à un administrateur.
            </p>
            {!showDeleteConfirm ? (
              <div>
                <Button variant="danger" icon={<Trash2 size={14} />} onClick={() => setShowDeleteConfirm(true)}>
                  Supprimer mon compte
                </Button>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--red-dim)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: 'var(--red)' }}>
                  <AlertTriangle size={16} /> Êtes-vous sûr de vouloir supprimer votre compte ?
                </div>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  Cette action est définitive. Vous serez immédiatement déconnecté.
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    variant="danger"
                    size="sm"
                    icon={<Trash2 size={13} />}
                    onClick={handleDelete}
                    loading={deleting}
                  >
                    Confirmer la suppression
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
                    Annuler
                  </Button>
                </div>
              </motion.div>
            )}
          </motion.div>

        </div>
      </div>
    </div>
  )
}
