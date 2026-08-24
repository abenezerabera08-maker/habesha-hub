import type { NextRequest } from 'next/server'
import { ApiFailure, requireUser, runApi } from '@/lib/api'
import { getNotificationsPage } from '@/lib/services/notifications'

export const runtime = 'nodejs'

/**
 * GET /api/notifications/list?limit=20&cursorCreatedAt=...&cursorId=...
 *
 * Returns a cursor-paginated page of notifications for the authenticated user.
 * Cursor params are optional — omit for the first page.
 */
export async function GET(request: NextRequest) {
  return runApi(async () => {
    const { user } = await requireUser(request)

    const sp = request.nextUrl.searchParams
    const limitParam = sp.get('limit')
    const limit = limitParam ? Math.min(Number(limitParam), 100) : 20

    const cursorCreatedAt = sp.get('cursorCreatedAt')
    const cursorId = sp.get('cursorId')

    const cursor =
      cursorCreatedAt && cursorId ? { createdAt: cursorCreatedAt, id: cursorId } : undefined

    const result = await getNotificationsPage(user.id, { limit, cursor })
    if (!result.ok) throw new ApiFailure(result.error, 500)

    return Response.json({ ok: true, data: result.data })
  })
}
