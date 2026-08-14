import type { NextRequest } from 'next/server'
import { requireAdmin, runApi } from '@/lib/api'

export const runtime = 'nodejs'

const AUTH_USERS_PER_PAGE = 200

export async function GET(request: NextRequest) {
  return runApi(async () => {
    const { db } = await requireAdmin(request)

    const { data, error } = await db
      .from('profiles')
      .select('id, full_name, role')

    if (error) {
      return Response.json({ error: `Loading users: ${error.message}` }, { status: 500 })
    }

    const emailMap = new Map<string, string | null>()
    let page = 1
    for (;;) {
      const { data: authPage } = await db.auth.admin.listUsers({
        page,
        perPage: AUTH_USERS_PER_PAGE,
      })
      const users = authPage?.users ?? []
      for (const u of users) emailMap.set(u.id, u.email ?? null)
      if (users.length < AUTH_USERS_PER_PAGE) break
      page += 1
    }

    const merged = (data ?? []).map(p => ({ ...p, email: emailMap.get(p.id) ?? null }))
    return Response.json({ ok: true, data: merged })
  })
}
