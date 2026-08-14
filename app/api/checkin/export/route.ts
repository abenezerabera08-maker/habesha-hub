import type { NextRequest } from 'next/server'
import { ApiFailure, requireUser, runApi } from '@/lib/api'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  return runApi(async () => {
    const { user, db } = await requireUser(request)
    const eventId = request.nextUrl.searchParams.get('eventId')
    if (!eventId) throw new ApiFailure('Missing event id.', 400)

    const { data: event } = await db.from('events').select('id, title, organizer_id').eq('id', eventId).maybeSingle()
    if (!event) throw new ApiFailure('Event not found.', 404)
    if (event.organizer_id !== user.id) {
      const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle()
      if (profile?.role !== 'admin') throw new ApiFailure('Forbidden.', 403)
    }

    const { data: orders } = await db
      .from('orders')
      .select('id, tk_code, quantity, total_price, checked_in_at, user_id, ticket_tier_id')
      .eq('event_id', eventId)
      .eq('status', 'confirmed')
      .order('tk_code')

    const rows = orders ?? []
    const userIds = [...new Set(rows.map(r => r.user_id))]
    const tierIds = [...new Set(rows.map(r => r.ticket_tier_id))]

    const [{ data: profiles }, { data: tiers }] = await Promise.all([
      db.from('profiles').select('id, full_name').in('id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000']),
      db.from('ticket_tiers').select('id, name').in('id', tierIds.length ? tierIds : ['00000000-0000-0000-0000-000000000000']),
    ])
    const nameMap = new Map((profiles ?? []).map(p => [p.id, p.full_name]))
    const tierMap = new Map((tiers ?? []).map(t => [t.id, t.name]))

    const header = 'TK Code,Attendee,Ticket Type,Quantity,Total (ETB),Checked In\n'
    const csvRows = rows.map(r => {
      const name = (nameMap.get(r.user_id) ?? 'Unknown').replace(/,/g, ' ')
      const tierName = (tierMap.get(r.ticket_tier_id) ?? 'Unknown').replace(/,/g, ' ')
      const checked = r.checked_in_at ? new Date(r.checked_in_at).toLocaleString() : 'No'
      return `${r.tk_code ?? ''},${name},${tierName},${r.quantity},${r.total_price},${checked}`
    })
    const csv = header + csvRows.join('\n')

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${event.title.replace(/[^a-z0-9]/gi, '_')}-attendees.csv"`,
      },
    })
  })
}
