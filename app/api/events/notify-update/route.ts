import type { NextRequest } from 'next/server'
import { ApiFailure, requireUser, runApi } from '@/lib/api'
import { createNotifications } from '@/lib/services/notifications'
import type { CreateNotificationsInput } from '@/lib/types/notifications'

export const runtime = 'nodejs'

/**
 * Sends event update / reschedule notifications to all affected attendees.
 *
 * Called by the client AFTER a successful event update. The client passes:
 *   - eventId
 *   - previousDate / previousEndDate  (what they were BEFORE the update)
 *
 * The server fetches the CURRENT event data, determines whether the date
 * changed (reschedule) vs. other fields changed (generic update), finds all
 * users with confirmed orders for the event, and bulk-inserts notifications.
 *
 * Failure to send notifications must NOT cause the caller to treat the
 * event update as failed. The client should call this fire-and-forget.
 */
export async function POST(request: NextRequest) {
  return runApi(async () => {
    const { user, db } = await requireUser(request)

    const body = await request.json().catch(() => null)
    const eventId = body?.eventId as string | undefined
    const previousDate = body?.previousDate as string | undefined
    const previousEndDate = body?.previousEndDate as string | undefined

    if (!eventId) throw new ApiFailure('Missing event id.', 400)

    // Verify the user is the organizer of this event
    const { data: event } = await db
      .from('events')
      .select('id, title, organizer_id, event_date, end_at')
      .eq('id', eventId)
      .maybeSingle()
    if (!event) throw new ApiFailure('Event not found.', 404)
    if (event.organizer_id !== user.id) throw new ApiFailure('Forbidden.', 403)

    // Find all unique users with confirmed orders for this event
    const { data: orders } = await db
      .from('orders')
      .select('user_id')
      .eq('event_id', eventId)
      .eq('status', 'confirmed')

    if (!orders || orders.length === 0) {
      return Response.json({ ok: true, data: { notified: 0 } })
    }

    // Deduplicate user IDs (a user could have multiple orders)
    const uniqueUserIds = [...new Set(orders.map((o) => o.user_id))]

    // Determine notification type: reschedule if date changed, otherwise generic update
    const currentDate = event.event_date as string
    const currentEndDate = event.end_at as string | null
    const dateChanged =
      previousDate !== undefined && currentDate !== previousDate
    const endDateChanged =
      previousEndDate !== undefined && currentEndDate !== previousEndDate
    const isReschedule = dateChanged || endDateChanged

    const eventName = event.title

    const notifications: CreateNotificationsInput = uniqueUserIds.map((userId) => ({
      userId,
      type: isReschedule ? 'event_rescheduled' : 'event_updated',
      title: isReschedule ? 'Event rescheduled' : 'Event updated',
      message: isReschedule
        ? `${eventName} has been rescheduled. Please check the new date and time.`
        : `${eventName} has been updated. Check the event page for details.`,
      data: {
        event_id: eventId,
        event_name: eventName,
        ...(isReschedule && { newDate: currentDate, newEndDate: currentEndDate, previousDate, previousEndDate }),
      },
    }))

    const result = await createNotifications(notifications)

    if (!result.ok) {
      // Log but don't fail the request — notification failure must not break the event update
      console.error('Event update notifications failed:', result.error)
      return Response.json({ ok: true, data: { notified: 0 } })
    }

    return Response.json({ ok: true, data: { notified: result.data.created } })
  })
}
