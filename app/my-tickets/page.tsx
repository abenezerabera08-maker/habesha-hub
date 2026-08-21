import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TicketsList from './TicketsList'

type OrderRow = {
  id: string; event_id: string; ticket_tier_id: string; quantity: number
  total_price: number; status: string; created_at: string | null
  tk_code: string | null; checked_in_at: string | null
}

type EventRow = { id: string; title: string; event_date: string; location: string | null; image_url: string | null }
type TierRow = { id: string; name: string; price: number }

export type Order = {
  id: string; quantity: number; total_price: number; status: string
  created_at: string | null; tk_code: string | null; checked_in_at: string | null
  event: EventRow | null; tier: TierRow | null; rejection_reason: string | null
}

export default async function MyTicketsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: orderData, error: orderError } = await supabase
    .from('orders')
    .select('id, event_id, ticket_tier_id, quantity, total_price, status, created_at, tk_code, checked_in_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const rawOrders = (orderData ?? []) as OrderRow[]
  let orders: Order[] = []
  let error = orderError ? 'Failed to load your tickets. Please try again.' : ''

  if (!orderError && rawOrders.length > 0) {
    const eventIds = [...new Set(rawOrders.map((o) => o.event_id))]
    const tierIds = [...new Set(rawOrders.map((o) => o.ticket_tier_id))]

    const [eventsRes, tiersRes] = await Promise.all([
      supabase.from('events').select('id, title, event_date, location, image_url').in('id', eventIds),
      supabase.from('ticket_tiers').select('id, name, price').in('id', tierIds),
    ])

    if (eventsRes.error || tiersRes.error) {
      error = 'Failed to load event details. Please try again.'
    } else {
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

      orders = rawOrders.map((r) => ({
        id: r.id, quantity: r.quantity, total_price: r.total_price, status: r.status,
        created_at: r.created_at, tk_code: r.tk_code, checked_in_at: r.checked_in_at,
        event: eventMap.get(r.event_id) ?? null,
        tier: tierMap.get(r.ticket_tier_id) ?? null,
        rejection_reason: orderRejectionMap.get(r.id) ?? null,
      }))
    }
  }

  return <TicketsList orders={orders} error={error} />
}
