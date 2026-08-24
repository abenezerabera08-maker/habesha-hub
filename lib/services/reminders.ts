/**
 * Scheduled event reminder worker.
 *
 * Designed to run periodically (e.g. every 10 minutes via Supabase pg_cron
 * or an external scheduler). Finds events starting within 25 hours that have
 * confirmed attendees, checks for existing reminders to prevent duplicates,
 * and bulk-creates missing notifications.
 *
 * Idempotency: queries existing event_reminder notifications for the window
 * before inserting. Concurrent runs may produce at most 1 duplicate per
 * user/event pair (acceptable for V1; deduplicate client-side).
 *
 * Server-side only — uses adminClient() with service_role.
 */

import { adminClient } from '@/lib/api'
import { fail, type DbResult } from '@/lib/db'
import type { CreateNotificationsInput } from '@/lib/types/notifications'
import { createNotifications } from '@/lib/services/notifications'

export type ReminderResult = {
  eventsChecked: number
  eligibleAttendees: number
  remindersCreated: number
}

/**
 * Process pending event reminders.
 *
 * Query window: events starting between now and 25 hours from now
 * (1-hour buffer accommodates scheduler delays).
 *
 * Eligible attendees: orders with status = 'confirmed' for published events.
 * Excluded: attendees who already have an event_reminder notification for
 * the same event (idempotency guard).
 */
export async function processEventReminders(): Promise<DbResult<ReminderResult>> {
  const db = adminClient()

  // 1. Find published events starting within 25 hours that haven't started yet
  const now = new Date()
  const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000)

  const { data: events, error: eventsError } = await db
    .from('events')
    .select('id, title, event_date')
    .eq('status', 'published')
    .gte('event_date', now.toISOString())
    .lte('event_date', windowEnd.toISOString())

  if (eventsError) return fail('Querying events for reminders: ' + eventsError.message)
  if (!events || events.length === 0) return { ok: true, data: { eventsChecked: 0, eligibleAttendees: 0, remindersCreated: 0 } }

  const eventIds = events.map((e) => e.id)

  // 2. Get confirmed attendees for these events in a single query
  const { data: orders, error: ordersError } = await db
    .from('orders')
    .select('user_id, event_id')
    .in('event_id', eventIds)
    .eq('status', 'confirmed')

  if (ordersError) return fail('Querying orders for reminders: ' + ordersError.message)

  // Deduplicate: each user gets at most one reminder per event
  const attendeesByEvent = new Map<string, Set<string>>()
  for (const order of orders ?? []) {
    const existing = attendeesByEvent.get(order.event_id)
    if (existing) {
      existing.add(order.user_id)
    } else {
      attendeesByEvent.set(order.event_id, new Set([order.user_id]))
    }
  }

  // 3. Find existing reminders to prevent duplicates
  const allUserEventPairs: { userId: string; eventId: string }[] = []
  for (const event of events) {
    const users = attendeesByEvent.get(event.id)
    if (!users) continue
    for (const userId of users) {
      allUserEventPairs.push({ userId, eventId: event.id })
    }
  }

  if (allUserEventPairs.length === 0) {
    return { ok: true, data: { eventsChecked: events.length, eligibleAttendees: 0, remindersCreated: 0 } }
  }

  // event_id is inside jsonb data, not a top-level column — fetch all
  // event_reminder rows and filter client-side (small result set).
  const { data: existingReminders, error: remindersError } = await db
    .from('notifications')
    .select('user_id, data')
    .eq('type', 'event_reminder')

  const eventIdSet = new Set(eventIds)
  const alreadyNotified = new Set<string>()
  if (!remindersError && existingReminders) {
    for (const r of existingReminders) {
      const eventId = (r.data as Record<string, unknown>)?.event_id
      if (typeof eventId === 'string' && eventIdSet.has(eventId)) {
        alreadyNotified.add(`${r.user_id}:${eventId}`)
      }
    }
  }

  // 4. Build notifications for attendees who haven't been reminded yet
  const toInsert: CreateNotificationsInput = []
  const eventMap = new Map(events.map((e) => [e.id, e]))

  for (const { userId, eventId } of allUserEventPairs) {
    if (alreadyNotified.has(`${userId}:${eventId}`)) continue

    const event = eventMap.get(eventId)
    if (!event) continue

    const startDate = new Date(event.event_date)
    const dateStr = startDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
    const timeStr = startDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })

    toInsert.push({
      userId,
      type: 'event_reminder',
      title: `Reminder: ${event.title}`,
      message: `Your event "${event.title}" starts tomorrow at ${timeStr} on ${dateStr}. Get ready!`,
      data: {
        event_id: eventId,
        event_title: event.title,
        event_date: event.event_date,
      },
    })
  }

  if (toInsert.length === 0) {
    return { ok: true, data: { eventsChecked: events.length, eligibleAttendees: allUserEventPairs.length, remindersCreated: 0 } }
  }

  // 5. Bulk insert via centralized service (respects notification preferences)
  const result = await createNotifications(toInsert)
  if (!result.ok) return fail('Inserting reminders: ' + result.error)

  return {
    ok: true,
    data: {
      eventsChecked: events.length,
      eligibleAttendees: allUserEventPairs.length,
      remindersCreated: result.data.created,
    },
  }
}
