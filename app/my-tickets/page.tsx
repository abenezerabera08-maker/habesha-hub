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

type EventRow = { id: string; title: string; event_date: string; location: string | null }
type TierRow = { id: string; name: string }

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
        supabase.from('events').select('id, title, event_date, location').in('id', eventIds),
        supabase.from('ticket_tiers').select('id, name').in('id', tierIds),
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

  const { tickets, pending, rejected } = useMemo(() => {
    const t: Order[] = []
    const p: Order[] = []
    const r: Order[] = []
    for (const o of orders) {
      const ds = getDisplayStatus(o)
      if (ds === 'confirmed' || ds === 'checked_in') t.push(o)
      else if (ds === 'pending') p.push(o)
      else r.push(o)
    }
    return { tickets: t, pending: p, rejected: r }
  }, [orders])

  if (loading) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1C1917', margin: '0 0 20px' }}>
          My Tickets
        </h1>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              height: 120,
              borderRadius: 14,
              background: '#F5F5F4',
              marginBottom: 12,
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1C1917', margin: '0 0 20px' }}>
        My Tickets
      </h1>

      {error && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 10,
            background: '#FEF2F2',
            color: '#B91C1C',
            fontSize: 14,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {!error && orders.length === 0 && (
        <div style={{ padding: '64px 0', textAlign: 'center' }}>
          <Ticket size={40} color="#D6D3D1" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 16, fontWeight: 600, color: '#1C1917', margin: '0 0 4px' }}>
            No tickets yet
          </p>
          <p style={{ fontSize: 14, color: '#78716C', margin: '0 0 20px' }}>
            Your purchased tickets will appear here.
          </p>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 20px',
              borderRadius: 10,
              background: '#1C1917',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <Compass size={16} />
            Discover Events
          </Link>
        </div>
      )}

      {tickets.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          {(pending.length > 0 || rejected.length > 0) && (
            <h2
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#78716C',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                margin: '0 0 10px',
              }}
            >
              Tickets
            </h2>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {tickets.map((order) => (
              <TicketSummaryCard key={order.id} order={order} />
            ))}
          </div>
        </div>
      )}

      {pending.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#78716C',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              margin: '0 0 10px',
            }}
          >
            Pending
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pending.map((order) => (
              <TicketSummaryCard key={order.id} order={order} />
            ))}
          </div>
        </div>
      )}

      {rejected.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#78716C',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              margin: '0 0 10px',
            }}
          >
            Rejected
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rejected.map((order) => (
              <TicketSummaryCard key={order.id} order={order} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
