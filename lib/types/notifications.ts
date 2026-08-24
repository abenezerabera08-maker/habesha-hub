/**
 * Notification type values — must stay in sync with the
 * notifications_type_check CHECK constraint in
 * supabase/migrations/20260824_notifications.sql
 */
export const NOTIFICATION_TYPES = [
  // Attendee
  'ticket_purchased',
  'payment_confirmed',
  'event_updated',
  'event_reminder',
  'ticket_checked_in',
  'event_cancelled',
  'event_rescheduled',
  // Organizer
  'new_ticket_sale',
  'payment_received',
  'attendee_checked_in',
] as const

export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

/** A row from the notifications table. */
export type NotificationRow = {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  data: Record<string, unknown> | null
  read_at: string | null
  created_at: string
}

/** Input for creating a single notification. id, read_at, created_at are DB-generated. */
export type CreateNotificationInput = {
  userId: string
  type: NotificationType
  title: string
  message: string
  data?: Record<string, unknown> | null
}

/** Input for bulk-creating notifications (same shape as single, repeated per user). */
export type CreateNotificationsInput = CreateNotificationInput[]

// ─── Notification preferences ────────────────────────────────────────────────

/**
 * Preference categories — each category groups one or more notification types.
 * The DB stores one row per (user_id, category). Absence of a row = enabled.
 */
export const NOTIFICATION_CATEGORIES = [
  'event_reminder',
  'ticket_activity',
  'payments',
  'event_changes',
  'organizer_activity',
] as const

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number]

/** A row from the notification_preferences table. */
export type NotificationPreferenceRow = {
  user_id: string
  category: NotificationCategory
  enabled: boolean
  in_app_enabled: boolean
  email_enabled: boolean
}

/** Maps each notification type to its parent category. */
export const TYPE_TO_CATEGORY: Record<NotificationType, NotificationCategory> = {
  event_reminder: 'event_reminder',
  ticket_purchased: 'ticket_activity',
  ticket_checked_in: 'ticket_activity',
  payment_confirmed: 'payments',
  payment_received: 'payments',
  event_updated: 'event_changes',
  event_rescheduled: 'event_changes',
  event_cancelled: 'event_changes',
  new_ticket_sale: 'organizer_activity',
  attendee_checked_in: 'organizer_activity',
}

/** Category UI metadata — labels and descriptions for the preferences page. */
export const CATEGORY_META: Record<
  NotificationCategory,
  { label: string; description: string; icon: string }
> = {
  event_reminder: {
    label: 'Event reminders',
    description: 'Get reminded about events you have tickets for.',
    icon: 'Clock',
  },
  ticket_activity: {
    label: 'Ticket activity',
    description: 'Updates about your tickets and check-ins.',
    icon: 'Ticket',
  },
  payments: {
    label: 'Payments',
    description: 'Updates about ticket payments and confirmations.',
    icon: 'CreditCard',
  },
  event_changes: {
    label: 'Event changes',
    description: 'Important changes to events you are attending.',
    icon: 'CalendarClock',
  },
  organizer_activity: {
    label: 'Organizer activity',
    description: 'Sales and check-in activity for your events.',
    icon: 'Users',
  },
}

// ─── Email channel ─────────────────────────────────────────────────────────────

/**
 * Notification types that are eligible for email delivery in V1.
 * Types NOT in this list will never create an email delivery record.
 */
export const EMAIL_ELIGIBLE_TYPES: Set<NotificationType> = new Set([
  // Attendee
  'payment_confirmed',
  'event_rescheduled',
  'event_cancelled',
  'event_reminder',
  // Organizer
  'new_ticket_sale',
  'payment_received',
])

/**
 * Email preference metadata — which categories support email,
 * and the default email state for each.
 */
export const EMAIL_CATEGORY_META: Record<
  NotificationCategory,
  { emailSupported: boolean; emailDefault: boolean }
> = {
  event_reminder: { emailSupported: true, emailDefault: true },
  ticket_activity: { emailSupported: false, emailDefault: false },
  payments: { emailSupported: true, emailDefault: true },
  event_changes: { emailSupported: true, emailDefault: true },
  organizer_activity: { emailSupported: true, emailDefault: true },
}

// ─── Email delivery ────────────────────────────────────────────────────────────

/** Delivery status values — text + CHECK constraint convention. */
export const EMAIL_DELIVERY_STATUSES = ['pending', 'processing', 'sent', 'failed'] as const
export type EmailDeliveryStatus = (typeof EMAIL_DELIVERY_STATUSES)[number]

/** A row from the notification_email_deliveries table. */
export type EmailDeliveryRow = {
  id: string
  notification_id: string
  user_id: string
  recipient_email: string
  status: EmailDeliveryStatus
  attempts: number
  max_attempts: number
  last_error: string | null
  provider_id: string | null
  created_at: string
  updated_at: string
  sent_at: string | null
}

/** Input for creating email delivery records. */
export type CreateEmailDeliveryInput = {
  notificationId: string
  userId: string
  recipientEmail: string
}
