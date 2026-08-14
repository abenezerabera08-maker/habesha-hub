'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type EventRow = {
  id: string
  title: string
  status: string
  rejection_reason: string | null
}

const statusColor: Record<string, string> = {
  draft: '#888',
  pending_review: '#a16207',
  published: '#15803d',
  rejected: '#b91c1c',
  archived: '#555',
}

export default function MyEventsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [events, setEvents] = useState<EventRow[]>([])
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (profile?.role !== 'organizer') {
        setError('Only organizers can view events.')
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('events')
        .select('id, title, status, rejection_reason')
        .eq('organizer_id', session.user.id)
        .order('title', { ascending: true })

      setEvents(data ?? [])
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) return <p>Loading...</p>
  if (error) return <p>{error}</p>

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ marginBottom: 24 }}>My Events</h1>

      {events.length === 0 ? (
        <div style={{ textAlign: 'center', marginTop: 48 }}>
          <p style={{ color: '#555', marginBottom: 16 }}>You haven&apos;t created any events yet.</p>
          <Link
            href="/create-event"
            style={{
              display: 'inline-block',
              padding: '8px 16px',
              background: '#171717',
              color: '#fff',
              borderRadius: 8,
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Create your first event
          </Link>
        </div>
      ) : (
        events.map((event) => (
          <div
            key={event.id}
            style={{
              border: '1px solid #ddd',
              borderRadius: 8,
              padding: 16,
              marginBottom: 12,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 18 }}>{event.title}</div>
              <div style={{ fontSize: 13, color: statusColor[event.status] ?? '#888', marginTop: 4 }}>
                {event.status.replace(/_/g, ' ')}
              </div>
              {event.status === 'rejected' && event.rejection_reason && (
                <p style={{ fontSize: 13, color: '#7f1d1d', marginTop: 4 }}>
                  Reason: {event.rejection_reason}
                </p>
              )}
            </div>
            <Link
              href={`/events/${event.id}/edit`}
              style={{
                padding: '8px 16px',
                background: '#171717',
                color: '#fff',
                borderRadius: 8,
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              Manage
            </Link>
          </div>
        ))
      )}
    </div>
  )
}
