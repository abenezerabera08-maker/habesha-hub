'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { label: 'Overview', href: '/dashboard' },
  { label: 'Orders', href: '/dashboard/payments' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside
        style={{
          width: 220,
          background: '#171717',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 0',
        }}
      >
        <div style={{ padding: '0 20px 24px', fontSize: 18, fontWeight: 700 }}>
          Organizer
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navItems.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'block',
                  padding: '10px 20px',
                  color: active ? '#fff' : '#aaa',
                  background: active ? '#333' : 'transparent',
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: active ? 600 : 400,
                }}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>
      <main style={{ flex: 1, background: '#fff', padding: 24 }}>
        {children}
      </main>
    </div>
  )
}
