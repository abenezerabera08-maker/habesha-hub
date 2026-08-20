'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { requireRole } from '@/lib/auth'
import { useAuth } from '@/lib/AuthContext'
import { listUsers, setUserRole, type UserRow } from '@/lib/services/admin'

const ROLE_OPTIONS = ['customer', 'organizer', 'admin'] as const

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [users, setUsers] = useState<UserRow[]>([])
  const [pendingRoles, setPendingRoles] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [selfId, setSelfId] = useState<string | null>(null)
  const router = useRouter()
  const { userId, role, loading: authLoading } = useAuth()

  useEffect(() => {
    const load = async () => {
      requireRole('admin', role, authLoading, (href) => router.replace(href))
      if (authLoading || role !== 'admin') return

      setSelfId(userId)
      const result = await listUsers()
      if (!result.ok) {
        setError(result.error)
        setLoading(false)
        return
      }

      setUsers(result.data)
      setLoading(false)
    }
    load()
  }, [router, userId, role, authLoading])

  const handleSave = async (user: UserRow) => {
    setError('')
    const newRole = pendingRoles[user.id] ?? user.role
    if (newRole === user.role) return

    setSavingId(user.id)
    const result = await setUserRole(user.id, newRole as 'customer' | 'organizer' | 'admin')
    if (!result.ok) {
      setError(result.error)
      setSavingId(null)
      return
    }

    setUsers(users.map(u => (u.id === user.id ? { ...u, role: result.data.role } : u)))
    setPendingRoles(prev => {
      const next = { ...prev }
      delete next[user.id]
      return next
    })
    setSavingId(null)
  }

  if (loading) return <p>Loading...</p>

  return (
    <div style={{ maxWidth: 640, margin: '40px auto', padding: '0 16px' }}>
      <h1>User Management</h1>

      <Link href="/admin" style={{ display: 'inline-block', marginBottom: 16, color: '#0066cc', fontSize: 14 }}>
        &larr; Back to event review
      </Link>

      {error && <p style={{ color: '#c00', marginTop: 12 }}>{error}</p>}

      {users.length === 0 ? (
        <p style={{ marginTop: 24, color: '#555' }}>No users found.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 12 }}>
          {users.map((user) => {
            const displayName = user.full_name ?? user.email ?? 'Unnamed user'
            const currentRole = pendingRoles[user.id] ?? user.role
            const changed = currentRole !== user.role
            const isSelf = user.id === selfId

            return (
              <div
                key={user.id}
                style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 12 }}
              >
                <p style={{ fontWeight: 600, fontSize: 16, margin: '0 0 4px' }}>
                  {displayName}
                  {isSelf && <span style={{ fontWeight: 400, fontSize: 12, color: '#888' }}> (you)</span>}
                </p>
                <p style={{ margin: '0 0 12px', fontSize: 13, color: '#888' }}>
                  {user.role === 'admin' ? 'Administrator' : user.role === 'organizer' ? 'Organizer' : 'Customer'}
                </p>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select
                    value={currentRole}
                    onChange={(e) => setPendingRoles(prev => ({ ...prev, [user.id]: e.target.value }))}
                    disabled={savingId === user.id || isSelf}
                    style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', flex: 1 }}
                  >
                    {ROLE_OPTIONS.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleSave(user)}
                    disabled={savingId === user.id || !changed || isSelf}
                    style={{
                      padding: '8px 16px',
                      background: changed ? '#171717' : '#f0f0f0',
                      color: changed ? '#fff' : '#999',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: savingId === user.id || !changed || isSelf ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {savingId === user.id ? 'Saving\u2026' : 'Save'}
                  </button>
                </div>
                {isSelf && (
                  <p style={{ margin: '8px 0 0', fontSize: 12, color: '#888' }}>
                    You can&apos;t change your own role — have another admin do it.
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
