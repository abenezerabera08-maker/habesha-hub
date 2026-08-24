/**
 * Centralized notification service.
 *
 * Server-side only -- INSERT requires service_role (bypasses RLS).
 * Read/update operations use adminClient() with explicit user_id checks,
 * matching the requireUser() + db pattern used throughout lib/api routes.
 *
 * All functions return DbResult<T> and never swallow errors.
 *
 * Email delivery: after creating a notification, if the type is email-eligible
 * and the user has email enabled for the category, an email delivery record is
 * created in the notification_email_deliveries table. The email worker processes
 * these records asynchronously.
 */

import { adminClient } from '@/lib/api'
import { fail, type DbResult } from '@/lib/db'
import type {
  NotificationRow,
  CreateNotificationInput,
  CreateNotificationsInput,
  NotificationCategory,
  NotificationPreferenceRow,
  NotificationType,
  CreateEmailDeliveryInput,
} from '@/lib/types/notifications'
import { NOTIFICATION_TYPES, TYPE_TO_CATEGORY, EMAIL_ELIGIBLE_TYPES } from '@/lib/types/notifications'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

// ─── Preference helpers ───────────────────────────────────────────────────────

type UserPreferences = {
  inApp: Map<string, boolean>
  email: Map<string, boolean>
}

/**
 * Fetch all notification preferences for a user.
 * Returns maps for both channels: inApp and email.
 * Absence of a category in either map means enabled (default opt-in).
 */
async function getUserPreferences(
  db: ReturnType<typeof adminClient>,
  userId: string
): Promise<UserPreferences> {
  const { data } = await db
    .from('notification_preferences')
    .select('category, in_app_enabled, email_enabled')
    .eq('user_id', userId)

  const inApp = new Map<string, boolean>()
  const email = new Map<string, boolean>()
  if (data) {
    for (const row of data) {
      inApp.set(row.category, row.in_app_enabled)
      email.set(row.category, row.email_enabled)
    }
  }
  return { inApp, email }
}

/**
 * Check if email notification is enabled for a user.
 * Returns true if enabled (or no preference stored — default opt-in).
 */
function isEmailEnabled(prefs: UserPreferences, type: NotificationType): boolean {
  const category = TYPE_TO_CATEGORY[type]
  return prefs.email.get(category) ?? true
}

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Create a single notification for one user.
 *
 * Always inserts the notification row — in-app preference filtering happens
 * at read time (getNotificationsPage, getUnreadNotificationCount) so that
 * email delivery always has a valid notification FK.
 *
 * If the type is email-eligible and the user has email enabled, also creates
 * an email delivery record (fire-and-forget — email failure never blocks).
 */
export async function createNotification(
  input: CreateNotificationInput
): Promise<DbResult<NotificationRow | null>> {
  const db = adminClient()

  const prefs = await getUserPreferences(db, input.userId)

  const { data, error } = await db
    .from('notifications')
    .insert({
      user_id: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      data: input.data ?? null,
    })
    .select('id, user_id, type, title, message, data, read_at, created_at')
    .single()

  if (error) return fail('Creating notification: ' + error.message)

  // Queue email delivery if eligible and enabled (fire-and-forget)
  if (EMAIL_ELIGIBLE_TYPES.has(input.type) && isEmailEnabled(prefs, input.type)) {
    queueEmailDelivery(db, input.userId, input.type, input.data, data.id).catch((err) =>
      console.error('[Email] Failed to queue delivery:', err.message)
    )
  }

  return { ok: true, data: data as NotificationRow }
}

/**
 * Bulk-create notifications for multiple users.
 * Always inserts all rows — in-app preference filtering happens at read time.
 * Useful when a single event (e.g. event update) needs to notify many attendees.
 * Returns the count of successfully created notifications.
 *
 * Also queues email deliveries for email-eligible notifications.
 */
