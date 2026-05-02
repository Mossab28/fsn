'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import * as Tabs from '@radix-ui/react-tabs'
import {
  Users,
  FolderOpen,
  FileText,
  UserPlus,
  Plus,
  Trash2,
  Edit3,
  Shield,
  ShieldCheck,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  X,
  Activity,
  LogIn,
  Upload,
  Download,
  UserMinus,
  FilePlus,
  FileX,
  FilePenLine,
  FolderPlus,
  UsersRound,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { Avatar } from '@/components/ui/Avatar'
import { formatBytes, formatDate } from '@/lib/utils'
import type { DocumentWithRelations, Category, UserGroup } from '@/types'
import type { SafeUser } from '@/types'

interface CategoryWithCount extends Category {
  documentCount: number
}

interface UserGroupWithCount extends UserGroup {
  _count: { users: number }
}

// ─── Modal wrapper ───────────────────────────────────────────────────────────

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          zIndex: 50,
        }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: '28px',
          width: '100%',
          maxWidth: '460px',
          zIndex: 51,
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {children}
      </motion.div>
    </>
  )
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
        {title}
      </h3>
      <motion.button
        onClick={onClose}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '30px', height: '30px', borderRadius: 'var(--radius-md)',
          background: 'var(--bg-raised)', border: '1px solid var(--border)',
          color: 'var(--text-secondary)', cursor: 'pointer',
        }}
      >
        <X size={14} />
      </motion.button>
    </div>
  )
}

