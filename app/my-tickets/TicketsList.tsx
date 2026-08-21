'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Compass, Ticket } from 'lucide-react'
import TicketSummaryCard from '@/components/tickets/TicketSummaryCard'
import { getDisplayStatus } from '@/components/tickets/ticketDisplay'
import type { Order } from './page'

export default function TicketsList({ orders, error }: { orders: Order[]; error: string }) {
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')

  const { upcoming, past } = useMemo(() => {
    const now = new Date()
    const u: Order[] = []
    const p: Order[] = []
    for (const o of orders) {
      const eventDate = o.event?.event_date ? new Date(o.event.event_date) : null
      const ds = getDisplayStatus(o)
      const isPast = (eventDate && eventDate < now) || ds === 'checked_in'
      if (isPast) p.push(o)
      else u.push(o)
    }
    return { upcoming: u, past: p }
  }, [orders])

  const visibleOrders = tab === 'upcoming' ? upcoming : past

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '22px 20px', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 30, fontWeight: 800, color: '#101828', margin: '0 0 16px', letterSpacing: '-0.02em' }}>
        My Tickets
      </h1>

      <div style={{ display: 'flex', background: '#F2F4F7', borderRadius: 12, padding: 3, marginBottom: 20 }}>
        {(['upcoming', 'past'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            style={{
              flex: 1, height: 42, borderRadius: 10, border: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
              background: tab === t ? '#fff' : 'transparent',
              color: tab === t ? '#101828' : '#667085',
              boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            {t === 'upcoming' ? 'Upcoming' : 'Past'}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 10, background: '#FEF2F2', color: '#B91C1C', fontSize: 14, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {!error && orders.length === 0 && (
        <div style={{ padding: '64px 0', textAlign: 'center' }}>
          <Ticket size={40} color="#D6D3D1" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 16, fontWeight: 600, color: '#101828', margin: '0 0 4px' }}>No tickets yet</p>
          <p style={{ fontSize: 14, color: '#667085', margin: '0 0 20px' }}>Your purchased tickets will appear here.</p>
          <Link href="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '10px 20px', borderRadius: 10, background: '#1C1917', color: '#fff',
            fontSize: 14, fontWeight: 600, textDecoration: 'none',
          }}>
            <Compass size={16} /> Discover Events
          </Link>
        </div>
      )}

      {!error && orders.length > 0 && visibleOrders.length === 0 && (
        <div style={{ padding: '48px 0', textAlign: 'center' }}>
          <p style={{ fontSize: 15, fontWeight: 500, color: '#667085', margin: 0 }}>
            {tab === 'upcoming' ? 'No upcoming tickets.' : 'No past tickets.'}
          </p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {visibleOrders.map(order => (
          <TicketSummaryCard key={order.id} order={order} />
        ))}
      </div>
    </div>
  )
}
