import type { NextRequest } from 'next/server'
import { ApiFailure, requireAdmin, runApi } from '@/lib/api'

export const runtime = 'nodejs'

const VALID_ROLES = ['customer', 'organizer', 'admin'] as const

export async function POST(request: NextRequest) {
  return runApi(async () => {
    const { user, db } = await requireAdmin(request)

    const body = await request.json().catch(() => null)
    const userId = body?.userId
    const role = body?.role

    if (typeof userId !== 'string' || !userId) {
      throw new ApiFailure('Missing user id.', 400)
    }
    if (!VALID_ROLES.includes(role)) {
      throw new ApiFailure('Invalid role.', 400)
    }
    if (userId === user.id && role !== 'admin') {
      throw new ApiFailure('You cannot change your own role.', 400)
    }

    const { data: existing } = await db
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()
    if (!existing) {
      throw new ApiFailure('User not found.', 404)
    }

    const { data, error } = await db
      .from('profiles')
      .update({ role })
      .eq('id', userId)
      .select('id, role')
      .single()

    if (error) {
      throw new ApiFailure(`Updating the user role: ${error.message}`, 500)
    }
    if (data?.role !== role) {
      throw new ApiFailure('Updating the user role: the change was blocked.', 500)
    }

    return Response.json({ ok: true, data: { userId: data.id, role: data.role } })
  })
}
