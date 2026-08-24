import type { NextRequest } from 'next/server'
import { requireUser, runApi } from '@/lib/api'
import { markAllNotificationsAsRead } from '@/lib/services/notifications'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  return runApi(async () => {
    const { user } = await requireUser(request)

    const result = await markAllNotificationsAsRead(user.id)
    if (!result.ok) {
      throw new Error(result.error)
    }

    return Response.json({ ok: true, data: result.data })
  })
}
