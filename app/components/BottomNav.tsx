'use client'

import { useEffect, useState } from 'react'
import { Home, Ticket, User, LayoutDashboard, ShieldCheck, ScanLine } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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

  const navItems = [
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
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        width: '100%',
        background: '#fff',
        borderTop: '1px solid #eee',
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingTop: 8,
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
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              textDecoration: 'none',
              color: active ? '#171717' : '#888',
              fontWeight: active ? 600 : 400,
              fontSize: 12,
              position: 'relative',
              padding: '0 12px',
            }}
          >
            {active && (
              <span
                style={{
                  position: 'absolute',
                  top: -9,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 24,
                  height: 3,
                  borderRadius: 2,
                  background: '#171717',
                }}
              />
            )}
            <Icon size={22} />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
