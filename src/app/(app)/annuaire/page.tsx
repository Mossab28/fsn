'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { motion } from 'framer-motion'
import { Search, Users, Filter } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { Avatar } from '@/components/ui/Avatar'

interface DirectoryUser {
  id: string
  name: string
  email: string
  role: string
  groupId: string | null
  createdAt: string
  group: { id: string; name: string; color: string | null } | null
}

interface DirectoryResponse {
  users: DirectoryUser[]
  grouped: Record<string, DirectoryUser[]>
  ungrouped: DirectoryUser[]
  total: number
}

const ROLE_CONFIG: Record<string, { label: string; variant: 'amber' | 'blue' | 'default' }> = {
  ADMIN: { label: 'Admin', variant: 'amber' },
  MEMBER: { label: 'Membre', variant: 'blue' },
  READER: { label: 'Lecteur', variant: 'default' },
}

export default function AnnuairePage() {
  const { data: session, status } = useSession()
  const [users, setUsers] = useState<DirectoryUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<string>('')
  const [groups, setGroups] = useState<{ id: string; name: string; color: string | null }[]>([])

  const loadDirectory = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      const res = await fetch(`/api/users/directory?${params}`)
      if (!res.ok) throw new Error('Failed to load directory')
      const data: DirectoryResponse = await res.json()
      setUsers(data.users)

      // Extract unique groups
      const groupMap = new Map<string, { id: string; name: string; color: string | null }>()
      for (const user of data.users) {
        if (user.group && !groupMap.has(user.group.id)) {
          groupMap.set(user.group.id, user.group)
        }
      }
      setGroups(Array.from(groupMap.values()).sort((a, b) => a.name.localeCompare(b.name)))
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [search])

  useEffect(() => {
    const timer = setTimeout(() => { loadDirectory() }, 300)
    return () => clearTimeout(timer)
  }, [loadDirectory])

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}>
        <Spinner size="lg" />
      </div>
    )
  }

  if (!session) {
    redirect('/login')
  }

  const filteredUsers = selectedGroup
    ? users.filter((u) => u.group?.id === selectedGroup)
    : users

  return (
    <>
      <PageHeader
        title="Annuaire"
        description="Retrouvez tous les membres de la plateforme"
      />

      <div style={{ padding: '24px 32px' }}>
        {/* Search and filters */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginBottom: '24px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '240px', maxWidth: '400px' }}>
            <Input
              placeholder="Rechercher par nom ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search size={15} />}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={14} style={{ color: 'var(--text-tertiary)' }} />
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              style={{
                padding: '9px 12px',
                background: 'var(--bg-raised)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="">Tous les groupes</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
            {filteredUsers.length} membre{filteredUsers.length !== 1 ? 's' : ''}
          </span>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
            <Spinner size="lg" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 20px',
            color: 'var(--text-tertiary)',
            gap: '12px',
          }}>
            <Users size={40} strokeWidth={1.2} />
            <p style={{ fontSize: '14px', margin: 0 }}>
              {search ? 'Aucun membre ne correspond à votre recherche' : 'Aucun membre pour le moment'}
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '14px',
          }}>
            {filteredUsers.map((user, i) => {
              const roleConfig = ROLE_CONFIG[user.role] ?? ROLE_CONFIG.MEMBER
              return (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.2 }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    padding: '20px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    transition: 'border-color var(--transition), box-shadow var(--transition)',
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.borderColor = 'var(--accent)'
                    el.style.boxShadow = 'var(--shadow-md)'
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.borderColor = 'var(--border)'
                    el.style.boxShadow = 'none'
                  }}
                >
                  {/* Avatar and name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Avatar name={user.name} size="lg" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '14px',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        margin: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {user.name}
                      </p>
                      <p style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                        margin: '2px 0 0',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {user.email}
                      </p>
                    </div>
                  </div>

                  {/* Badges */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <Badge variant={roleConfig.variant}>
                      {roleConfig.label}
                    </Badge>
                    {user.group && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '2px 10px',
                          borderRadius: '9999px',
                          fontSize: '11px',
                          fontWeight: 600,
                          fontFamily: 'var(--font-body)',
                          background: user.group.color ? `${user.group.color}18` : 'var(--bg-raised)',
                          color: user.group.color ?? 'var(--text-secondary)',
                          border: `1px solid ${user.group.color ? `${user.group.color}30` : 'var(--border)'}`,
                        }}
                      >
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: user.group.color ?? 'var(--text-tertiary)',
                            flexShrink: 0,
                          }}
                        />
                        {user.group.name}
                      </span>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
