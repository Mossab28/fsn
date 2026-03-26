import React from 'react'
import { Sidebar } from './Sidebar'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <>
      <Sidebar />
      <main
        style={{
          marginLeft: '240px',
          minHeight: '100vh',
          background: 'var(--bg)',
          padding: '32px 40px',
          overflow: 'auto',
        }}
      >
        {children}
      </main>
    </>
  )
}
