'use client'

import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

interface RecentDoc {
  id: string
  title: string
  mimeType: string
  fileSize: number
  createdAt: string
  categoryName: string | null
  categoryColor: string | null
  uploaderName: string
}

interface CategoryBreakdown {
  id: string
  name: string
  color: string | null
  count: number
  percentage: number
}

interface Stats {
  totalDocuments: number
  totalCategories: number
  totalUsers: number
  totalStorage: string
}

interface Props {
  greeting: string
  userName: string
  userRole: string
  stats: Stats
  recentDocuments: RecentDoc[]
  categoryBreakdown: CategoryBreakdown[]
}

function getMimeIcon(mimeType: string): React.ReactNode {
  if (mimeType.includes('pdf')) {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="1" width="10" height="13" rx="1.5" stroke="var(--red)" strokeWidth="1.25" />
        <path d="M5 7h6M5 9.5h4M5 4.5h4" stroke="var(--red)" strokeWidth="1.25" strokeLinecap="round" />
        <path d="M10 1v3.5H13" stroke="var(--red)" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  if (mimeType.includes('word') || mimeType.includes('document')) {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="1" width="10" height="13" rx="1.5" stroke="var(--blue)" strokeWidth="1.25" />
        <path d="M5 6h6M5 8.5h6M5 11h4" stroke="var(--blue)" strokeWidth="1.25" strokeLinecap="round" />
      </svg>
    )
  }
  if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType.includes('csv')) {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="1" width="10" height="13" rx="1.5" stroke="var(--accent)" strokeWidth="1.25" />
        <path d="M2 5.5h10M6 5.5v8.5" stroke="var(--accent)" strokeWidth="1.25" />
        <path d="M4 8h1.5M4 10.5h1.5M8 8h2M8 10.5h2" stroke="var(--accent)" strokeWidth="1.25" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="1" width="10" height="13" rx="1.5" stroke="var(--text-tertiary)" strokeWidth="1.25" />
      <path d="M5 6h6M5 8.5h6M5 11h4" stroke="var(--text-tertiary)" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  )
}

function getCategoryAccent(color: string | null, index: number): string {
  const palette = [
    'var(--accent)',
    'var(--blue)',
    'var(--amber)',
    '#A78BFA',
    '#F472B6',
    '#34D399',
    '#FB923C',
    '#60A5FA',
  ]
  if (color) return color
  return palette[index % palette.length]
}

const STAT_ICONS = {
  documents: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="3" y="2" width="11" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 7h5M6 10h5M6 13h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 2v3.5H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  categories: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="2" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  users: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 17c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  storage: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <ellipse cx="10" cy="6" rx="7" ry="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 6v8c0 1.38 3.134 2.5 7 2.5S17 15.38 17 14V6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 10c0 1.38 3.134 2.5 7 2.5S17 11.38 17 10" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
}

const STAT_CARDS = (stats: Stats) => [
  {
    key: 'documents',
    label: 'Documents',
    value: stats.totalDocuments.toString(),
    icon: STAT_ICONS.documents,
    color: 'var(--accent)',
    bg: 'var(--accent-dim)',
    trend: '+12% ce mois',
    trendUp: true,
  },
  {
    key: 'categories',
    label: 'Catégories',
    value: stats.totalCategories.toString(),
    icon: STAT_ICONS.categories,
    color: 'var(--blue)',
    bg: 'var(--blue-dim)',
    trend: 'Actives',
    trendUp: true,
  },
  {
    key: 'users',
    label: 'Utilisateurs',
    value: stats.totalUsers.toString(),
    icon: STAT_ICONS.users,
    color: 'var(--amber)',
    bg: 'var(--amber-dim)',
    trend: 'Membres actifs',
    trendUp: true,
  },
  {
    key: 'storage',
    label: 'Stockage utilisé',
    value: stats.totalStorage,
    icon: STAT_ICONS.storage,
    color: '#A78BFA',
    bg: 'rgba(167, 139, 250, 0.12)',
    trend: 'Total fichiers',
    trendUp: null,
  },
]

