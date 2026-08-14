import type { NextRequest } from 'next/server'
import { ApiFailure, requireUser, runApi } from '@/lib/api'

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

    return Response.json({ ok: true, data: { orderId: data.id, checkedInAt: data.checked_in_at } })
  })
}
