'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Mail, Shield, Users, Calendar, Download, Save, AlertTriangle, Check, X } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'

interface UserProfile {
  id: string
  name: string
  email: string
  role: string
  groupId: string | null
  createdAt: string
  group: { id: string; name: string; color: string | null } | null
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrateur',
  MEMBER: 'Membre',
  READER: 'Lecteur',
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'var(--accent)',
  MEMBER: 'var(--text-secondary)',
  READER: 'var(--text-tertiary)',
}

export default function ProfilPage() {
  const { data: session, update: updateSession } = useSession()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/users/me')
      if (!res.ok) throw new Error('Erreur de chargement')
      const data = await res.json()
      setProfile(data)
      setName(data.name)
    } catch {
      setMessage({ type: 'error', text: 'Impossible de charger le profil' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const handleSave = async () => {
    if (!name.trim()) {
      setMessage({ type: 'error', text: 'Le nom est requis' })
      return
    }

    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur de mise à jour')
      }

      const updated = await res.json()
      setProfile(updated)
      setName(updated.name)
      setMessage({ type: 'success', text: 'Profil mis à jour avec succès' })

      await updateSession({ name: updated.name })
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erreur inconnue' })
    } finally {
      setSaving(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch('/api/users/me/export')
      if (!res.ok) throw new Error('Erreur d\'export')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `export-donnees-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setMessage({ type: 'success', text: 'Donnees exportees avec succes' })
    } catch {
      setMessage({ type: 'error', text: 'Erreur lors de l\'export des donnees' })
    } finally {
      setExporting(false)
    }
  }

  const hasChanges = profile && name !== profile.name

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
        Chargement...
      </div>
    )
  }

  if (!profile) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
        Impossible de charger le profil
      </div>
    )
  }

  const memberSince = new Date(profile.createdAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title="Mon profil"
        description="Gerez vos informations personnelles et vos donnees"
      />

      <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>
        <div style={{ maxWidth: '100%', width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Message banner */}
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
                  style={{
                    marginLeft: 'auto',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'inherit',
                    padding: '2px',
                    display: 'flex',
                  }}
                >
                  <X size={14} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Profile form card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: '15px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              letterSpacing: '-0.01em',
            }}>
              Informations personnelles
            </div>

            {/* Name field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{
                fontFamily: 'var(--font-body)',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <User size={13} />
                Nom
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-body)',
                  fontSize: '13px',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
              />
            </div>

            {/* Email field (read-only — managed in Paramètres) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{
                fontFamily: 'var(--font-body)',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <Mail size={13} />
                Email
              </label>
              <div style={{
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                color: 'var(--text-primary)',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
              }}>
                {profile.email}
              </div>
            </div>

            {/* Role (read-only) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{
                fontFamily: 'var(--font-body)',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <Shield size={13} />
                Role
              </label>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '9999px',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                width: 'fit-content',
              }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: ROLE_COLORS[profile.role] ?? 'var(--text-tertiary)',
                }} />
                <span style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: ROLE_COLORS[profile.role] ?? 'var(--text-secondary)',
                }}>
                  {ROLE_LABELS[profile.role] ?? profile.role}
                </span>
              </div>
            </div>

            {/* Group (read-only) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{
                fontFamily: 'var(--font-body)',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <Users size={13} />
                Groupe
              </label>
              <div style={{
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                color: profile.group ? 'var(--text-primary)' : 'var(--text-tertiary)',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
              }}>
                {profile.group?.name ?? 'Aucun groupe'}
              </div>
            </div>

            {/* Member since (read-only) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{
                fontFamily: 'var(--font-body)',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <Calendar size={13} />
                Membre depuis
              </label>
              <div style={{
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                color: 'var(--text-primary)',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
              }}>
                {memberSince}
              </div>
            </div>

            {/* Save button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px' }}>
              <Button
                variant="primary"
                icon={<Save size={14} />}
                onClick={handleSave}
                loading={saving}
                disabled={!hasChanges}
              >
                Enregistrer
              </Button>
            </div>
          </motion.div>

          {/* RGPD section */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: '15px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              letterSpacing: '-0.01em',
            }}>
              Donnees personnelles (RGPD)
            </div>

            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              margin: 0,
            }}>
              Conformement au RGPD, vous avez le droit d&apos;exporter l&apos;ensemble de vos donnees personnelles
              ou de supprimer votre compte.
            </p>

            {/* Export button */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Button
                variant="secondary"
                icon={<Download size={14} />}
                onClick={handleExport}
                loading={exporting}
              >
                Exporter mes donnees
              </Button>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  )
}
