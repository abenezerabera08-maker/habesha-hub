'use client'

import { useRouter } from 'next/navigation'
import { LogOut, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: '14px 16px',
        borderRadius: 16,
        border: '1px solid #F5F5F4',
        background: '#fff',
        cursor: 'pointer',
        textAlign: 'left',
        minHeight: 56,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FEF2F2',
          color: '#DC2626',
        }}
      >
        <LogOut size={16} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#DC2626', margin: 0 }}>
          Log Out
        </p>
        <p style={{ fontSize: 12, color: '#78716C', margin: '2px 0 0' }}>
          Sign out from your account
        </p>
      </div>
      <ChevronRight size={16} color="#D6D3D1" style={{ flexShrink: 0 }} />
    </button>
  )
}
