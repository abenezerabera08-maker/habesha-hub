import type { NextRequest } from 'next/server'
import { ApiFailure, requireAdmin, runApi } from '@/lib/api'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  return runApi(async () => {
    const { db } = await requireAdmin(request)

    const body = await request.json().catch(() => null)
    const eventId = body?.eventId
    if (typeof eventId !== 'string' || !eventId) {
      throw new ApiFailure('Missing event id.', 400)
    }

    const { data: event } = await db
      .from('events')
      .select('id, status')
      .eq('id', eventId)
      .maybeSingle()
    if (!event) {
      throw new ApiFailure('Event not found.', 404)
    }
    if (event.status !== 'pending_review') {
      throw new ApiFailure('Only pending-review events can be approved.', 400)
    }

    const { count: tierCount } = await db
      .from('ticket_tiers')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
    const { count: pmCount } = await db
      .from('event_payment_methods')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)

    if ((tierCount ?? 0) === 0) {
      throw new ApiFailure('This event has no ticket types — add at least one before publishing.', 400)
    }
    if ((pmCount ?? 0) === 0) {
      throw new ApiFailure('This event has no payment methods — add at least one before publishing.', 400)
    }

    const { data, error } = await db
      .from('events')
      .update({ status: 'published', published_at: new Date().toISOString() })
      .eq('id', eventId)
      .select('id, status')
      .single()

    if (error) {
      throw new ApiFailure(`Publishing the event: ${error.message}`, 500)
    }
    if (data?.status !== 'published') {
      throw new ApiFailure('Publishing the event: the change was blocked.', 500)
    }

    return Response.json({ ok: true, data: { eventId: data.id } })
  })
}
