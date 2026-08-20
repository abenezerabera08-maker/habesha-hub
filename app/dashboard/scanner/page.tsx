'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { requireRole } from '@/lib/auth'
import { useAuth } from '@/lib/AuthContext'
import { apiPost } from '@/lib/apiClient'

type LookupResult = {
  orderId: string
  eventTitle: string
  attendeeName: string
  tierName: string
  quantity: number
  totalPrice: number
  checkedInAt: string | null
  checkedInByName: string | null
}

export default function CheckInScannerPage() {
  const [loading, setLoading] = useState(true)
  const [isOrganizer, setIsOrganizer] = useState(false)
  const [error, setError] = useState('')
  const [events, setEvents] = useState<{ id: string; title: string }[]>([])
  const [selectedEventId, setSelectedEventId] = useState('')
  const [tkCodeInput, setTkCodeInput] = useState('')
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null)
  const [lookupError, setLookupError] = useState('')
  const [checkingIn, setCheckingIn] = useState(false)
  const router = useRouter()
  const { userId, role, loading: authLoading } = useAuth()

  useEffect(() => {
    const checkAccess = async () => {
      requireRole('organizer', role, authLoading, (href) => router.replace(href))
      if (authLoading || role !== 'organizer') return

      setIsOrganizer(true)

      const { data, error: eventsError } = await supabase
        .from('events')
        .select('id, title')
        .eq('organizer_id', userId)
        .eq('status', 'published')
        .order('event_date', { ascending: false })

      if (eventsError) {
        setError(`Failed to load your events: ${eventsError.message}`)
        setLoading(false)
        return
      }

      setEvents((data ?? []) as { id: string; title: string }[])
      if (data && data.length > 0) {
        setSelectedEventId(data[0].id)
      }
      setLoading(false)
    }
    checkAccess()
  }, [router, userId, role, authLoading])

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLookupError('')
    setLookupResult(null)

    const code = tkCodeInput.trim()
    if (!code) {
      setLookupError('Enter a TK code.')
      return
    }

    const result = await apiPost<LookupResult>('/api/checkin/lookup', { tkCode: code })
    if (!result.ok) {
      setLookupError(result.error)
      return
    }

    setLookupResult(result.data)
  }

  const handleCheckIn = async () => {
    if (!lookupResult) return
    setCheckingIn(true)
    setLookupError('')

    const result = await apiPost<{ orderId: string; checkedInAt: string }>(
      '/api/checkin/confirm',
      { orderId: lookupResult.orderId }
    )
    if (!result.ok) {
      setLookupError(result.error)
      setCheckingIn(false)
      return
    }

    setLookupResult((prev) =>
      prev ? { ...prev, checkedInAt: result.data.checkedInAt } : prev
    )
    setCheckingIn(false)
  }

  const handleExport = async () => {
    if (!selectedEventId) return
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`/api/checkin/export?eventId=${selectedEventId}`, {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'attendees.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <p>Loading...</p>
  if (!isOrganizer) return <p>{error}</p>

  return (
    <div style={{ maxWidth: 640, margin: '40px auto', padding: '0 16px' }}>
      <h1>Check-In</h1>

      <label style={{ display: 'block', marginBottom: 16 }}>
        Event
        <select
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          style={{ display: 'block', width: '100%', marginTop: 4, padding: 8, border: '1px solid #ddd', borderRadius: 8 }}
        >
          {events.length === 0 && <option value="">No published events</option>}
          {events.map((event) => (
            <option key={event.id} value={event.id}>{event.title}</option>
          ))}
        </select>
      </label>

      <form onSubmit={handleLookup} style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <input
          type="text"
          placeholder="Enter TK code"
          value={tkCodeInput}
          onChange={(e) => setTkCodeInput(e.target.value)}
          style={{ flex: 1, padding: 8, border: '1px solid #ddd', borderRadius: 8 }}
        />
        <button
          type="submit"
          style={{
            padding: '8px 24px',
            background: '#171717',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Look Up
        </button>
      </form>

      {lookupError && <p style={{ color: '#c00', marginTop: 12 }}>{lookupError}</p>}

      {lookupResult && (
        <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 24 }}>
          <p style={{ fontWeight: 600, fontSize: 18, margin: '0 0 8px' }}>
            {lookupResult.eventTitle}
          </p>
          <p style={{ margin: '4px 0', color: '#555' }}>
            Attendee: {lookupResult.attendeeName}
          </p>
          <p style={{ margin: '4px 0' }}>
            {lookupResult.tierName} &times; {lookupResult.quantity} ={' '}
            <strong>{lookupResult.totalPrice} ETB</strong>
          </p>
          {lookupResult.checkedInAt ? (
            <p style={{ margin: '12px 0 0', color: '#15803d', fontWeight: 600 }}>
              ✅ Already checked in at{' '}
              {new Date(lookupResult.checkedInAt).toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
              {lookupResult.checkedInByName ? ` by ${lookupResult.checkedInByName}` : ''}
            </p>
          ) : (
            <button
              type="button"
              onClick={handleCheckIn}
              disabled={checkingIn}
              style={{
                marginTop: 12,
                padding: '8px 24px',
                background: '#171717',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: checkingIn ? 'not-allowed' : 'pointer',
              }}
            >
              {checkingIn ? 'Checking In\u2026' : 'Mark Checked In'}
            </button>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={handleExport}
        disabled={!selectedEventId}
        style={{
          padding: '8px 24px',
          background: selectedEventId ? '#171717' : '#f0f0f0',
          color: selectedEventId ? '#fff' : '#999',
          border: 'none',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          cursor: selectedEventId ? 'pointer' : 'not-allowed',
        }}
      >
        Download Attendee List (CSV)
      </button>
    </div>
  )
}
