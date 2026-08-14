import type { NextRequest } from 'next/server'
import { requireAdmin, runApi } from '@/lib/api'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  return runApi(async () => {
    const { db } = await requireAdmin(request)

    const { data, error } = await db
      .from('profiles')
      .select('id, full_name, role')

    if (error) {
      return Response.json({ error: `Loading users: ${error.message}` }, { status: 500 })
    }

    const { data: authUsers } = await db.auth.admin.listUsers()
    const emailMap = new Map((authUsers?.users ?? []).map(u => [u.id, u.email]))

    const merged = (data ?? []).map(p => ({ ...p, email: emailMap.get(p.id) ?? null }))
    return Response.json({ ok: true, data: merged })
  })
}