export function DashboardClient({
  greeting,
  userName,
  userRole,
  stats,
  recentDocuments,
  categoryBreakdown,
}: Props) {
  const cards = STAT_CARDS(stats)

  return (
    <div
      style={{
        padding: '32px',
        maxWidth: '1280px',
        margin: '0 auto',
        fontFamily: 'var(--font-body)',
      }}
    >
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ marginBottom: '32px' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '28px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                marginBottom: '4px',
              }}
            >
              {greeting},{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, var(--accent) 0%, #00E5C4 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {userName.split(' ')[0]}
              </span>
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Vue d&apos;ensemble de la base documentaire FSN
            </p>
          </div>

          {/* Role badge */}
          <div
            style={{
              padding: '5px 12px',
              background: userRole === 'ADMIN' ? 'var(--amber-dim)' : 'var(--accent-dim)',
              border: `1px solid ${userRole === 'ADMIN' ? 'rgba(245,158,11,0.2)' : 'rgba(0,201,167,0.2)'}`,
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 700,
              color: userRole === 'ADMIN' ? 'var(--amber)' : 'var(--accent)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase' as const,
            }}
          >
            {userRole === 'ADMIN' ? 'Administrateur' : 'Membre'}
          </div>
        </div>
      </motion.div>

      {/* Stat cards row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {cards.map((card, i) => (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.07 }}
            className="card"
            style={{
              padding: '24px',
              cursor: 'default',
            }}
          >
            {/* Icon */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                background: card.bg,
                borderRadius: 'var(--radius-md)',
                color: card.color,
                marginBottom: '16px',
              }}
            >
              {card.icon}
            </div>

            {/* Value */}
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '32px',
                fontWeight: 800,
                color: 'var(--text-primary)',
                lineHeight: 1,
                letterSpacing: '-0.03em',
                marginBottom: '4px',
              }}
            >
              {card.value}
            </div>

            {/* Label */}
            <div
              style={{
                fontSize: '13px',
                color: 'var(--text-secondary)',
                marginBottom: '10px',
                fontWeight: 500,
              }}
            >
              {card.label}
            </div>

            {/* Trend indicator */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                color: card.trendUp === true ? 'var(--accent)' : 'var(--text-tertiary)',
                fontWeight: 500,
              }}
            >
              {card.trendUp === true && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 8L8 2M8 2H4M8 2v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {card.trend}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main content grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
        }}
      >
        {/* Recent documents */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.32 }}
          className="card"
          style={{ padding: '24px' }}
        >
          {/* Section header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
            }}
          >
            <div>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '15px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.01em',
                  marginBottom: '2px',
                }}
              >
                Documents récents
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                5 derniers ajouts
              </p>
            </div>
            <a
              href="/documents"
              style={{
                fontSize: '12px',
                color: 'var(--accent)',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              Voir tout
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5h6M5 2l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>

          {/* Document list */}
          {recentDocuments.length === 0 ? (
            <EmptyState message="Aucun document pour le moment" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {recentDocuments.map((doc, i) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.38 + i * 0.06 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    transition: 'background var(--transition)',
                    cursor: 'default',
                  }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLDivElement).style.background = 'var(--bg-raised)'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLDivElement).style.background = 'transparent'
                  }}
                >
                  {/* File icon */}
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'var(--bg-raised)',
                      borderRadius: 'var(--radius-sm)',
                      flexShrink: 0,
                    }}
                  >
                    {getMimeIcon(doc.mimeType)}
                  </div>

                  {/* Title + meta */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginBottom: '2px',
                      }}
                    >
                      {doc.title}
                    </p>
                    <p
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-tertiary)',
                      }}
                    >
                      {formatDistanceToNow(new Date(doc.createdAt), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </p>
                  </div>

                  {/* Category badge */}
                  {doc.categoryName && (
                    <span
                      style={{
                        flexShrink: 0,
                        padding: '2px 8px',
                        background: 'var(--bg-raised)',
                        border: '1px solid var(--border)',
                        borderRadius: '9999px',
                        fontSize: '10px',
                        fontWeight: 600,
                        color: doc.categoryColor ?? 'var(--text-secondary)',
                        letterSpacing: '0.04em',
                        whiteSpace: 'nowrap',
                        maxWidth: '100px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        textTransform: 'uppercase',
                      }}
                    >
                      {doc.categoryName}
                    </span>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Category breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.38 }}
          className="card"
          style={{ padding: '24px' }}
        >
          {/* Section header */}
          <div style={{ marginBottom: '20px' }}>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '15px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.01em',
                marginBottom: '2px',
              }}
            >
              Répartition par catégorie
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
              Distribution des documents
            </p>
          </div>

          {/* Bars */}
          {categoryBreakdown.length === 0 ? (
            <EmptyState message="Aucune catégorie définie" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {categoryBreakdown.map((cat, i) => (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, delay: 0.44 + i * 0.055 }}
                >
                  {/* Label row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <span
                        style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          background: getCategoryAccent(cat.color, i),
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 500,
                          color: 'var(--text-primary)',
                        }}
                      >
                        {cat.name}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-tertiary)',
                        }}
                      >
                        {cat.count} doc{cat.count !== 1 ? 's' : ''}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: getCategoryAccent(cat.color, i),
                          minWidth: '34px',
                          textAlign: 'right',
                        }}
                      >
                        {cat.percentage}%
                      </span>
                    </div>
                  </div>

                  {/* Bar */}
                  <div
                    style={{
                      height: '5px',
                      background: 'var(--bg-raised)',
                      borderRadius: '9999px',
                      overflow: 'hidden',
                    }}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${cat.percentage}%` }}
                      transition={{ duration: 0.6, delay: 0.5 + i * 0.07, ease: 'easeOut' }}
                      style={{
                        height: '100%',
                        background: getCategoryAccent(cat.color, i),
                        borderRadius: '9999px',
                        minWidth: cat.percentage > 0 ? '4px' : '0',
                      }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Total summary */}
          {categoryBreakdown.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.9 }}
              style={{
                marginTop: '20px',
                paddingTop: '16px',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                Total indexé
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                }}
              >
                {categoryBreakdown.reduce((sum, c) => sum + c.count, 0)} documents
              </span>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Activity summary strip */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.55 }}
        style={{
          marginTop: '16px',
          padding: '16px 24px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'var(--accent)',
              display: 'block',
              boxShadow: '0 0 6px var(--accent)',
            }}
          />
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Système opérationnel
          </span>
        </div>
        <div
          style={{
            width: '1px',
            height: '16px',
            background: 'var(--border)',
          }}
        />
        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
          Base documentaire FSN — Filière Santé Numérique
        </span>
        <div style={{ marginLeft: 'auto' }}>
          <span
            style={{
              padding: '3px 10px',
              background: 'var(--accent-dim)',
              border: '1px solid rgba(0,201,167,0.15)',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--accent)',
              letterSpacing: '0.04em',
            }}
          >
            v1.0.0
          </span>
        </div>
      </motion.div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: '40px 20px',
        textAlign: 'center',
        color: 'var(--text-tertiary)',
        fontSize: '13px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" opacity={0.4}>
        <rect x="4" y="3" width="16" height="20" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 9h8M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      {message}
    </div>
  )
}
