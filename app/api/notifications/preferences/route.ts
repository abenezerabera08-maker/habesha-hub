import type { NextRequest } from 'next/server'
import { ApiFailure, requireUser, runApi } from '@/lib/api'
import {
  getNotificationPreferences,
  upsertNotificationPreference,
  upsertNotificationPreferences,
} from '@/lib/services/notifications'
import { NOTIFICATION_CATEGORIES, type NotificationCategory } from '@/lib/types/notifications'

export const runtime = 'nodejs'

function isCategory(value: unknown): value is NotificationCategory {
  return typeof value === 'string' && (NOTIFICATION_CATEGORIES as readonly string[]).includes(value)
}

/**
 * GET /api/notifications/preferences
 * Returns the current user's notification preferences.
 * Categories not in the result have both channels enabled by default.
 */
export async function GET(request: NextRequest) {
  return runApi(async () => {
    const { user } = await requireUser(request)

    const result = await getNotificationPreferences(user.id)
    if (!result.ok) {
      throw new ApiFailure(result.error, 500)
    }

    return Response.json({ ok: true, data: result.data })
  })
}

/**
 * POST /api/notifications/preferences
 * Upsert one or more notification preferences for the current user.
 *
 * Body: { category, inAppEnabled, emailEnabled }              — single update
 *   or: { preferences: { category, inAppEnabled, emailEnabled }[] } — bulk update
 *
 * Legacy format still accepted:
 *   { category, enabled } — sets in_app_enabled = enabled, email_enabled = true
 *   { preferences: { category, enabled }[] }
 */
export async function POST(request: NextRequest) {
  return runApi(async () => {
    const { user } = await requireUser(request)

    const body = await request.json().catch(() => null)
    if (!body) throw new ApiFailure('Invalid request body.', 400)

    // Bulk update: { preferences: [...] }
    if (Array.isArray(body.preferences)) {
      const prefs = body.preferences as Record<string, unknown>[]
      const valid = prefs
        .filter((p) => isCategory(p.category))
        .map((p) => ({
          category: p.category as NotificationCategory,
          inAppEnabled: typeof p.inAppEnabled === 'boolean' ? p.inAppEnabled : typeof p.enabled === 'boolean' ? p.enabled : true,
          emailEnabled: typeof p.emailEnabled === 'boolean' ? p.emailEnabled : true,
        }))

      if (valid.length === 0) {
        throw new ApiFailure('No valid preferences provided.', 400)
      }

      const result = await upsertNotificationPreferences(user.id, valid)
      if (!result.ok) throw new ApiFailure(result.error, 500)

      return Response.json({ ok: true, data: result.data })
    }

    // Single update
    const { category, inAppEnabled, emailEnabled, enabled } = body
    if (!isCategory(category)) {
      throw new ApiFailure('Invalid notification category.', 400)
    }

    // Support both new format (inAppEnabled/emailEnabled) and legacy (enabled)
    const inApp = typeof inAppEnabled === 'boolean' ? inAppEnabled : typeof enabled === 'boolean' ? enabled : true
    const email = typeof emailEnabled === 'boolean' ? emailEnabled : true

    const result = await upsertNotificationPreference(user.id, category, inApp, email)
    if (!result.ok) throw new ApiFailure(result.error, 500)

    return Response.json({ ok: true, data: result.data })
  })
}
