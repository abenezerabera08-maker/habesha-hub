'use client'

import { Bell } from 'lucide-react'

type DiscoveryHeaderProps = {
  userName?: string | null
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function DiscoveryHeader({ userName }: DiscoveryHeaderProps) {
  const greeting = getGreeting()

  return (
    <div style={{ padding: '16px 16px 0' }}>
      {/* Brand row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: '#F59E0B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 700,
            color: '#fff',
          }}
        >
          H
        </div>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#1C1917' }}>
          Habesha Hub
        </span>
      </div>

      {/* Greeting + bell */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 12 }}>
        <p style={{ fontSize: 14, color: '#78716C', margin: 0 }}>
          {greeting},{' '}
          <span style={{ fontWeight: 500, color: '#44403C' }}>
            {userName || 'there'}
          </span>{' '}
          👋
        </p>
        <button
          type="button"
          aria-label="Notifications"
          suppressHydrationWarning
          style={{
            borderRadius: '50%',
            padding: 8,
            color: '#78716C',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <Bell size={20} />
        </button>
      </div>

      {/* Title */}
      <h1
        style={{
          marginTop: 4,
          fontSize: 28,
          fontWeight: 600,
          color: '#1C1917',
          letterSpacing: '-0.01em',
          fontFamily: "Georgia, 'Times New Roman', serif",
          margin: '4px 0 0',
        }}
      >
        Discover Events
      </h1>
      <div
        style={{
          marginTop: 6,
          height: 4,
          width: 56,
          borderRadius: 2,
          background: '#FBBF24',
        }}
      />
      <p style={{ marginTop: 8, fontSize: 14, color: '#78716C', margin: '8px 0 0' }}>
        Find amazing experiences around you
      </p>
    </div>
  )
}