// ─── Users tab ───────────────────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers] = useState<SafeUser[]>([])
  const [groups, setGroups] = useState<UserGroupWithCount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editUser, setEditUser] = useState<SafeUser | null>(null)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Add user form
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER')

  // Edit form
  const [editRole, setEditRole] = useState<'ADMIN' | 'MEMBER' | 'READER'>('MEMBER')
  const [editGroupId, setEditGroupId] = useState<string>('')

  const loadUsers = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      if (!res.ok) throw new Error('Failed to load users')
      const data: SafeUser[] = await res.json()
      setUsers(data)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadGroups = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/groups')
      if (!res.ok) return
      const data: UserGroupWithCount[] = await res.json()
      setGroups(data)
    } catch (err) {
      console.error(err)
    }
  }, [])

  useEffect(() => { loadUsers(); loadGroups() }, [loadUsers, loadGroups])

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitError('')
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, email: newEmail, password: newPassword, role: newRole }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Erreur lors de la création')
      }
      setSubmitSuccess("Utilisateur créé avec succès")
      setShowAddModal(false)
      setNewName(''); setNewEmail(''); setNewPassword(''); setNewRole('MEMBER')
      loadUsers()
    } catch (err) {
      setSubmitError((err as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editUser) return
    setIsSubmitting(true)
    setSubmitError('')
    try {
      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: editRole, groupId: editGroupId || null }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Erreur lors de la modification')
      }
      setEditUser(null)
      loadUsers()
    } catch (err) {
      setSubmitError((err as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Supprimer cet utilisateur ?')) return
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Échec de la suppression')
      loadUsers()
    } catch (err) {
      console.error(err)
    }
  }

  const selectStyle: React.CSSProperties = {
    padding: '9px 12px',
    background: 'var(--bg-raised)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)',
    fontSize: '14px',
    outline: 'none',
    width: '100%',
    cursor: 'pointer',
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
          {users.length} utilisateur{users.length !== 1 ? 's' : ''}
        </p>
        <Button variant="primary" size="sm" icon={<UserPlus size={14} />} onClick={() => setShowAddModal(true)}>
          Ajouter un utilisateur
        </Button>
      </div>

      <AnimatePresence>
        {submitSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 14px', marginBottom: '16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', color: '#22C55E',
              fontSize: '13px',
            }}
          >
            <CheckCircle2 size={15} />
            {submitSuccess}
            <button onClick={() => setSubmitSuccess('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#22C55E' }}>
              <X size={13} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <Spinner size="lg" />
        </div>
      ) : (
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Utilisateur', 'Email', 'Rôle', 'Membre depuis', 'Actions'].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontFamily: 'var(--font-body)',
                      fontSize: '11px',
                      fontWeight: 600,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user, i) => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  style={{
                    borderBottom: i < users.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    transition: 'background var(--transition)',
                  }}
                >
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Avatar name={user.name} size="sm" />
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                        {user.name}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {user.email}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <Badge variant={user.role === 'ADMIN' ? 'amber' : 'default'}>
                      {user.role === 'ADMIN' ? (
                        <><ShieldCheck size={10} style={{ display: 'inline', marginRight: '3px' }} />Admin</>
                      ) : (
                        <><Shield size={10} style={{ display: 'inline', marginRight: '3px' }} />Membre</>
                      )}
                    </Badge>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                      {formatDate(user.createdAt)}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Edit3 size={13} />}
                        onClick={() => { setEditUser(user); setEditRole(user.role); setEditGroupId(user.groupId ?? ''); setSubmitError('') }}
                      />
                      <Button
                        variant="danger"
                        size="sm"
                        icon={<Trash2 size={13} />}
                        onClick={() => handleDeleteUser(user.id)}
                      />
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add user modal */}
      <AnimatePresence>
        {showAddModal && (
          <ModalOverlay onClose={() => { setShowAddModal(false); setSubmitError('') }}>
            <ModalHeader title="Ajouter un utilisateur" onClose={() => { setShowAddModal(false); setSubmitError('') }} />
            <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <Input label="Nom complet" value={newName} onChange={(e) => setNewName(e.target.value)} required />
              <Input label="Adresse email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
              <Input label="Mot de passe" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                  Rôle
                </label>
                <select value={newRole} onChange={(e) => setNewRole(e.target.value as 'ADMIN' | 'MEMBER')} style={selectStyle}>
                  <option value="MEMBER">Membre</option>
                  <option value="ADMIN">Administrateur</option>
                </select>
              </div>
              {submitError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--red)', fontSize: '13px' }}>
                  <AlertCircle size={14} />{submitError}
                </div>
              )}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>Annuler</Button>
                <Button type="submit" variant="primary" loading={isSubmitting} icon={!isSubmitting ? <UserPlus size={14} /> : undefined}>
                  {isSubmitting ? 'Création...' : 'Créer'}
                </Button>
              </div>
            </form>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* Edit role modal */}
      <AnimatePresence>
        {editUser && (
          <ModalOverlay onClose={() => { setEditUser(null); setSubmitError('') }}>
            <ModalHeader title="Modifier le rôle" onClose={() => { setEditUser(null); setSubmitError('') }} />
            <form onSubmit={handleEditRole} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--bg-raised)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <Avatar name={editUser.name} size="md" />
                <div>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{editUser.name}</p>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>{editUser.email}</p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                  Rôle
                </label>
                <select value={editRole} onChange={(e) => setEditRole(e.target.value as 'ADMIN' | 'MEMBER' | 'READER')} style={selectStyle}>
                  <option value="MEMBER">Membre</option>
                  <option value="ADMIN">Administrateur</option>
                  <option value="READER">Lecteur</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                  Groupe
                </label>
                <select value={editGroupId} onChange={(e) => setEditGroupId(e.target.value)} style={selectStyle}>
                  <option value="">Aucun groupe</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              {submitError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--red)', fontSize: '13px' }}>
                  <AlertCircle size={14} />{submitError}
                </div>
              )}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <Button type="button" variant="secondary" onClick={() => setEditUser(null)}>Annuler</Button>
                <Button type="submit" variant="primary" loading={isSubmitting}>
                  {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </form>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Categories tab ───────────────────────────────────────────────────────────

function CategoriesTab() {
  const [categories, setCategories] = useState<CategoryWithCount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newColor, setNewColor] = useState('#00C9A7')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const loadCategories = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/categories')
      if (!res.ok) throw new Error('Failed')
      const data: CategoryWithCount[] = await res.json()
      setCategories(data)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadCategories() }, [loadCategories])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitError('')
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, description: newDescription, color: newColor }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Erreur')
      }
      setShowAddModal(false)
      setNewName(''); setNewDescription(''); setNewColor('#00C9A7')
      loadCategories()
    } catch (err) {
      setSubmitError((err as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
          {categories.length} catégorie{categories.length !== 1 ? 's' : ''}
        </p>
        <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setShowAddModal(true)}>
          Ajouter une catégorie
        </Button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <Spinner size="lg" />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {categories.map((cat, i) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '14px 18px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              <div
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: cat.color ?? 'var(--accent)',
                  flexShrink: 0,
                  boxShadow: `0 0 8px ${cat.color ?? 'var(--accent)'}60`,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  {cat.name}
                </p>
                {cat.description && (
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {cat.description}
                  </p>
                )}
              </div>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                {cat.documentCount} doc{cat.documentCount !== 1 ? 's' : ''}
              </span>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  color: 'var(--text-tertiary)',
                  padding: '2px 8px',
                  background: 'var(--bg-raised)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                }}
              >
                /{cat.slug}
              </span>
            </motion.div>
          ))}

          {categories.length === 0 && (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '14px' }}>
              Aucune catégorie pour l&apos;instant
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {showAddModal && (
          <ModalOverlay onClose={() => { setShowAddModal(false); setSubmitError('') }}>
            <ModalHeader title="Nouvelle catégorie" onClose={() => { setShowAddModal(false); setSubmitError('') }} />
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <Input label="Nom de la catégorie" value={newName} onChange={(e) => setNewName(e.target.value)} required />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                  Description
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={2}
                  className="input-base"
                  style={{
                    padding: '9px 12px', resize: 'vertical',
                    fontFamily: 'var(--font-body)', fontSize: '14px',
                    color: 'var(--text-primary)', background: 'var(--bg-raised)',
                    border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                    outline: 'none', lineHeight: 1.5, width: '100%',
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                  Couleur
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="color"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    style={{ width: '40px', height: '36px', border: 'none', cursor: 'pointer', background: 'transparent', borderRadius: '8px' }}
                  />
                  <span style={{ fontFamily: 'monospace', fontSize: '13px', color: 'var(--text-secondary)' }}>{newColor}</span>
                </div>
              </div>
              {submitError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--red)', fontSize: '13px' }}>
                  <AlertCircle size={14} />{submitError}
                </div>
              )}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>Annuler</Button>
                <Button type="submit" variant="primary" loading={isSubmitting} icon={!isSubmitting ? <Plus size={14} /> : undefined}>
                  {isSubmitting ? 'Création...' : 'Créer la catégorie'}
                </Button>
              </div>
            </form>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Documents tab ────────────────────────────────────────────────────────────

function DocumentsAdminTab() {
  const [documents, setDocuments] = useState<DocumentWithRelations[]>([])
  const [total, setTotal] = useState(0)
  const [totalSize, setTotalSize] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/documents?pageSize=50&sortBy=createdAt&sortOrder=desc')
      .then((r) => r.json())
      .then((data: { data: DocumentWithRelations[]; total: number }) => {
        setDocuments(data.data)
        setTotal(data.total)
        setTotalSize(data.data.reduce((acc, d) => acc + d.fileSize, 0))
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <div>
      {/* Stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
        {[
          { label: 'Documents totaux', value: String(total), icon: <FileText size={18} />, color: 'var(--accent)' },
          { label: 'Stockage utilisé', value: formatBytes(totalSize), icon: <HardDrive size={18} />, color: 'var(--amber)' },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '18px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-raised)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: stat.color,
              }}
            >
              {stat.icon}
            </div>
            <div>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                {stat.value}
              </p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                {stat.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <Spinner size="lg" />
        </div>
      ) : (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Titre', 'Catégorie', 'Mis en ligne par', 'Taille', 'Date'].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {documents.map((doc, i) => (
                <motion.tr
                  key={doc.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.025 }}
                  style={{ borderBottom: i < documents.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
                >
                  <td style={{ padding: '12px 16px', maxWidth: '240px' }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                      {doc.title}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {doc.category ? (
                      <Badge variant="accent">{doc.category.name}</Badge>
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {doc.uploader.name}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {formatBytes(doc.fileSize)}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                      {formatDate(doc.createdAt)}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {total > 50 && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                Affichage des 50 documents les plus récents sur {total}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Activity Logs tab ────────────────────────────────────────────────────────

interface ActivityLogEntry {
  id: string
  userId: string
  action: string
  entityType: string
  entityId: string | null
  entityName: string | null
  metadata: Record<string, unknown> | null
  ipAddress: string | null
  createdAt: string
  user: { id: string; name: string; email: string; role: string }
}

const ACTION_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  LOGIN: { label: 'Connexion', icon: <LogIn size={14} />, color: 'var(--accent)' },
  LOGOUT: { label: 'Déconnexion', icon: <LogIn size={14} />, color: 'var(--text-tertiary)' },
  DOCUMENT_UPLOAD: { label: 'Upload', icon: <Upload size={14} />, color: '#3B82F6' },
  DOCUMENT_DOWNLOAD: { label: 'Téléchargement', icon: <Download size={14} />, color: '#8B5CF6' },
  DOCUMENT_DELETE: { label: 'Suppression doc.', icon: <FileX size={14} />, color: 'var(--red)' },
  DOCUMENT_UPDATE: { label: 'Modification doc.', icon: <FilePenLine size={14} />, color: 'var(--amber)' },
  USER_CREATE: { label: 'Création utilisateur', icon: <UserPlus size={14} />, color: 'var(--accent)' },
  USER_UPDATE: { label: 'Modification utilisateur', icon: <Edit3 size={14} />, color: 'var(--amber)' },
  USER_DELETE: { label: 'Suppression utilisateur', icon: <UserMinus size={14} />, color: 'var(--red)' },
  CATEGORY_CREATE: { label: 'Création catégorie', icon: <FolderPlus size={14} />, color: '#3B82F6' },
  CATEGORY_DELETE: { label: 'Suppression catégorie', icon: <Trash2 size={14} />, color: 'var(--red)' },
}

function ActivityLogsTab() {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filterAction, setFilterAction] = useState('')
  const [filterUser, setFilterUser] = useState('')
  const [allUsers, setAllUsers] = useState<SafeUser[]>([])

  const loadLogs = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '30' })
      if (filterAction) params.set('action', filterAction)
      if (filterUser) params.set('userId', filterUser)
      const res = await fetch(`/api/admin/logs?${params}`)
      if (!res.ok) throw new Error('Failed to load logs')
      const data = await res.json()
      setLogs(data.data)
      setTotal(data.total)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [page, filterAction, filterUser])

  useEffect(() => { loadLogs() }, [loadLogs])

  useEffect(() => {
    fetch('/api/admin/users')
      .then(r => r.json())
      .then((data: SafeUser[]) => setAllUsers(data))
      .catch(console.error)
  }, [])

  const selectStyle: React.CSSProperties = {
    padding: '7px 12px',
    background: 'var(--bg-raised)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)',
    fontSize: '13px',
    outline: 'none',
    cursor: 'pointer',
  }

  function timeAgo(dateStr: string) {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
    if (seconds < 60) return 'À l\'instant'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `Il y a ${minutes} min`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `Il y a ${hours}h`
    const days = Math.floor(hours / 24)
    if (days < 7) return `Il y a ${days}j`
    return formatDate(dateStr)
  }

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
        <select
          value={filterAction}
          onChange={(e) => { setFilterAction(e.target.value); setPage(1) }}
          style={selectStyle}
        >
          <option value="">Toutes les actions</option>
          {Object.entries(ACTION_CONFIG).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>

        <select
          value={filterUser}
          onChange={(e) => { setFilterUser(e.target.value); setPage(1) }}
          style={selectStyle}
        >
          <option value="">Tous les utilisateurs</option>
          {allUsers.map(u => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>

        <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-tertiary)' }}>
          {total} entrée{total !== 1 ? 's' : ''}
        </span>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <Spinner size="lg" />
        </div>
      ) : logs.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '14px' }}>
          Aucune activité enregistrée
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {logs.map((log, i) => {
            const config = ACTION_CONFIG[log.action] ?? { label: log.action, icon: <Activity size={14} />, color: 'var(--text-secondary)' }
            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '12px 16px',
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {/* Action icon */}
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-sm)',
                    background: `${config.color}18`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: config.color,
                    flexShrink: 0,
                  }}
                >
                  {config.icon}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {log.user.name}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                      {config.label}
                    </span>
                    {log.entityName && (
                      <span style={{
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                        padding: '1px 8px',
                        background: 'var(--bg-raised)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)',
                        maxWidth: '200px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {log.entityName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Time */}
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {timeAgo(log.createdAt)}
                </span>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {total > 30 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            Précédent
          </Button>
          <span style={{ display: 'flex', alignItems: 'center', fontSize: '13px', color: 'var(--text-secondary)', padding: '0 12px' }}>
            Page {page} / {Math.ceil(total / 30)}
          </span>
          <Button variant="secondary" size="sm" disabled={page >= Math.ceil(total / 30)} onClick={() => setPage(p => p + 1)}>
            Suivant
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── Groups tab ──────────────────────────────────────────────────────────────

function GroupsTab() {
  const [groups, setGroups] = useState<UserGroupWithCount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editGroup, setEditGroup] = useState<UserGroupWithCount | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Form fields
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formColor, setFormColor] = useState('#00C9A7')

  const loadGroups = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/groups')
      if (!res.ok) throw new Error('Failed')
      const data: UserGroupWithCount[] = await res.json()
      setGroups(data)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadGroups() }, [loadGroups])

  const resetForm = () => {
    setFormName('')
    setFormDescription('')
    setFormColor('#00C9A7')
    setSubmitError('')
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitError('')
    try {
      const res = await fetch('/api/admin/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName, description: formDescription, color: formColor }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Erreur')
      }
      setShowAddModal(false)
      resetForm()
      loadGroups()
    } catch (err) {
      setSubmitError((err as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editGroup) return
    setIsSubmitting(true)
    setSubmitError('')
    try {
      const res = await fetch(`/api/admin/groups/${editGroup.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName, description: formDescription, color: formColor }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Erreur')
      }
      setEditGroup(null)
      resetForm()
      loadGroups()
    } catch (err) {
      setSubmitError((err as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (groupId: string) => {
    if (!confirm('Supprimer ce groupe ? Les utilisateurs seront désassignés.')) return
    try {
      const res = await fetch(`/api/admin/groups/${groupId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Échec de la suppression')
      loadGroups()
    } catch (err) {
      console.error(err)
    }
  }

  const openEditModal = (group: UserGroupWithCount) => {
    setEditGroup(group)
    setFormName(group.name)
    setFormDescription(group.description ?? '')
    setFormColor(group.color ?? '#00C9A7')
    setSubmitError('')
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
          {groups.length} groupe{groups.length !== 1 ? 's' : ''}
        </p>
        <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => { resetForm(); setShowAddModal(true) }}>
          Créer un groupe
        </Button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <Spinner size="lg" />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {groups.map((group, i) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '14px 18px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              <div
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: group.color ?? 'var(--accent)',
                  flexShrink: 0,
                  boxShadow: `0 0 8px ${group.color ?? 'var(--accent)'}60`,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  {group.name}
                </p>
                {group.description && (
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {group.description}
                  </p>
                )}
              </div>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                {group._count.users} membre{group._count.users !== 1 ? 's' : ''}
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Edit3 size={13} />}
                  onClick={() => openEditModal(group)}
                />
                <Button
                  variant="danger"
                  size="sm"
                  icon={<Trash2 size={13} />}
                  onClick={() => handleDelete(group.id)}
                />
              </div>
            </motion.div>
          ))}

          {groups.length === 0 && (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '14px' }}>
              Aucun groupe pour l&apos;instant
            </div>
          )}
        </div>
      )}

      {/* Create group modal */}
      <AnimatePresence>
        {showAddModal && (
          <ModalOverlay onClose={() => { setShowAddModal(false); setSubmitError('') }}>
            <ModalHeader title="Nouveau groupe" onClose={() => { setShowAddModal(false); setSubmitError('') }} />
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <Input label="Nom du groupe" value={formName} onChange={(e) => setFormName(e.target.value)} required />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                  Description
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  style={{
                    padding: '9px 12px', resize: 'vertical',
                    fontFamily: 'var(--font-body)', fontSize: '14px',
                    color: 'var(--text-primary)', background: 'var(--bg-raised)',
                    border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                    outline: 'none', lineHeight: 1.5, width: '100%',
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                  Couleur
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="color"
                    value={formColor}
                    onChange={(e) => setFormColor(e.target.value)}
                    style={{ width: '40px', height: '36px', border: 'none', cursor: 'pointer', background: 'transparent', borderRadius: '8px' }}
                  />
                  <span style={{ fontFamily: 'monospace', fontSize: '13px', color: 'var(--text-secondary)' }}>{formColor}</span>
                </div>
              </div>
              {submitError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--red)', fontSize: '13px' }}>
                  <AlertCircle size={14} />{submitError}
                </div>
              )}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>Annuler</Button>
                <Button type="submit" variant="primary" loading={isSubmitting} icon={!isSubmitting ? <Plus size={14} /> : undefined}>
                  {isSubmitting ? 'Création...' : 'Créer le groupe'}
                </Button>
              </div>
            </form>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* Edit group modal */}
      <AnimatePresence>
        {editGroup && (
          <ModalOverlay onClose={() => { setEditGroup(null); setSubmitError('') }}>
            <ModalHeader title="Modifier le groupe" onClose={() => { setEditGroup(null); setSubmitError('') }} />
            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <Input label="Nom du groupe" value={formName} onChange={(e) => setFormName(e.target.value)} required />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                  Description
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  style={{
                    padding: '9px 12px', resize: 'vertical',
                    fontFamily: 'var(--font-body)', fontSize: '14px',
                    color: 'var(--text-primary)', background: 'var(--bg-raised)',
                    border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                    outline: 'none', lineHeight: 1.5, width: '100%',
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                  Couleur
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="color"
                    value={formColor}
                    onChange={(e) => setFormColor(e.target.value)}
                    style={{ width: '40px', height: '36px', border: 'none', cursor: 'pointer', background: 'transparent', borderRadius: '8px' }}
                  />
                  <span style={{ fontFamily: 'monospace', fontSize: '13px', color: 'var(--text-secondary)' }}>{formColor}</span>
                </div>
              </div>
              {submitError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--red)', fontSize: '13px' }}>
                  <AlertCircle size={14} />{submitError}
                </div>
              )}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <Button type="button" variant="secondary" onClick={() => setEditGroup(null)}>Annuler</Button>
                <Button type="submit" variant="primary" loading={isSubmitting}>
                  {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </form>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Main admin page ───────────────────────────────────────────────────────────

const TABS = [
  { id: 'users', label: 'Utilisateurs', icon: <Users size={16} /> },
  { id: 'groups', label: 'Groupes', icon: <UsersRound size={16} /> },
  { id: 'categories', label: 'Catégories', icon: <FolderOpen size={16} /> },
  { id: 'documents', label: 'Documents', icon: <FileText size={16} /> },
  { id: 'logs', label: 'Journal', icon: <Activity size={16} /> },
]

export default function AdminPage() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}>
        <Spinner size="lg" />
      </div>
    )
  }

  if (!session || session.user.role !== 'ADMIN') {
    redirect('/documents')
  }

  return (
    <>
      <PageHeader
        title="Administration"
        description="Gestion des utilisateurs, catégories et documents"
      />


      <Tabs.Root defaultValue="users" style={{ marginTop: '24px' }}>
        {/* Tab list */}
        <Tabs.List
          style={{
            display: 'flex',
            gap: '4px',
            padding: '4px',
            background: 'var(--bg-raised)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            marginBottom: '28px',
            width: 'fit-content',
          }}
          aria-label="Sections d'administration"
        >
          {TABS.map((tab) => (
            <Tabs.Trigger
              key={tab.id}
              value={tab.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                borderRadius: 'var(--radius-md)',
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-secondary)',
                transition: 'all var(--transition)',
              }}
              className="admin-tab-trigger"
            >
              {tab.icon}
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <style>{`
          .admin-tab-trigger[data-state="active"] {
            background: var(--bg-surface) !important;
            color: var(--text-primary) !important;
            box-shadow: var(--shadow-sm);
            border: 1px solid var(--border) !important;
          }
          .admin-tab-trigger:hover:not([data-state="active"]) {
            color: var(--text-primary) !important;
            background: var(--bg-overlay) !important;
          }
        `}</style>

        <Tabs.Content value="users" style={{ outline: 'none' }}>
          <UsersTab />
        </Tabs.Content>
        <Tabs.Content value="groups" style={{ outline: 'none' }}>
          <GroupsTab />
        </Tabs.Content>
        <Tabs.Content value="categories" style={{ outline: 'none' }}>
          <CategoriesTab />
        </Tabs.Content>
        <Tabs.Content value="documents" style={{ outline: 'none' }}>
          <DocumentsAdminTab />
        </Tabs.Content>
        <Tabs.Content value="logs" style={{ outline: 'none' }}>
          <ActivityLogsTab />
        </Tabs.Content>
      </Tabs.Root>
    </>
  )
}