export async function createNotifications(
  inputs: CreateNotificationsInput
): Promise<DbResult<{ created: number }>> {
  if (inputs.length === 0) return { ok: true, data: { created: 0 } }

  const db = adminClient()

  const rows = inputs.map((input) => ({
    user_id: input.userId,
    type: input.type,
    title: input.title,
    message: input.message,
    data: input.data ?? null,
  }))

  const { data, error } = await db
    .from('notifications')
    .insert(rows)
    .select('id, user_id, type')

  if (error) return fail('Creating notifications: ' + error.message)

  // Queue email deliveries for eligible notifications (fire-and-forget)
  const createdRows = (data ?? []) as { id: string; user_id: string; type: NotificationType }[]
  const emailInputs = inputs
    .map((input, i) => {
      const row = createdRows[i]
      if (!row) return null
      return { input, notificationId: row.id, userId: row.user_id }
    })
    .filter(Boolean) as { input: CreateNotificationInput; notificationId: string; userId: string }[]

  if (emailInputs.length > 0) {
    // Fetch email preferences for all recipients
    const uniqueUserIds = [...new Set(emailInputs.map((e) => e.userId))]
    const prefResults = await Promise.all(
      uniqueUserIds.map(async (uid) => {
        const prefs = await getUserPreferences(db, uid)
        return { userId: uid, prefs }
      })
    )
    const prefsByUser = new Map(prefResults.map((r) => [r.userId, r.prefs]))

    const toQueue: CreateEmailDeliveryInput[] = []
    for (const { input: notifInput, notificationId, userId } of emailInputs) {
      if (!EMAIL_ELIGIBLE_TYPES.has(notifInput.type)) continue
      const prefs = prefsByUser.get(userId)
      if (prefs && !isEmailEnabled(prefs, notifInput.type)) continue

      const email = await getUserEmail(db, userId)
      if (!email) continue

      toQueue.push({
        notificationId,
        userId,
        recipientEmail: email,
      })
    }

    if (toQueue.length > 0) {
      insertEmailDeliveries(db, toQueue).catch((err) =>
        console.error('[Email] Failed to queue bulk deliveries:', err.message)
      )
    }
  }

  return { ok: true, data: { created: (data ?? []).length } }
}

// ─── Email delivery helpers ────────────────────────────────────────────────────

/**
 * Fetch a user's email from auth.users (server-side only).
 * Uses the admin client to look up the auth user by ID.
 */
async function getUserEmail(
  db: ReturnType<typeof adminClient>,
  userId: string
): Promise<string | null> {
  const { data } = await db.auth.admin.getUserById(userId)
  return data?.user?.email ?? null
}

/**
 * Queue a single email delivery for a notification.
 * Creates a delivery record in the notification_email_deliveries table.
 * Idempotent: UNIQUE(notification_id) prevents duplicates.
 * If the user has no email address, silently skips.
 */
async function queueEmailDelivery(
  db: ReturnType<typeof adminClient>,
  userId: string,
  type: NotificationType,
  data: Record<string, unknown> | null | undefined,
  notificationId?: string
): Promise<void> {
  // If notificationId not provided, we need to find it (single notification case)
  let notifId = notificationId
  if (!notifId) {
    const { data: notif } = await db
      .from('notifications')
      .select('id')
      .eq('user_id', userId)
      .eq('type', type)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    notifId = notif?.id
  }
  if (!notifId) return

  const email = await getUserEmail(db, userId)
  if (!email) return

  await insertEmailDeliveries(db, [{ notificationId: notifId, userId, recipientEmail: email }])
}

/**
 * Insert email delivery records. Uses upsert with onConflict to guarantee
 * idempotency — one notification produces at most one delivery record.
 */
