import { createClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function POST(request: NextRequest) {
  if (!url || !anonKey || !serviceRoleKey) {
    return Response.json({ error: 'Server configuration error.' }, { status: 500 })
  }

  let body: { accessToken?: string; role?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { accessToken, role } = body
  if (typeof accessToken !== 'string' || accessToken.length === 0) {
    return Response.json({ error: 'Missing access token.' }, { status: 401 })
  }
  if (role !== 'customer' && role !== 'organizer') {
    return Response.json({ error: 'Invalid role.' }, { status: 400 })
  }

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
  const { data: { user }, error: userError } = await userClient.auth.getUser()
  if (userError || !user) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const adminClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { error } = await adminClient.from('profiles').update({ role }).eq('id', user.id)
  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ ok: true, role })
}
