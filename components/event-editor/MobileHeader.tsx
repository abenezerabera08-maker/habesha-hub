'use client'

import { ArrowLeft, Bell } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function MobileHeader() {
  const router = useRouter()
  return (
    <div className="create-event-mobile-header">
      <button type="button" aria-label="Back" onClick={() => router.back()} style={{ background: 'none', border: 'none', padding: 6, cursor: 'pointer', color: '#111827' }}>
        <ArrowLeft size={22} />
      </button>
      <span style={{ fontSize: 16, fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ color: '#f59e0b' }}>★</span> Habesha Hub
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button type="button" aria-label="Notifications" style={{ background: 'none', border: 'none', padding: 6, cursor: 'pointer', color: '#111827', position: 'relative' }}>
          <Bell size={22} />
          <span style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: 99, background: '#ef4444' }} />
        </button>
        <div style={{ width: 32, height: 32, borderRadius: 99, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: '#4f46e5' }}>
          O
        </div>
      </div>
    </div>
  )
}
