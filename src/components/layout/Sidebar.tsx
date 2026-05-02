'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Files,
  Search,
  Settings,
  LogOut,
  Sparkles,
  MessageSquare,
  Sun,
  Moon,
  BookUser,
  UserCog,
  type LucideIcon,
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { useTheme } from '@/lib/theme-context'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/documents', label: 'Documents', icon: Files },
  { href: '/search', label: 'Recherche', icon: Search },
  { href: '/annuaire', label: 'Annuaire', icon: BookUser },
  { href: '/profil', label: 'Profil', icon: UserCog },
]

const adminItems: NavItem[] = [
  { href: '/admin', label: 'Administration', icon: Settings },
]

interface AINavItem {
  href: string
  label: string
  icon: LucideIcon
}

const aiItems: AINavItem[] = [
  { href: '#', label: 'Resumes', icon: Sparkles },
  { href: '#', label: 'Assistant', icon: MessageSquare },
]

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      className={`nav-item${isActive ? ' active' : ''}`}
      style={{
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Active left border indicator */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            layoutId="nav-indicator"
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1 }}
            exit={{ scaleY: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            style={{
              position: 'absolute',
              left: 0,
              top: '4px',
              bottom: '4px',
              width: '2px',
              background: 'var(--accent)',
              borderRadius: '0 2px 2px 0',
              boxShadow: '0 0 8px var(--accent)',
            }}
          />
        )}
      </AnimatePresence>

      <Icon
        size={16}
        style={{
          flexShrink: 0,
          opacity: isActive ? 1 : 0.7,
        }}
        strokeWidth={isActive ? 2.2 : 1.8}
      />
      <span style={{ fontSize: '13px', fontWeight: isActive ? 600 : 500 }}>
        {item.label}
      </span>
    </Link>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const { theme, toggleTheme } = useTheme()
  const user = session?.user
  const isAdmin = (user as { role?: string })?.role === 'ADMIN'
  const userName = user?.name ?? 'Utilisateur'
  const userRole = isAdmin ? 'Administrateur' : 'Membre'

  return (
    <aside
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: '240px',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 30,
        overflow: 'hidden',
      }}
    >
      {/* Logo area */}
      <div
        style={{
          padding: '20px 18px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* FSN logo mark */}
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--accent) 0%, #00E5C4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 12px rgba(0, 168, 142, 0.25)',
              overflow: 'hidden',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '10px',
                fontWeight: 800,
                color: '#FFFFFF',
                letterSpacing: '0.04em',
                lineHeight: 1,
              }}
            >
              FSN
            </span>
          </div>

          <div style={{ overflow: 'hidden', minWidth: 0 }}>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '15px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
              }}
            >
              Filière Santé
            </div>
            <div
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '10px',
                fontWeight: 500,
                color: 'var(--text-tertiary)',
                letterSpacing: '0.04em',
                lineHeight: 1.2,
                marginTop: '2px',
                whiteSpace: 'nowrap',
              }}
            >
              Base Documentaire
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav
        style={{
          flex: 1,
          padding: '12px 10px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}
      >
        {/* Section label */}
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '10px',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            padding: '4px 12px 8px',
          }}
        >
          Navigation
        </div>

        {navItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            isActive={pathname === item.href || pathname?.startsWith(item.href + '/')}
          />
        ))}

        {/* Admin section */}
        {isAdmin && (
          <>
            <div
              style={{
                height: '1px',
                background: 'var(--border-subtle)',
                margin: '8px 12px',
              }}
            />
            <div
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                padding: '4px 12px 8px',
              }}
            >
              Gestion
            </div>
            {adminItems.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                isActive={pathname === item.href || pathname?.startsWith(item.href + '/')}
              />
            ))}
          </>
        )}

        {/* AI section */}
        <div
          style={{
            height: '1px',
            background: 'var(--border-subtle)',
            margin: '8px 12px',
          }}
        />
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '10px',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            padding: '4px 12px 8px',
          }}
        >
          IA
        </div>
        {aiItems.map((item) => {
          const Icon = item.icon
          return (
            <a
              key={item.label}
              href={item.href}
              className="nav-item"
              style={{
                position: 'relative',
                overflow: 'hidden',
                opacity: 0.65,
                cursor: 'default',
              }}
              onClick={(e) => e.preventDefault()}
            >
              <Icon
                size={16}
                style={{
                  flexShrink: 0,
                  opacity: 0.7,
                }}
                strokeWidth={1.8}
              />
              <span style={{ fontSize: '13px', fontWeight: 500, flex: 1 }}>
                {item.label}
              </span>
              <span
                style={{
                  padding: '1px 6px',
                  background: 'var(--bg-raised)',
                  border: '1px solid var(--border)',
                  borderRadius: '9999px',
                  fontSize: '9px',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                }}
              >
                Bientot
              </span>
            </a>
          )
        })}
      </nav>

      {/* User card */}
      <div
        style={{
          padding: '8px 10px',
          borderTop: '1px solid var(--border-subtle)',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <div
          style={{
            background: 'var(--bg-raised)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 10px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {/* User info row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Avatar name={userName} size="sm" />
            <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
              <div
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  lineHeight: 1.3,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {userName}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '10px',
                  fontWeight: 500,
                  color: isAdmin ? 'var(--accent)' : 'var(--text-tertiary)',
                  lineHeight: 1.3,
                  letterSpacing: '0.02em',
                }}
              >
                {userRole}
              </div>
            </div>

            {/* Theme toggle */}
            <motion.button
              onClick={toggleTheme}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-overlay)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                position: 'relative',
                overflow: 'hidden',
                flexShrink: 0,
              }}
              aria-label={theme === 'light' ? 'Passer en mode sombre' : 'Passer en mode clair'}
            >
              <AnimatePresence mode="wait" initial={false}>
                {theme === 'light' ? (
                  <motion.div
                    key="moon"
                    initial={{ y: -20, opacity: 0, rotate: -90 }}
                    animate={{ y: 0, opacity: 1, rotate: 0 }}
                    exit={{ y: 20, opacity: 0, rotate: 90 }}
                    transition={{ duration: 0.2 }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Moon size={14} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="sun"
                    initial={{ y: -20, opacity: 0, rotate: 90 }}
                    animate={{ y: 0, opacity: 1, rotate: 0 }}
                    exit={{ y: 20, opacity: 0, rotate: -90 }}
                    transition={{ duration: 0.2 }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Sun size={14} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>

          {/* Logout */}
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              width: '100%',
              padding: '5px 6px',
              background: 'transparent',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-tertiary)',
              fontFamily: 'var(--font-body)',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all var(--transition)',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.background = 'var(--red-dim)'
              el.style.color = 'var(--red)'
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.background = 'transparent'
              el.style.color = 'var(--text-tertiary)'
            }}
          >
            <LogOut size={13} strokeWidth={1.8} />
            <span>Se deconnecter</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
