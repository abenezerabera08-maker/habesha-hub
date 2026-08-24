import type { NextRequest } from 'next/server'
import { requireAdmin, runApi } from '@/lib/api'
import { deleteOldNotifications } from '@/lib/services/notifications'

export const runtime = 'nodejs'

/**
 * POST /api/notifications/cleanup
 *
 * Triggers the notification retention cleanup worker. Admin-only.
 * Deletes notifications older than 90 days. Designed to be called by an
 * external scheduler (e.g. daily cron) or manually by an admin.
 *
 * Authentication: requires a valid admin Bearer token.
 *
 * Response: { ok: true, data: { deleted } }
 */
export async function POST(request: NextRequest) {
  return runApi(async () => {
    await requireAdmin(request)

    const result = await deleteOldNotifications()
    if (!result.ok) {
      throw new Error(result.error)
    }

    console.log(`[Retention] Deleted ${result.data.deleted} notifications older than 90 days.`)

    return Response.json({ ok: true, data: result.data })
  })
}
