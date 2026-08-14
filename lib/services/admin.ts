import { type DbResult } from '@/lib/db'
import { apiFetch, apiPost } from '@/lib/apiClient'

export async function approveEvent(eventId: string): Promise<DbResult<{ eventId: string }>> {
  return apiPost<{ eventId: string }>('/api/admin/events/approve', { eventId })
}

export async function rejectEvent(
  eventId: string,
  reason: string
): Promise<DbResult<{ eventId: string }>> {
  return apiPost<{ eventId: string }>('/api/admin/events/reject', { eventId, reason })
}

export type UserRow = {
  id: string
  full_name: string | null
  role: string
  email: string | null
}

export async function listUsers(): Promise<DbResult<UserRow[]>> {
  return apiFetch<UserRow[]>('/api/admin/users')
}

export async function setUserRole(
  userId: string,
  role: 'customer' | 'organizer' | 'admin'
): Promise<DbResult<{ userId: string; role: string }>> {
  return apiPost<{ userId: string; role: string }>('/api/admin/users/role', { userId, role })
}
