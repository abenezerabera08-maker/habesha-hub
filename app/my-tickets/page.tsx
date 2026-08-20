'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Compass, Ticket } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import TicketSummaryCard from '@/components/tickets/TicketSummaryCard'
import { getDisplayStatus } from '@/components/tickets/ticketDisplay'

type OrderRow = {
  id: string
  event_id: string
  ticket_tier_id: string
  quantity: number
  total_price: number
  status: string
  created_at: string | null
  tk_code: string | null
  checked_in_at: string | null
}

type EventRow = { id: string; title: string; event_date: string; location: string | null; image_url: string | null }
type TierRow = { id: string; name: string; price: number }

type Order = {
  id: string
  quantity: number
  total_price: number
  status: string
  created_at: string | null
  tk_code: string | null
  checked_in_at: string | null
  event: EventRow | null
  tier: TierRow | null
  rejection_reason: string | null
}

export default function MyTicketsPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')
  const router = useRouter()

  useEffect(() => {
    const fetchOrders = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('id, event_id, ticket_tier_id, quantity, total_price, status, created_at, tk_code, checked_in_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (orderError) {
        setError('Failed to load your tickets. Please try again.')
        setLoading(false)
        return
      }

      const rawOrders = (orderData ?? []) as OrderRow[]

      if (rawOrders.length === 0) {
        setOrders([])
        setLoading(false)
        return
      }

      const eventIds = [...new Set(rawOrders.map((o) => o.event_id))]
      const tierIds = [...new Set(rawOrders.map((o) => o.ticket_tier_id))]

      const [eventsRes, tiersRes] = await Promise.all([
        supabase.from('events').select('id, title, event_date, location, image_url').in('id', eventIds),
        supabase.from('ticket_tiers').select('id, name, price').in('id', tierIds),
      ])

      if (eventsRes.error || tiersRes.error) {
        setError('Failed to load event details. Please try again.')
        setLoading(false)
        return
      }

      const eventMap = new Map((eventsRes.data ?? []).map((e: EventRow) => [e.id, e]))
      const tierMap = new Map((tiersRes.data ?? []).map((t: TierRow) => [t.id, t]))

      const { data: paymentsData } = await supabase
        .from('payments')
        .select('id, order_id')
        .in('order_id', rawOrders.map((o) => o.id))

      const { data: verificationsData } = await supabase
        .from('payment_verifications')
        .select('payment_id, notes, created_at')
        .in('payment_id', (paymentsData ?? []).map((p) => p.id))
        .eq('decision', 'rejected')
        .order('created_at', { ascending: false })

      const paymentToOrder = new Map((paymentsData ?? []).map((p) => [p.id, p.order_id]))
      const orderRejectionMap = new Map<string, string>()
      for (const v of verificationsData ?? []) {
        const orderId = paymentToOrder.get(v.payment_id)
        if (orderId && !orderRejectionMap.has(orderId) && v.notes) {
          orderRejectionMap.set(orderId, v.notes)
        }
      }

      const merged: Order[] = rawOrders.map((r) => ({
        id: r.id,
        quantity: r.quantity,
        total_price: r.total_price,
        status: r.status,
        created_at: r.created_at,
        tk_code: r.tk_code,
        checked_in_at: r.checked_in_at,
        event: eventMap.get(r.event_id) ?? null,
        tier: tierMap.get(r.ticket_tier_id) ?? null,
        rejection_reason: orderRejectionMap.get(r.id) ?? null,
      }))

      setOrders(merged)
      setLoading(false)
    }

    fetchOrders()
  }, [router])

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

  if (loading) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '22px 20px' }}>
        <div style={{ height: 32, width: 160, borderRadius: 8, background: '#F5F5F4', marginBottom: 20 }} />
        <div style={{ height: 48, borderRadius: 12, background: '#F5F5F4', marginBottom: 20 }} />
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ height: 180, borderRadius: 14, background: '#F5F5F4', marginBottom: 12 }} />
        ))}
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '22px 20px', minHeight: '100vh' }}>

      {/* Page title */}
      <h1 style={{ fontSize: 30, fontWeight: 800, color: '#101828', margin: '0 0 16px', letterSpacing: '-0.02em' }}>
        My Tickets
      </h1>

      {/* Segmented control */}
      <div style={{
        display: 'flex', background: '#F2F4F7', borderRadius: 12, padding: 3, marginBottom: 20,
      }}>
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

      {/* Error */}
      {error && (
        <div style={{
          padding: '12px 16px', borderRadius: 10,
          background: '#FEF2F2', color: '#B91C1C', fontSize: 14, marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {/* Empty state */}
      {!error && orders.length === 0 && (
        <div style={{ padding: '64px 0', textAlign: 'center' }}>
          <Ticket size={40} color="#D6D3D1" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 16, fontWeight: 600, color: '#101828', margin: '0 0 4px' }}>
            No tickets yet
          </p>
          <p style={{ fontSize: 14, color: '#667085', margin: '0 0 20px' }}>
            Your purchased tickets will appear here.
          </p>
          <Link
            href="/"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 20px', borderRadius: 10,
              background: '#1C1917', color: '#fff',
              fontSize: 14, fontWeight: 600, textDecoration: 'none',
            }}
          >
            <Compass size={16} />
            Discover Events
          </Link>
        </div>
      )}

      {/* Empty tab */}
      {!error && orders.length > 0 && visibleOrders.length === 0 && (
        <div style={{ padding: '48px 0', textAlign: 'center' }}>
          <p style={{ fontSize: 15, fontWeight: 500, color: '#667085', margin: 0 }}>
            {tab === 'upcoming' ? 'No upcoming tickets.' : 'No past tickets.'}
          </p>
        </div>
      )}

      {/* Ticket list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {visibleOrders.map(order => (
          <TicketSummaryCard key={order.id} order={order} />
        ))}
      </div>
    </div>
  )
}
