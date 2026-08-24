import type { NextRequest } from 'next/server'
import { ApiFailure, requireUser, runApi } from '@/lib/api'
import { createNotification } from '@/lib/services/notifications'

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
    const isFree = body?.free === true

    if (typeof eventId !== 'string' || !eventId) {
      throw new ApiFailure('Missing event id.', 400)
    }
    if (typeof tierId !== 'string' || !tierId) {
      throw new ApiFailure('Missing ticket type id.', 400)
    }
    if (!isFree && (typeof paymentMethodId !== 'string' || !paymentMethodId)) {
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
      .select('id, name, price, quantity_remaining, max_per_order')
      .eq('id', tierId)
      .eq('event_id', eventId)
      .maybeSingle()
    if (!tier) {
      throw new ApiFailure('This ticket type is not available for purchase.', 400)
    }

    const isTierFree = tier.price === 0
    if (isFree && !isTierFree) {
      throw new ApiFailure('This ticket is not free.', 400)
    }

    const maxPerOrder = tier.max_per_order ?? tier.quantity_remaining
    if (quantity > maxPerOrder) {
      throw new ApiFailure(`This ticket type is limited to ${maxPerOrder} per order.`, 400)
    }
    if (quantity > tier.quantity_remaining) {
      throw new ApiFailure('Not enough tickets remaining for that quantity.', 400)
    }

    if (!isFree) {
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
    }

    const orderStatus = isFree ? 'confirmed' : 'pending_payment'

    const { data: order, error } = await db
      .from('orders')
      .insert({
        user_id: user.id,
        event_id: eventId,
        ticket_tier_id: tierId,
        quantity,
        total_price: tier.price * quantity,
        status: orderStatus,
      })
      .select('id')
      .single()

    if (error) {
      throw new ApiFailure(`Creating your order: ${error.message}`, 500)
    }

    // Notification: ticket purchased (free tickets are immediately confirmed)
    if (orderStatus === 'confirmed') {
      const { data: eventData } = await db
        .from('events')
        .select('title, organizer_id')
        .eq('id', eventId)
        .maybeSingle()

      if (eventData) {
        const eventName = eventData.title
        // Attendee notification
        createNotification({
          userId: user.id,
          type: 'ticket_purchased',
          title: 'Ticket purchased',
          message: `Your ticket for ${eventName} has been purchased successfully.`,
          data: {
            event_id: eventId,
            order_id: order.id,
            tier_id: tierId,
            event_name: eventName,
            tier_name: tier.name ?? null,
            quantity,
            total_price: tier.price * quantity,
          },
        }).catch((err) => console.error('Notification failed (ticket_purchased):', err.message))

        // Organizer notification
        createNotification({
          userId: eventData.organizer_id,
          type: 'new_ticket_sale',
          title: 'New ticket sale',
          message: `A new ticket was purchased for ${eventName}.`,
          data: {
            event_id: eventId,
            order_id: order.id,
            tier_id: tierId,
            event_name: eventName,
            tier_name: tier.name ?? null,
            quantity,
            buyer_name: null,
          },
        }).catch((err) => console.error('Notification failed (new_ticket_sale):', err.message))
      }
    }

    return Response.json({ ok: true, data: { orderId: order.id } })
  })
}
