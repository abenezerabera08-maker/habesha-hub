'use client'

import { useRouter } from 'next/navigation'
import { Search, Calendar } from 'lucide-react'

type DiscoverySearchProps = {
  onDateFilterClick?: () => void
}

export default function DiscoverySearch({ onDateFilterClick }: DiscoverySearchProps) {
  const router = useRouter()

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 16px 0' }}>
      <div
        style={{
          position: 'relative',
          flex: 1,
        }}
      >
        <Search
          size={16}
          color="#A8A29E"
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
          }}
        />
        <input
          type="text"
          placeholder="Search events, artists, venues..."
          readOnly
          suppressHydrationWarning
          onClick={() => router.push('/search')}
          style={{
            width: '100%',
            borderRadius: 9999,
            border: '1px solid #E7E5E4',
            background: '#fff',
            padding: '10px 12px 10px 36px',
            fontSize: 14,
            color: '#1C1917',
            outline: 'none',
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}
        />
      </div>
      <button
        type="button"
        aria-label="Filter by date"
        onClick={onDateFilterClick}
        style={{
          width: 40,
          height: 40,
          flexShrink: 0,
          borderRadius: '50%',
          border: '1px solid #E7E5E4',
          background: '#fff',
          color: '#57534E',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        }}
      >
        <Calendar size={16} />
      </button>
    </div>
  )
}
