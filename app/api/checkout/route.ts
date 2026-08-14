import type { NextRequest } from 'next/server'
import { ApiFailure, requireUser, runApi } from '@/lib/api'

export const runtime = 'nodejs'

const MAX_QUANTITY_PER_ORDER = 100

export async function POST(request: NextRequest) {
  return runApi(async () => {
    const { user, db } = await requireUser(request)

    const body = await request.json().catch(() => null)
    const eventId = body?.eventId
    const tierId = body?.tierId
    const quantity = body?.quantity
    const paymentMethodId = body?.paymentMethodId

    if (typeof eventId !== 'string' || !eventId) {
      throw new ApiFailure('Missing event id.', 400)
    }
    if (typeof tierId !== 'string' || !tierId) {
      throw new ApiFailure('Missing ticket type id.', 400)
    }
    if (typeof paymentMethodId !== 'string' || !paymentMethodId) {
      throw new ApiFailure('Missing payment method id.', 400)
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY_PER_ORDER) {
      throw new ApiFailure(`Quantity must be a whole number between 1 and ${MAX_QUANTITY_PER_ORDER}.`, 400)
    }

    const { data: event } = await db
      .from('events')
      .select('id, status')
      .eq('id', eventId)
      .maybeSingle()
    if (!event || event.status !== 'published') {
      throw new ApiFailure('This event is not accepting purchases.', 400)
    }

    const { data: tier } = await db
      .from('purchasable_ticket_tiers')
      .select('id, price, quantity_remaining, max_per_order')
      .eq('id', tierId)
      .eq('event_id', eventId)
      .maybeSingle()
    if (!tier) {
      throw new ApiFailure('This ticket type is not available for purchase.', 400)
    }

    const maxPerOrder = tier.max_per_order ?? tier.quantity_remaining
    if (quantity > maxPerOrder) {
      throw new ApiFailure(`This ticket type is limited to ${maxPerOrder} per order.`, 400)
    }
    if (quantity > tier.quantity_remaining) {
      throw new ApiFailure('Not enough tickets remaining for that quantity.', 400)
    }

    const { data: paymentMethod } = await db
      .from('event_payment_methods')
      .select('id')
      .eq('id', paymentMethodId)
      .eq('event_id', eventId)
      .eq('is_active', true)
      .maybeSingle()
    if (!paymentMethod) {
      throw new ApiFailure('That payment method is not available for this event.', 400)
    }

    const { data: order, error } = await db
      .from('orders')
      .insert({
        user_id: user.id,
        event_id: eventId,
        ticket_tier_id: tierId,
        quantity,
        total_price: tier.price * quantity,
        status: 'pending_payment',
      })
      .select('id')
      .single()

    if (error) {
      throw new ApiFailure(`Creating your order: ${error.message}`, 500)
    }

    return Response.json({ ok: true, data: { orderId: order.id } })
  })
}
