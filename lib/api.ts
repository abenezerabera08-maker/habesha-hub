import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

export type ApiFailureStatus = 400 | 401 | 403 | 404 | 500

export class ApiFailure extends Error {
  status: ApiFailureStatus
  constructor(message: string, status: ApiFailureStatus = 400) {
    super(message)
    this.status = status
  }
}

export function serverClients() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anonKey || !serviceRoleKey) {
    throw new ApiFailure('Server configuration error.', 500)
  }
  return { url, anonKey, serviceRoleKey }
}

export function adminClient(): SupabaseClient {
  const { url, serviceRoleKey } = serverClients()
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function userFromRequest(request: NextRequest) {
  const { url, anonKey } = serverClients()
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/, '')
  if (!token) return null
  const db = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data, error } = await db.auth.getUser()
  if (error || !data.user) return null
  return { user: data.user, token, db }
}

export async function requireUser(request: NextRequest) {
  const auth = await userFromRequest(request)
  if (!auth) throw new ApiFailure('Unauthorized.', 401)
  return { ...auth, db: adminClient() }
}

export async function isUserAdmin(db: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await db.from('profiles').select('role').eq('id', userId).maybeSingle()
  return data?.role === 'admin'
}

export async function requireAdmin(request: NextRequest) {
  const { user, token } = await requireUser(request)
  const db = adminClient()
  const admin = await isUserAdmin(db, user.id)
  if (!admin) throw new ApiFailure('Forbidden.', 403)
  return { user, token, db }
}

export async function runApi(handler: () => Promise<Response>): Promise<Response> {
  try {
    return await handler()
  } catch (e) {
    if (e instanceof ApiFailure) {
      return Response.json({ error: e.message }, { status: e.status })
    }
    console.error('API error', e)
    return Response.json({ error: 'Unexpected server error.' }, { status: 500 })
  }
}
