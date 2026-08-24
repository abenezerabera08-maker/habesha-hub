import type { NextRequest } from 'next/server'
import { requireAdmin, runApi } from '@/lib/api'
import { processEventReminders } from '@/lib/services/reminders'

export const runtime = 'nodejs'

/**
 * POST /api/reminders/process
 *
 * Triggers the event reminder worker. Admin-only.
 * Designed to be called by an external scheduler (pg_cron, cron-job.org, etc.)
 * or manually by an admin.
 *
 * Authentication: requires a valid admin Bearer token in the Authorization header.
 *
 * Response: { ok: true, data: { eventsChecked, eligibleAttendees, remindersCreated } }
 */
export async function POST(request: NextRequest) {
  return runApi(async () => {
    await requireAdmin(request)

    const result = await processEventReminders()
    if (!result.ok) {
      throw new Error(result.error)
    }

    return Response.json({ ok: true, data: result.data })
  })
}
