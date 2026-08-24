import type { NextRequest } from 'next/server'
import { ApiFailure, requireUser, runApi } from '@/lib/api'
import { markNotificationAsRead } from '@/lib/services/notifications'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  return runApi(async () => {
    const { user } = await requireUser(request)

    const body = await request.json().catch(() => null)
    const notificationId = body?.notificationId

    if (typeof notificationId !== 'string' || !notificationId) {
      throw new ApiFailure('Missing notification id.', 400)
    }

    const result = await markNotificationAsRead(notificationId, user.id)
    if (!result.ok) {
      throw new ApiFailure(result.error, 400)
    }

    return Response.json({ ok: true, data: result.data })
  })
}
