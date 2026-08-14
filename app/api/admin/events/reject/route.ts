import type { NextRequest } from 'next/server'
import { ApiFailure, requireAdmin, runApi } from '@/lib/api'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  return runApi(async () => {
    const { db } = await requireAdmin(request)

    const body = await request.json().catch(() => null)
    const eventId = body?.eventId
    const reason = body?.reason
    if (typeof eventId !== 'string' || !eventId) {
      throw new ApiFailure('Missing event id.', 400)
    }
    if (typeof reason !== 'string') {
      throw new ApiFailure('Invalid rejection reason.', 400)
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
      throw new ApiFailure('Only pending-review events can be rejected.', 400)
    }

    const { data, error } = await db
      .from('events')
      .update({ status: 'rejected', rejection_reason: reason.trim() || null })
      .eq('id', eventId)
      .select('id, status')
      .single()

    if (error) {
      throw new ApiFailure(`Rejecting the event: ${error.message}`, 500)
    }
    if (data?.status !== 'rejected') {
      throw new ApiFailure('Rejecting the event: the change was blocked.', 500)
    }

    return Response.json({ ok: true, data: { eventId: data.id } })
  })
}
