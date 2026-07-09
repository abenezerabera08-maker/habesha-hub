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
}

export default function MyTicketsPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
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

      console.log('[my-tickets] orders query:', { orderData, orderError })

      if (orderError) {
        console.error('[my-tickets] orders error:', orderError.message)
        setLoading(false)
        return
      }

      const rawOrders = (orderData ?? []) as OrderRow[]
      console.log('[my-tickets] raw orders:', rawOrders)

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

      console.log('[my-tickets] events lookup:', eventsRes)
      console.log('[my-tickets] tiers lookup:', tiersRes)

      const eventMap = new Map((eventsRes.data ?? []).map((e: EventRow) => [e.id, e]))
      const tierMap = new Map((tiersRes.data ?? []).map((t: TierRow) => [t.id, t]))

      const merged: Order[] = rawOrders.map((r) => ({
        id: r.id,
        quantity: r.quantity,
        total_price: r.total_price,
        status: r.status,
        created_at: r.created_at,
        event: eventMap.get(r.event_id) ?? null,
        tier: tierMap.get(r.ticket_tier_id) ?? null,
      }))

      console.log('[my-tickets] merged orders:', merged)
      setOrders(merged)
      setLoading(false)
    }

    fetchOrders()
  }, [router])

  if (loading) return <p>Loading...</p>

  return (
    <div style={{ maxWidth: 640, margin: '40px auto', padding: '0 16px' }}>
      <h1>My Tickets</h1>

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
                ${order.total_price.toFixed(2)}
              </p>
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
