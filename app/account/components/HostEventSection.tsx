'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CalendarDays, Ticket, ArrowRight } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'

export default function HostEventSection() {
  const [hostError, setHostError] = useState('')
  const router = useRouter()
  const { role } = useAuth()

  return (
    <>
      {/* Host an Event — Primary CTA */}
      <section
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 16,
          background: '#1C1917',
          padding: 24,
          marginBottom: 24,
        }}
      >
        {/* Decorative glow */}
        <div
          style={{
            position: 'absolute',
            top: -24,
            right: -32,
            width: 160,
            height: 160,
            borderRadius: '50%',
            background: 'rgba(245,158,11,0.15)',
            filter: 'blur(40px)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(245,158,11,0.12)',
                marginBottom: 14,
              }}
            >
              <CalendarDays size={18} color="#F59E0B" />
            </div>
            <h3 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.2 }}>
              Host <span style={{ color: '#F59E0B' }}>an Event</span>
            </h3>
            <p style={{ fontSize: 13, color: '#A8A29E', margin: '8px 0 0', lineHeight: 1.5, maxWidth: 220 }}>
              Create, manage and grow your event. Reach more people and make it unforgettable.
            </p>
            {hostError && (
              <p style={{ fontSize: 13, color: '#FCA5A5', margin: '10px 0 0', lineHeight: 1.4, maxWidth: 260 }}>
                {hostError}
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                if (role !== 'organizer') {
                  setHostError('Only organizers can host events. Please switch to an organizer account to create events.')
                  return
                }
                router.push('/create-event')
              }}
              style={{
                marginTop: 16,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 20px',
                borderRadius: 999,
                border: 'none',
                background: '#F59E0B',
                color: '#1C1917',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                lineHeight: 1.4,
              }}
            >
              Create Your Event
              <ArrowRight size={16} />
            </button>
          </div>
          <Ticket
            size={80}
            color="rgba(245,158,11,0.85)"
            strokeWidth={1.25}
            style={{ flexShrink: 0, transform: 'rotate(-12deg)' }}
          />
        </div>
      </section>

      {/* Manage Your Events — organizer only */}
      {role === 'organizer' && (
        <section
          style={{
            borderRadius: 16,
            border: '1px solid #F5F5F4',
            background: '#fff',
            padding: 20,
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#FEF3C7',
              color: '#D97706',
            }}
          >
            <CalendarDays size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#1C1917', margin: 0 }}>
              Manage Your Events
            </p>
            <p style={{ fontSize: 12, color: '#78716C', margin: '2px 0 0', lineHeight: 1.4 }}>
              View, edit, and track the events you&apos;ve created.
              Manage drafts, pending approvals, and published events from one place.
            </p>
          </div>
          <Link
            href="/my-events"
            style={{
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '8px 14px',
              borderRadius: 999,
              background: '#F59E0B',
              color: '#1C1917',
              fontSize: 12,
              fontWeight: 600,
              textDecoration: 'none',
              lineHeight: 1.4,
            }}
          >
            Manage Your Events
            <ArrowRight size={14} />
          </Link>
        </section>
      )}
    </>
  )
}
