'use client'

import { useEffect, useState } from 'react'
import { Home, Ticket, User, LayoutDashboard, ShieldCheck, ScanLine } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type NavItem = {
  label: string
  href: string
  icon: typeof Home
}

export default function BottomNav() {
  const pathname = usePathname()
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    const fetchRole = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      setRole(data?.role ?? null)
    }

    fetchRole()
  }, [])

  const navItems: NavItem[] = [
    { label: 'Discover', href: '/', icon: Home },
    { label: 'Tickets', href: '/my-tickets', icon: Ticket },
    { label: 'Account', href: '/account', icon: User },
    ...(role === 'organizer'
      ? [
          { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
          { label: 'Scanner', href: '/dashboard/scanner', icon: ScanLine },
        ]
      : []),
    ...(role === 'admin'
      ? [
          { label: 'Admin', href: '/admin', icon: ShieldCheck },
        ]
      : []),
  ]

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'center',
        width: '100%',
        maxWidth: 640,
        padding: '0 16px',
        pointerEvents: 'none',
      }}
    >
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          borderRadius: 9999,
          background: '#1C1917',
          padding: '6px 8px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          pointerEvents: 'auto',
        }}
      >
        {navItems.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                borderRadius: 9999,
                padding: active ? '8px 14px 8px 10px' : '8px 10px',
                background: active ? '#F59E0B' : 'transparent',
                color: active ? '#fff' : '#A8A29E',
                textDecoration: 'none',
                transition: 'background-color 0.15s, color 0.15s',
              }}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 2} />
              {active && (
                <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {item.label}
                </span>
              )}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
