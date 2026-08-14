import { supabase } from './supabase'

export type SessionInfo = {
  userId: string
  email: string | null
}

export async function getSessionInfo(): Promise<SessionInfo | null> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  return { userId: session.user.id, email: session.user.email ?? null }
}

export async function getRole(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()
  if (error || !data) return null
  return data.role ?? null
}

type Navigate = (href: string) => void

export async function requireAuth(navigate: Navigate): Promise<SessionInfo | null> {
  const session = await getSessionInfo()
  if (!session) navigate('/login')
  return session
}

export async function requireRole(
  role: 'organizer' | 'admin',
  navigate: Navigate
): Promise<SessionInfo | null> {
  const session = await requireAuth(navigate)
  if (!session) return null
  const currentRole = await getRole(session.userId)
  if (currentRole !== role) {
    navigate('/')
    return null
  }
  return session
}
