'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type OrderRow = {
  id: string
  event_id: string
  ticket_tier_id: string
  quantity: number
  total_price: number
  status: string
  created_at: string | null
}

type EventRow = {
  id: string
  title: string
  event_date: string
}

type TierRow = {
  id: string
  name: string
}

type Order = {
  id: string
  quantity: number
  total_price: number
  status: string
  created_at: string | null
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
        .select('id, event_id, ticket_tier_id, quantity, total_price, status, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (orderError) {
        setError('Failed to load your orders. Please try again.')
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
        supabase.from('events').select('id, title, event_date').in('id', eventIds),
        supabase.from('ticket_tiers').select('id, name').in('id', tierIds),
      ])

      if (eventsRes.error || tiersRes.error) {
        setError('Failed to load event details. Please try again.')
        setLoading(false)
        return
      }

      const eventMap = new Map((eventsRes.data ?? []).map((e: EventRow) => [e.id, e]))
      const tierMap = new Map((tiersRes.data ?? []).map((t: TierRow) => [t.id, t]))

      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('id, order_id')
        .in('order_id', rawOrders.map((o) => o.id))

      if (paymentsError) {
        setError('Failed to load payment details. Please try again.')
        setLoading(false)
        return
      }

      const { data: verificationsData, error: verificationsError } = await supabase
        .from('payment_verifications')
        .select('payment_id, notes, created_at')
        .in('payment_id', (paymentsData ?? []).map((p) => p.id))
        .eq('decision', 'rejected')
        .order('created_at', { ascending: false })

      if (verificationsError) {
        setError('Failed to load payment details. Please try again.')
        setLoading(false)
        return
      }

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
        event: eventMap.get(r.event_id) ?? null,
        tier: tierMap.get(r.ticket_tier_id) ?? null,
        rejection_reason: orderRejectionMap.get(r.id) ?? null,
      }))

      setOrders(merged)
      setLoading(false)
    }

    fetchOrders()
  }, [router])

  if (loading) return <p>Loading...</p>

  return (
    <div style={{ maxWidth: 640, margin: '40px auto', padding: '0 16px' }}>
      <h1>My Tickets</h1>

      {error && <p style={{ color: '#c00', marginTop: 12 }}>{error}</p>}

      {orders.length === 0 ? (
        <p>No tickets yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
          {orders.map((order) => (
            <div
              key={order.id}
              style={{
                padding: 16,
                border: '1px solid #ddd',
                borderRadius: 8,
              }}
            >
              <Link
                href={`/events/${order.event?.id}`}
                style={{ fontWeight: 600, fontSize: 18, textDecoration: 'none', color: 'inherit' }}
              >
                {order.event?.title ?? 'Unknown event'}
              </Link>
              <p style={{ margin: '4px 0', color: '#555' }}>
                {order.event?.event_date
                  ? new Date(order.event.event_date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })
                  : ''}
              </p>
              <p style={{ margin: '4px 0' }}>
                {order.tier?.name} &times; {order.quantity}
              </p>
              <p style={{ margin: '4px 0', fontWeight: 600 }}>
                {order.total_price.toFixed(2)} ETB
              </p>
              {order.status === 'pending_verification' && (
                <p style={{ margin: '4px 0', color: '#a16207', fontWeight: 600 }}>
                  ⏳ Awaiting confirmation
                </p>
              )}
              {order.status === 'confirmed' && (
                <p style={{ margin: '4px 0', color: '#15803d', fontWeight: 600 }}>
                  ✅ Confirmed
                </p>
              )}
              {order.status === 'pending_payment' && (
                <div style={{ margin: '4px 0' }}>
                  <p style={{ color: '#b91c1c', fontWeight: 600, margin: 0 }}>
                    ❌ Payment rejected
                  </p>
                  {order.rejection_reason && (
                    <p style={{ color: '#7f1d1d', fontSize: 13, margin: '2px 0 0' }}>
                      Reason: {order.rejection_reason}
                    </p>
                  )}
                </div>
              )}
              <p style={{ margin: '4px 0', fontSize: 13, color: '#888' }}>
                Ordered {order.created_at ? new Date(order.created_at).toLocaleDateString() : 'date unknown'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