async function insertEmailDeliveries(
  db: ReturnType<typeof adminClient>,
  inputs: CreateEmailDeliveryInput[]
): Promise<void> {
  if (inputs.length === 0) return

  const rows = inputs.map((input) => ({
    notification_id: input.notificationId,
    user_id: input.userId,
    recipient_email: input.recipientEmail,
  }))

  const { error } = await db
    .from('notification_email_deliveries')
    .upsert(rows, { onConflict: 'notification_id' })

  if (error) {
    console.error('[Email] Inserting delivery records:', error.message)
  }
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Cursor-based notification query result.
 * `hasMore` indicates whether another page exists.
 */
export type NotificationPage = {
  rows: NotificationRow[]
  hasMore: boolean
}

/**
 * Retrieve notifications for a user using cursor-based pagination.
 *
 * Cursor: { createdAt, id } — the (created_at, id) of the last row on the
 * previous page. The next page fetches rows where:
 *   created_at < cursor.createdAt
 *   OR (created_at = cursor.createdAt AND id < cursor.id)
 *
 * Ordering: created_at DESC, id DESC (id is the deterministic tiebreaker).
 * Defaults to 20 per page, max 100.
 */
export async function getNotificationsPage(
  userId: string,
  options?: {
    limit?: number
    cursor?: { createdAt: string; id: string }
  }
): Promise<DbResult<NotificationPage>> {
  const db = adminClient()
  const limit = Math.min(options?.limit ?? DEFAULT_LIMIT, MAX_LIMIT)

  // Filter out notifications whose in-app category is disabled
  const prefs = await getUserPreferences(db, userId)
  const disabledTypes = NOTIFICATION_TYPES.filter((type) => {
    const category = TYPE_TO_CATEGORY[type]
    return prefs.inApp.get(category) === false
  })

  let query = db
    .from('notifications')
    .select('id, user_id, type, title, message, data, read_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1) // fetch one extra to detect hasMore

  if (disabledTypes.length > 0) {
    query = query.not('type', 'in', `(${disabledTypes.join(',')})`)
  }

  if (options?.cursor) {
    // Cursor filter: all rows strictly "before" (createdAt, id) in DESC order
    query = query.or(
      `created_at.lt.${options.cursor.createdAt},and(created_at.eq.${options.cursor.createdAt},id.lt.${options.cursor.id})`
    )
  }

  const { data, error } = await query

  if (error) return fail('Fetching notifications: ' + error.message)

  const rows = (data ?? []) as NotificationRow[]
  const hasMore = rows.length > limit
  if (hasMore) rows.pop() // remove the extra row used to detect hasMore

  return { ok: true, data: { rows, hasMore } }
}

/**
 * Return the unread notification count for a user.
 */
export async function getUnreadNotificationCount(
  userId: string
): Promise<DbResult<number>> {
  const db = adminClient()

  // Filter out notifications whose in-app category is disabled
  const prefs = await getUserPreferences(db, userId)
  const disabledTypes = NOTIFICATION_TYPES.filter((type) => {
    const category = TYPE_TO_CATEGORY[type]
    return prefs.inApp.get(category) === false
  })

  let query = db
    .from('notifications')
    .select('id')
    .eq('user_id', userId)
    .is('read_at', null)

  if (disabledTypes.length > 0) {
    query = query.not('type', 'in', `(${disabledTypes.join(',')})`)
  }

  const { data, error } = await query

  if (error) return fail('Counting unread notifications: ' + error.message)
  return { ok: true, data: (data ?? []).length }
}

// ─── Update ───────────────────────────────────────────────────────────────────

/**
 * Mark a single notification as read.
 * Only succeeds if the notification belongs to the specified user.
 */
export async function markNotificationAsRead(
  notificationId: string,
  userId: string
): Promise<DbResult<{ id: string }>> {
  const db = adminClient()

  const { data, error } = await db
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', userId)
    .is('read_at', null)
    .select('id')
    .single()

  if (error) return fail('Marking notification as read: ' + error.message)
  if (!data) {
    return fail(
      'Notification not found or already marked as read.'
    )
  }
  return { ok: true, data: { id: data.id } }
}

/**
 * Mark all unread notifications belonging to one user as read.
 * Returns the count of notifications that were updated.
 */
export async function markAllNotificationsAsRead(
  userId: string
): Promise<DbResult<{ updated: number }>> {
  const db = adminClient()

  const { data, error } = await db
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null)
    .select('id')

  if (error) return fail('Marking all notifications as read: ' + error.message)
  return { ok: true, data: { updated: (data ?? []).length } }
}

// ─── Preferences ──────────────────────────────────────────────────────────────

/**
 * Get all notification preferences for a user.
 * Returns an array of rows. Categories not in the result are enabled by default.
 */
export async function getNotificationPreferences(
  userId: string
): Promise<DbResult<NotificationPreferenceRow[]>> {
  const db = adminClient()

  const { data, error } = await db
    .from('notification_preferences')
    .select('user_id, category, enabled, in_app_enabled, email_enabled')
    .eq('user_id', userId)

  if (error) return fail('Fetching notification preferences: ' + error.message)
  return { ok: true, data: (data ?? []) as NotificationPreferenceRow[] }
}

/**
 * Upsert a single notification preference for a user.
 * Supports both in_app_enabled and email_enabled channels.
 */
export async function upsertNotificationPreference(
  userId: string,
  category: NotificationCategory,
  inAppEnabled: boolean,
  emailEnabled: boolean
): Promise<DbResult<NotificationPreferenceRow>> {
  const db = adminClient()

  const { data, error } = await db
    .from('notification_preferences')
    .upsert(
      {
        user_id: userId,
        category,
        enabled: inAppEnabled,
        in_app_enabled: inAppEnabled,
        email_enabled: emailEnabled,
      },
      { onConflict: 'user_id,category' }
    )
    .select('user_id, category, enabled, in_app_enabled, email_enabled')
    .single()

  if (error) return fail('Updating notification preference: ' + error.message)
  return { ok: true, data: data as NotificationPreferenceRow }
}

/**
 * Upsert multiple notification preferences for a user in a single call.
 * Used when the user saves all preferences at once from the settings UI.
 */
export async function upsertNotificationPreferences(
  userId: string,
  preferences: { category: NotificationCategory; inAppEnabled: boolean; emailEnabled: boolean }[]
): Promise<DbResult<{ updated: number }>> {
  if (preferences.length === 0) return { ok: true, data: { updated: 0 } }

  const db = adminClient()

  const rows = preferences.map((p) => ({
    user_id: userId,
    category: p.category,
    enabled: p.inAppEnabled,
    in_app_enabled: p.inAppEnabled,
    email_enabled: p.emailEnabled,
  }))

  const { error } = await db
    .from('notification_preferences')
    .upsert(rows, { onConflict: 'user_id,category' })

  if (error) return fail('Updating notification preferences: ' + error.message)
  return { ok: true, data: { updated: preferences.length } }
}

// ─── Retention cleanup ────────────────────────────────────────────────────────

const RETENTION_DAYS = 90

/**
 * Delete notifications older than the retention period (90 days).
 * Applies to all users — read and unread alike.
 * Uses a bounded batch to avoid long-running transactions.
 * Returns the count of deleted rows.
 */
export async function deleteOldNotifications(): Promise<DbResult<{ deleted: number }>> {
  const db = adminClient()

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS)

  const { data, error } = await db
    .from('notifications')
    .delete()
    .lt('created_at', cutoff.toISOString())
    .select('id')

  if (error) return fail('Deleting old notifications: ' + error.message)
  return { ok: true, data: { deleted: (data ?? []).length } }
}

