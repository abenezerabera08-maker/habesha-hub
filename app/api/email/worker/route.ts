import type { NextRequest } from 'next/server'
import { requireAdmin, runApi } from '@/lib/api'
import { processEmailDeliveries, getEmailDeliveryStats } from '@/lib/services/notifications'
import { validateEmailConfig } from '@/lib/email/provider'

export const runtime = 'nodejs'

/**
 * POST /api/email/worker
 *
 * Processes pending email deliveries. Admin-only.
 * Designed to be called by an external scheduler (cron-job.org, pg_cron, etc.)
 * or manually by an admin.
 *
 * Authentication: requires a valid admin Bearer token.
 *
 * Response: { ok: true, data: { processed, sent, failed } }
 */
export async function POST(request: NextRequest) {
  return runApi(async () => {
    await requireAdmin(request)

    // Validate email configuration before processing
    const configCheck = validateEmailConfig()
    if (!configCheck.ok) {
      return Response.json(
        { ok: false, error: configCheck.error },
        { status: 500 }
      )
    }

    const result = await processEmailDeliveries()
    if (!result.ok) {
      throw new Error(result.error)
    }

    console.log(
      `[Email Worker] Processed: ${result.data.processed}, Sent: ${result.data.sent}, Failed: ${result.data.failed}, Recovered: ${result.data.recovered}`
    )

    return Response.json({ ok: true, data: result.data })
  })
}

/**
 * GET /api/email/worker
 *
 * Returns email delivery stats for monitoring. Admin-only.
 */
export async function GET(request: NextRequest) {
  return runApi(async () => {
    await requireAdmin(request)

    const result = await getEmailDeliveryStats()
    if (!result.ok) {
      throw new Error(result.error)
    }

    return Response.json({ ok: true, data: result.data })
  })
}
