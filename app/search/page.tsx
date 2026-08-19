'use client'

import React, { useEffect, useState, useMemo, useRef } from 'react'
import { ArrowLeft, Search, MapPin, Calendar, ImageOff } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import InterestChip from '@/components/ui/InterestChip'

type DbEvent = {
  id: string
  title: string
  description: string | null
  event_date: string
  location: string
  image_url: string | null
  ticket_tiers: { price: number }[]
}

type InterestRow = { id: string; name: string }

function formatPrice(tiers: { price: number }[]): string {
  if (!tiers || tiers.length === 0) return ''
  const min = Math.min(...tiers.map((t) => t.price))
  return min === 0 ? 'Free' : `From ETB ${min.toFixed(0)}`
}

function SearchResultCard({
  event,
  interestNames,
}: {
  event: DbEvent
  interestNames: string[]
}) {
  const [imgFailed, setImgFailed] = useState(false)
  const showImage = !!event.image_url && !imgFailed

  return (
    <a
      href={`/events/${event.id}`}
      style={{
        display: 'flex',
        gap: 12,
        padding: 12,
        borderRadius: 12,
        border: '1px solid #F5F5F4',
        background: '#fff',
        marginBottom: 10,
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 10,
          flexShrink: 0,
          overflow: 'hidden',
          background: '#F5F5F4',
        }}
      >
        {showImage ? (
          <img
            src={event.image_url!}
            alt={event.title}
            onError={() => setImgFailed(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #FDE68A, #F59E0B)',
            }}
          >
            <ImageOff size={20} color="rgba(255,255,255,0.6)" />
          </div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <h3
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#1C1917',
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {event.title}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
          <MapPin size={12} color="#A8A29E" />
          <span
            style={{
              fontSize: 12,
              color: '#78716C',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {event.location}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
          <Calendar size={12} color="#A8A29E" />
          <span style={{ fontSize: 12, color: '#78716C' }}>
            {new Date(event.event_date).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
        {interestNames.length > 0 && (
          <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
            {interestNames.slice(0, 3).map((name) => (
              <span
                key={name}
                style={{
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: '#FEF3C7',
                  fontSize: 10,
                  fontWeight: 500,
                  color: '#92400E',
                }}
              >
                {name}
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={{ alignSelf: 'flex-start', flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#1C1917' }}>
          {formatPrice(event.ticket_tiers)}
        </span>
      </div>
    </a>
  )
}

export default function SearchPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [events, setEvents] = useState<DbEvent[]>([])
  const [eventInterestMap, setEventInterestMap] = useState<Map<string, string[]>>(new Map())
  const [allInterests, setAllInterests] = useState<InterestRow[]>([])
  const [interestNameMap, setInterestNameMap] = useState<Map<string, string>>(new Map())
  const [selectedInterestId, setSelectedInterestId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const load = async () => {
      const { data: interestRows } = await supabase
        .from('interests')
        .select('id, name')
        .order('name')
      const iRows = (interestRows ?? []) as InterestRow[]
      setAllInterests(iRows)
      const nMap = new Map<string, string>()
      for (const row of iRows) nMap.set(row.id, row.name)
      setInterestNameMap(nMap)

      const { data } = await supabase
        .from('events')
        .select('id, title, description, event_date, location, image_url, ticket_tiers ( price )')
        .eq('status', 'published')
        .order('event_date', { ascending: true })

      if (!data) {
        setLoading(false)
        return
      }

      const eventIds = data.map((e) => e.id)
      const eMap = new Map<string, string[]>()

      if (eventIds.length > 0) {
        const { data: eventInterests } = await supabase
          .from('event_interests')
          .select('event_id, interest_id')
          .in('event_id', eventIds)
        for (const row of eventInterests ?? []) {
          const list = eMap.get(row.event_id) ?? []
          list.push(row.interest_id)
          eMap.set(row.event_id, list)
        }
      }
      setEventInterestMap(eMap)
      setEvents(data as DbEvent[])
      setLoading(false)
    }
    load()
  }, [])

  const results = useMemo(() => {
    let filtered = events

    if (query.trim()) {
      const q = query.toLowerCase().trim()
      filtered = filtered.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.description && e.description.toLowerCase().includes(q)) ||
          (e.location && e.location.toLowerCase().includes(q))
      )
    }

    if (selectedInterestId) {
      filtered = filtered.filter((e) => {
        const interests = eventInterestMap.get(e.id) ?? []
        return interests.includes(selectedInterestId)
      })
    }

    return filtered
  }, [events, query, selectedInterestId, eventInterestMap])

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', paddingBottom: 84 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 16px',
          borderBottom: '1px solid #F5F5F4',
        }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Go back"
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: 'none',
            background: '#F5F5F4',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={18} color="#1C1917" />
        </button>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search
            size={16}
            color="#A8A29E"
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
            }}
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events, artists, venues..."
            style={{
              width: '100%',
              borderRadius: 9999,
              border: '1px solid #E7E5E4',
              background: '#fff',
              padding: '10px 12px 10px 36px',
              fontSize: 14,
              color: '#1C1917',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Interest chips */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          padding: '12px 16px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <InterestChip
          label="All"
          active={selectedInterestId === null}
          onClick={() => setSelectedInterestId(null)}
        />
        {allInterests.map((interest) => (
          <InterestChip
            key={interest.id}
            label={interest.name}
            active={selectedInterestId === interest.id}
            onClick={() =>
              setSelectedInterestId((prev) => (prev === interest.id ? null : interest.id))
            }
          />
        ))}
      </div>

      {/* Results */}
      <div style={{ padding: '0 16px' }}>
        {!loading && results.length === 0 && (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <Search size={32} color="#D6D3D1" style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 14, color: '#A8A29E', margin: 0 }}>
              {query || selectedInterestId ? 'No events match your search.' : 'No events yet.'}
            </p>
          </div>
        )}

        {results.map((event) => {
          const interestIds = eventInterestMap.get(event.id) ?? []
          const interestNames = interestIds
            .map((id) => interestNameMap.get(id))
            .filter((n): n is string => !!n)

          return (
            <SearchResultCard
              key={event.id}
              event={event}
              interestNames={interestNames}
            />
          )
        })}
      </div>
    </div>
  )
}
