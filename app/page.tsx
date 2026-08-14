'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Event = {
  id: string
  title: string
  event_date: string
  location: string
  city_id: string | null
  ticket_tiers: { price: number }[]
}

function formatPrice(tiers: { price: number }[]): string {
  if (!tiers || tiers.length === 0) return 'N/A'
  const min = Math.min(...tiers.map((t) => t.price))
  return min === 0 ? 'Free' : `From $${min.toFixed(2)}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function DiscoverPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      let viewerCityId: string | null = null
      let viewerInterestIds: string[] = []

      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('location')
          .eq('id', session.user.id)
          .single()
        viewerCityId = profile?.location ?? null

        const { data: interests } = await supabase
          .from('user_interests')
          .select('interest_id')
          .eq('user_id', session.user.id)
        viewerInterestIds = (interests ?? []).map(i => i.interest_id)
      }

      const { data, error } = await supabase
        .from('events')
        .select(`id, title, event_date, location, city_id, ticket_tiers ( price )`)
        .eq('status', 'published')
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true })

      if (error || !data) {
        setEvents([])
        setLoading(false)
        return
      }

      const eventIds = data.map(e => e.id)
      const eventInterestMap = new Map<string, string[]>()
      if (eventIds.length > 0) {
        const { data: eventInterests } = await supabase
          .from('event_interests')
          .select('event_id, interest_id')
          .in('event_id', eventIds)
        for (const row of eventInterests ?? []) {
          const list = eventInterestMap.get(row.event_id) ?? []
          list.push(row.interest_id)
          eventInterestMap.set(row.event_id, list)
        }
      }

      const scored = (data as Event[]).map(event => {
        let score = 0
        if (viewerCityId && event.city_id === viewerCityId) score += 1
        const eventInterests = eventInterestMap.get(event.id) ?? []
        if (eventInterests.some(id => viewerInterestIds.includes(id))) score += 1
        return { event, score }
      })

      scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        return new Date(a.event.event_date).getTime() - new Date(b.event.event_date).getTime()
      })

      setEvents(scored.map(s => s.event))
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <p style={{ maxWidth: 720, margin: '40px auto', padding: '0 16px' }}>Loading...</p>

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 16px' }}>
      <h1>Habesha Hub</h1>
      <p style={{ marginBottom: 32, color: '#555' }}>
        Discover Ethiopian community events near you
      </p>

      {events.length === 0 ? (
        <p>No events yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              style={{
                display: 'block',
                padding: 20,
                border: '1px solid #ddd',
                borderRadius: 8,
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <h2 style={{ margin: '0 0 8px' }}>{event.title}</h2>
              <p style={{ margin: '0 0 4px', color: '#555' }}>
                {formatDate(event.event_date)}
              </p>
              <p style={{ margin: '0 0 4px', color: '#555' }}>
                {event.location}
              </p>
              <p style={{ margin: 0, fontWeight: 600 }}>
                {formatPrice(event.ticket_tiers)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
