'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { requireRole } from '@/lib/auth'
import { approveEvent, rejectEvent } from '@/lib/services/admin'

type PendingEvent = {
  id: string
  title: string
  description: string | null
  location: string | null
  event_date: string | null
  organizer_id: string
}

export default function AdminReviewPage() {
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [error, setError] = useState('')
  const [events, setEvents] = useState<PendingEvent[]>([])
  const [organizerMap, setOrganizerMap] = useState<Map<string, string | null>>(new Map())
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const router = useRouter()

  const loadPendingEvents = async () => {
    setError('')
    const { data: pendingEvents, error: eventsError } = await supabase
      .from('events')
      .select('id, title, description, location, event_date, organizer_id')
      .eq('status', 'pending_review')
      .order('event_date', { ascending: true })

    if (eventsError) {
      setError(`Failed to load events: ${eventsError.message}`)
      return
    }

    if (!pendingEvents || pendingEvents.length === 0) {
      setEvents([])
      return
    }

    const organizerIds = [...new Set(pendingEvents.map(e => e.organizer_id))]

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', organizerIds)

    if (profilesError) {
      setError('Failed to load organizer details.')
      return
    }

    const organizerMap = new Map((profiles ?? []).map(p => [p.id, p.full_name]))

    setEvents(pendingEvents.map(e => ({ ...e })))
    setOrganizerMap(organizerMap)
  }

  useEffect(() => {
    const checkAccess = async () => {
      const session = await requireRole('admin', (href) => router.replace(href))
      if (!session) return

      setIsAdmin(true)
      await loadPendingEvents()
      setLoading(false)
    }
    checkAccess()
  }, [router])

  const handleApprove = async (item: PendingEvent) => {
    setProcessingId(item.id)
    setError('')

    const result = await approveEvent(item.id)
    if (!result.ok) {
      setError(result.error)
      setProcessingId(null)
      return
    }

    await loadPendingEvents()
    setProcessingId(null)
  }

  const confirmReject = async (item: PendingEvent) => {
    setProcessingId(item.id)
    setError('')

    const result = await rejectEvent(item.id, rejectReason)
    if (!result.ok) {
      setError(result.error)
      setProcessingId(null)
      return
    }

    await loadPendingEvents()
    setProcessingId(null)
    setRejectingId(null)
    setRejectReason('')
  }

  if (loading) return <p>Loading...</p>
  if (!isAdmin) return <p>{error}</p>

  return (
    <div style={{ maxWidth: 640, margin: '40px auto', padding: '0 16px' }}>
      <h1>Event Review</h1>

      {error && <p style={{ color: '#c00', marginTop: 12 }}>{error}</p>}

      {events.length === 0 ? (
        <p style={{ marginTop: 24, color: '#555' }}>No events waiting for review.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 24 }}>
          {events.map((item) => (
            <div
              key={item.id}
              style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 16 }}
            >
              <p style={{ fontWeight: 600, fontSize: 18, margin: '0 0 8px' }}>
                {item.title}
              </p>
              <p style={{ margin: '4px 0', color: '#555' }}>
                Organizer: {organizerMap.get(item.organizer_id) ?? 'Unknown'}
              </p>
              <p style={{ margin: '4px 0', color: '#555' }}>
                Location: {item.location ?? 'N/A'}
              </p>
              <p style={{ margin: '4px 0', color: '#555' }}>
                Date:{' '}
                {item.event_date
                  ? new Date(item.event_date).toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })
                  : 'N/A'}
              </p>
              {item.description && (
                <p style={{ margin: '8px 0', color: '#333' }}>{item.description}</p>
              )}
              <p style={{ margin: '4px 0' }}>
                <Link href={`/events/${item.id}`}>View full event</Link>
              </p>

              {rejectingId === item.id ? (
                <div style={{ marginTop: 12 }}>
                  <input
                    type="text"
                    placeholder="Rejection reason (optional)"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: 8,
                      marginBottom: 8,
                      border: '1px solid #ddd',
                      borderRadius: 8,
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => confirmReject(item)}
                      disabled={processingId === item.id}
                      style={{
                        padding: '8px 16px',
                        background: '#c00',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: processingId === item.id ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {processingId === item.id ? 'Processing\u2026' : 'Confirm Reject'}
                    </button>
                    <button
                      onClick={() => { setRejectingId(null); setRejectReason('') }}
                      style={{
                        padding: '8px 16px',
                        background: 'none',
                        border: '1px solid #ddd',
                        borderRadius: 8,
                        fontSize: 14,
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button
                    onClick={() => handleApprove(item)}
                    disabled={processingId === item.id}
                    style={{
                      padding: '8px 24px',
                      background: '#171717',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: processingId === item.id ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setRejectingId(item.id)}
                    disabled={processingId === item.id}
                    style={{
                      padding: '8px 24px',
                      background: 'none',
                      border: '1px solid #ddd',
                      borderRadius: 8,
                      fontSize: 14,
                      cursor: processingId === item.id ? 'not-allowed' : 'pointer',
                      color: '#c00',
                    }}
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
