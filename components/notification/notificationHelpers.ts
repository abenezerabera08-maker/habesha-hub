/**
 * Notification UI helpers — icon mapping, relative timestamps, navigation targets.
 * Shared by NotificationBell, NotificationPanel, NotificationItem, and /notifications page.
 */
import {
  Ticket,
  CreditCard,
  CalendarClock,
  Clock,
  CheckCircle2,
  AlertCircle,
  CalendarX2,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { NotificationType } from '@/lib/types/notifications'

// ─── Icon mapping ─────────────────────────────────────────────────────────────

const ICON_MAP: Record<NotificationType, LucideIcon> = {
  ticket_purchased: Ticket,
  payment_confirmed: CreditCard,
  event_updated: CalendarClock,
  event_reminder: Clock,
  ticket_checked_in: CheckCircle2,
  event_cancelled: CalendarX2,
  event_rescheduled: CalendarClock,
  new_ticket_sale: Ticket,
  payment_received: CreditCard,
  attendee_checked_in: Users,
}

export function getNotificationIcon(type: NotificationType): LucideIcon {
  return ICON_MAP[type] ?? Ticket
}

// ─── Relative time ────────────────────────────────────────────────────────────

export function relativeTime(iso: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diffMs = now - then

  if (diffMs < 0) return 'just now'

  const seconds = Math.floor(diffMs / 1000)
  if (seconds < 60) return 'just now'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return minutes === 1 ? '1 min ago' : `${minutes} min ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return hours === 1 ? '1 hr ago' : `${hours} hr ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return days === 1 ? 'yesterday' : `${days} days ago`

  const weeks = Math.floor(days / 7)
  if (weeks < 4) return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`

  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

// ─── Navigation targets ───────────────────────────────────────────────────────

/**
 * Determine where a notification should navigate the user.
 * Returns null if the notification has no meaningful destination.
 */
export function getNotificationHref(
  type: NotificationType,
  data: Record<string, unknown> | null
): string | null {
  const eventId = data?.event_id as string | undefined
  const orderId = data?.order_id as string | undefined

  switch (type) {
    case 'ticket_purchased':
    case 'payment_confirmed':
    case 'ticket_checked_in':
      return orderId ? `/my-tickets/${orderId}` : '/my-tickets'

    case 'new_ticket_sale':
    case 'payment_received':
    case 'attendee_checked_in':
      return eventId ? `/events/${eventId}/edit` : null

    case 'event_updated':
    case 'event_reminder':
    case 'event_rescheduled':
      return eventId ? `/events/${eventId}` : null

    case 'event_cancelled':
      return eventId ? `/events/${eventId}` : null

    default:
      return null
  }
}