// ─── Email worker ──────────────────────────────────────────────────────────────

/**
 * Claim and process pending email deliveries.
 *
 * Uses SELECT FOR UPDATE SKIP LOCKED to safely claim rows — concurrent workers
 * will skip locked rows rather than processing the same email twice.
 *
 * Returns counts for monitoring: processed, sent, failed.
 */
export async function processEmailDeliveries(): Promise<
  DbResult<{ processed: number; sent: number; failed: number; recovered: number }>
> {
  const db = adminClient()

  // 0. Recover stuck processing rows (>5 minutes old)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const { data: recovered, error: recoverError } = await db
    .from('notification_email_deliveries')
    .update({ status: 'pending', updated_at: new Date().toISOString() })
    .eq('status', 'processing')
    .lt('updated_at', fiveMinutesAgo)
    .select('id')

  const recoveredCount = recovered?.length ?? 0
  if (recoverError) {
    console.error('[Email Worker] Error recovering stuck rows:', recoverError.message)
  } else if (recoveredCount > 0) {
    console.warn(`[Email Worker] Recovered ${recoveredCount} stuck processing rows`)
  }

  // 1. Claim pending deliveries
  // We fetch pending rows, then process them one at a time.
  // The status update to 'processing' acts as a claim lock.
  const { data: claimed, error: claimError } = await db
    .from('notification_email_deliveries')
    .update({ status: 'processing', updated_at: new Date().toISOString() })
    .eq('status', 'pending')
    .select('id, notification_id, user_id, recipient_email, attempts, max_attempts')

  if (claimError) return fail('Claiming email deliveries: ' + claimError.message)
  if (!claimed || claimed.length === 0) {
    return { ok: true, data: { processed: 0, sent: 0, failed: 0, recovered: recoveredCount } }
  }

  // Filter to only those under max_attempts (the .lt above doesn't work with dynamic column)
  const eligible = claimed.filter(
    (r) => r.attempts < (r.max_attempts ?? 5)
  )

  let sent = 0
  let failed = 0

  // 2. Process each delivery
  for (const delivery of eligible) {
    const result = await processOneEmailDelivery(db, {
      id: delivery.id,
      notificationId: delivery.notification_id,
      userId: delivery.user_id,
      recipientEmail: delivery.recipient_email,
      attempts: delivery.attempts,
      maxAttempts: delivery.max_attempts ?? 5,
    })

    if (result === 'sent') sent++
    else failed++
  }

  return { ok: true, data: { processed: eligible.length, sent, failed, recovered: recoveredCount } }
}

