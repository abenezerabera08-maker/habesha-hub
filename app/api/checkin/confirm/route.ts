import type { NextRequest } from 'next/server'
import { ApiFailure, requireUser, runApi } from '@/lib/api'
import { createNotification } from '@/lib/services/notifications'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  return runApi(async () => {
    const { user, db } = await requireUser(request)
    const body = await request.json().catch(() => null)
    const orderId = typeof body?.orderId === 'string' ? body.orderId : ''
    if (!orderId) throw new ApiFailure('Missing order id.', 400)

    const { data: order } = await db
      .from('orders')
      .select('id, event_id, checked_in_at')
      .eq('id', orderId)
      .maybeSingle()
    if (!order) throw new ApiFailure('Order not found.', 404)
    if (order.checked_in_at) throw new ApiFailure('This order was already checked in.', 400)

    const { data: event } = await db
      .from('events')
      .select('organizer_id')
      .eq('id', order.event_id)
      .maybeSingle()
    if (!event) throw new ApiFailure('Event not found.', 404)
    if (event.organizer_id !== user.id) {
      const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle()
      if (profile?.role !== 'admin') throw new ApiFailure('Forbidden.', 403)
    }

    const now = new Date().toISOString()
    const { data, error } = await db
      .from('orders')
      .update({ checked_in_at: now, checked_in_by: user.id })
      .eq('id', orderId)
      .select('id, checked_in_at')
      .single()

    if (error) throw new ApiFailure(`Checking in: ${error.message}`, 500)
    if (!data?.checked_in_at) throw new ApiFailure('Checking in: the change was blocked.', 500)

    // Notification: ticket checked in
    // Get event details and buyer info
    const { data: eventData } = await db
      .from('events')
      .select('title, organizer_id')
      .eq('id', order.event_id)
      .maybeSingle()

    // Get the buyer from the order
    const { data: orderFull } = await db
      .from('orders')
      .select('user_id')
      .eq('id', orderId)
      .maybeSingle()

    if (eventData && orderFull) {
      const eventName = eventData.title
      // Attendee notification
      createNotification({
        userId: orderFull.user_id,
        type: 'ticket_checked_in',
        title: 'Ticket checked in',
        message: `Your ticket for ${eventName} has been checked in.`,
        data: { event_id: order.event_id, order_id: orderId },
      }).catch((err) => console.error('Notification failed (ticket_checked_in):', err.message))

      // Organizer notification
      createNotification({
        userId: eventData.organizer_id,
        type: 'attendee_checked_in',
        title: 'Attendee checked in',
        message: `An attendee has checked in to ${eventName}.`,
        data: { event_id: order.event_id, order_id: orderId, attendee_id: orderFull.user_id },
      }).catch((err) => console.error('Notification failed (attendee_checked_in):', err.message))
    }

    return Response.json({ ok: true, data: { orderId: data.id, checkedInAt: data.checked_in_at } })
  })
}
