import { supabase } from '@/lib/supabase'

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string }

export async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<ApiResult<T>> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { ok: false, error: 'Not signed in.' }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${session.access_token}`,
    ...(init?.headers as Record<string, string> | undefined),
  }
  if (init?.body && typeof init.body === 'string' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  try {
    const res = await fetch(path, { ...init, headers })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      return { ok: false, error: json?.error ?? 'Request failed.' }
    }
    return { ok: true, data: (json?.ok === true ? json.data : json) as T }
  } catch {
    return { ok: false, error: 'Network error.' }
  }
}

export function apiPost<T>(path: string, body: unknown): Promise<ApiResult<T>> {
  return apiFetch<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