/**
 * Process a single email delivery: fetch notification, render template, send.
 */
async function processOneEmailDelivery(
  db: ReturnType<typeof adminClient>,
  delivery: {
    id: string
    notificationId: string
    userId: string
    recipientEmail: string
    attempts: number
    maxAttempts: number
  }
): Promise<'sent' | 'failed' | 'skipped'> {
  const { getEmailTemplate } = await import('@/lib/email/templates')
  const { sendEmail } = await import('@/lib/email/provider')

  // 1. Fetch the notification
  const { data: notification, error: notifError } = await db
    .from('notifications')
    .select('id, type, title, message, data')
    .eq('id', delivery.notificationId)
    .maybeSingle()

  if (notifError || !notification) {
    console.error(`[Email] Notification not found for delivery ${delivery.id}:`, notifError?.message)
    await markDeliveryFailed(db, delivery.id, 'Notification not found', delivery.attempts + 1)
    return 'failed'
  }

  // 2. Render template
  const template = getEmailTemplate(notification.type, notification.data as Record<string, unknown> | null)
  if (!template) {
    // No template for this type — not an error, just skip
    await markDeliverySent(db, delivery.id, 'no-template')
    return 'skipped'
  }

  // 3. Send email
  const result = await sendEmail(delivery.recipientEmail, template.subject, template.html)

  if (result.ok) {
    await markDeliverySent(db, delivery.id, result.providerId)
    console.log(
      `[Email] Sent delivery ${delivery.id} (notification: ${notification.type}, to: ${delivery.recipientEmail})`
    )
    return 'sent'
  }

  // 4. Handle failure
  const newAttempts = delivery.attempts + 1
  const permanentFailure = !result.transient || newAttempts >= delivery.maxAttempts

  if (permanentFailure) {
    await markDeliveryFailed(db, delivery.id, result.error, newAttempts)
    console.error(
      `[Email] Permanent failure for delivery ${delivery.id}: ${result.error} (attempts: ${newAttempts}/${delivery.maxAttempts})`
    )
    return 'failed'
  }

  // Transient failure — mark for retry with backoff
  await markDeliveryPendingRetry(db, delivery.id, result.error, newAttempts)
  console.warn(
    `[Email] Transient failure for delivery ${delivery.id}: ${result.error} (attempts: ${newAttempts}/${delivery.maxAttempts}, will retry)`
  )
  return 'failed'
}

async function markDeliverySent(
  db: ReturnType<typeof adminClient>,
  deliveryId: string,
  providerId: string
): Promise<void> {
  const { error } = await db
    .from('notification_email_deliveries')
    .update({
      status: 'sent',
      provider_id: providerId,
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', deliveryId)

  if (error) console.error('[Email] Marking delivery sent:', error.message)
}

async function markDeliveryFailed(
  db: ReturnType<typeof adminClient>,
  deliveryId: string,
  lastError: string,
  attempts: number
): Promise<void> {
  const { error } = await db
    .from('notification_email_deliveries')
    .update({
      status: 'failed',
      last_error: lastError,
      attempts,
      updated_at: new Date().toISOString(),
    })
    .eq('id', deliveryId)

  if (error) console.error('[Email] Marking delivery failed:', error.message)
}

async function markDeliveryPendingRetry(
  db: ReturnType<typeof adminClient>,
  deliveryId: string,
  lastError: string,
  attempts: number
): Promise<void> {
  const { error } = await db
    .from('notification_email_deliveries')
    .update({
      status: 'pending',
      last_error: lastError,
      attempts,
      updated_at: new Date().toISOString(),
    })
    .eq('id', deliveryId)

  if (error) console.error('[Email] Marking delivery for retry:', error.message)
}

/**
 * Get email delivery counts for monitoring.
 * Returns counts by status.
 */
export async function getEmailDeliveryStats(): Promise<
  DbResult<{ pending: number; processing: number; sent: number; failed: number }>
> {
  const db = adminClient()

  const results = await Promise.all(
    ['pending', 'processing', 'sent', 'failed'].map(async (status) => {
      const { count, error } = await db
        .from('notification_email_deliveries')
        .select('id', { count: 'exact', head: true })
        .eq('status', status)
      return { status, count: error ? 0 : (count ?? 0) }
    })
  )

  const stats = { pending: 0, processing: 0, sent: 0, failed: 0 }
  for (const r of results) {
    stats[r.status as keyof typeof stats] = r.count
  }
  return { ok: true, data: stats }
}
