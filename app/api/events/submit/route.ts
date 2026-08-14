import type { NextRequest } from 'next/server'
import { ApiFailure, requireUser, runApi } from '@/lib/api'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  return runApi(async () => {
    const { user, db } = await requireUser(request)

    const body = await request.json().catch(() => null)
    const eventId = body?.eventId
    if (typeof eventId !== 'string' || !eventId) {
      throw new ApiFailure('Missing event id.', 400)
    }

    const { data: event } = await db
      .from('events')
      .select('id, organizer_id, status')
      .eq('id', eventId)
      .maybeSingle()
    if (!event) {
      throw new ApiFailure('Event not found.', 404)
    }
    if (event.organizer_id !== user.id) {
      throw new ApiFailure('Forbidden.', 403)
    }
    if (event.status === 'published') {
      throw new ApiFailure('A published event cannot be resubmitted.', 400)
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
      throw new ApiFailure('Add at least one ticket type before submitting for review.', 400)
    }
    if ((pmCount ?? 0) === 0) {
      throw new ApiFailure('Add at least one payment method before submitting for review.', 400)
    }

    const { data, error } = await db
      .from('events')
      .update({ status: 'pending_review' })
      .eq('id', eventId)
      .select('id, status')
      .single()

    if (error) {
      throw new ApiFailure(`Submitting for review: ${error.message}`, 500)
    }
    if (data?.status !== 'pending_review') {
      throw new ApiFailure('Submitting for review: the change was blocked.', 500)
    }

    return Response.json({ ok: true, data: { id: data.id } })
  })
}
