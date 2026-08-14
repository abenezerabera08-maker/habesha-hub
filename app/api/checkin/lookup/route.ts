import type { NextRequest } from 'next/server'
import { ApiFailure, requireUser, runApi } from '@/lib/api'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  return runApi(async () => {
    const { user, db } = await requireUser(request)
    const body = await request.json().catch(() => null)
    const tkCode = typeof body?.tkCode === 'string' ? body.tkCode.trim().toUpperCase() : ''
    if (!tkCode) throw new ApiFailure('Missing code.', 400)

    const { data: order } = await db
      .from('orders')
      .select('id, status, quantity, total_price, event_id, user_id, ticket_tier_id, tk_code, checked_in_at, checked_in_by')
      .eq('tk_code', tkCode)
      .maybeSingle()
    if (!order) throw new ApiFailure('No order found for that code.', 404)

    const { data: event } = await db
      .from('events')
      .select('id, title, organizer_id')
      .eq('id', order.event_id)
      .maybeSingle()
    if (!event) throw new ApiFailure('Event not found.', 404)

    if (event.organizer_id !== user.id) {
      const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle()
      if (profile?.role !== 'admin') throw new ApiFailure('Forbidden.', 403)
    }

    const [{ data: attendee }, { data: tier }, { data: checkedInByProfile }] = await Promise.all([
      db.from('profiles').select('full_name').eq('id', order.user_id).maybeSingle(),
      db.from('ticket_tiers').select('name').eq('id', order.ticket_tier_id).maybeSingle(),
      order.checked_in_by
        ? db.from('profiles').select('full_name').eq('id', order.checked_in_by).maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    return Response.json({
      ok: true,
      data: {
        orderId: order.id,
        eventTitle: event.title,
        attendeeName: attendee?.full_name ?? 'Unknown',
        tierName: tier?.name ?? 'Unknown',
        quantity: order.quantity,
        totalPrice: order.total_price,
        checkedInAt: order.checked_in_at,
        checkedInByName: checkedInByProfile?.full_name ?? null,
      },
    })
  })
}
