'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { Sun, CalendarDays } from 'lucide-react'
import DiscoveryHeader from '@/components/discovery/DiscoveryHeader'
import DiscoverySearch from '@/components/discovery/DiscoverySearch'
import InterestChip from '@/components/ui/InterestChip'
import EventCarousel from '@/components/discovery/EventCarousel'
import type { DbEvent, InterestRow } from '@/lib/types/discover'
import { getEventStatus } from '@/lib/eventStatus'

type DiscoverContentProps = {
  events: DbEvent[]
  eventInterestMap: Record<string, string[]>
  allInterests: InterestRow[]
  interestNameMap: Record<string, string>
  userName: string | null
}

function formatPrice(tiers: { price: number }[]): string {
  if (!tiers || tiers.length === 0) return 'N/A'
  const min = Math.min(...tiers.map((t) => t.price))
  return min === 0 ? 'Free' : `From ETB ${min.toFixed(0)}`
}

function toCarouselEvent(event: DbEvent, interestNames: string[], now: Date) {
  const d = new Date(event.event_date)
  const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
  const day = d.getDate().toString()
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  const { label } = getEventStatus(event.event_date, event.end_at, now)

  const priceLabel = formatPrice(event.ticket_tiers)

  return {
    id: event.id,
    title: event.title,
    location: event.location,
    dateBadge: { month, day },
    time,
    status: label,
    priceLabel,
    imageUrl: event.image_url,
  }
}

function isToday(dateStr: string, now: Date): boolean {
  const d = new Date(dateStr)
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

function isSameDate(dateStr: string, filterDate: Date): boolean {
  const d = new Date(dateStr)
  return (
    d.getFullYear() === filterDate.getFullYear() &&
    d.getMonth() === filterDate.getMonth() &&
    d.getDate() === filterDate.getDate()
  )
}

export default function DiscoverContent({
  events,
  eventInterestMap,
  allInterests,
  interestNameMap,
  userName,
}: DiscoverContentProps) {
  const [selectedInterestId, setSelectedInterestId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)

  const now = useMemo(() => new Date(), [])

  // Filter by selected interest (re-ranking, not hiding)
  const filteredEvents = useMemo(() => {
    if (!selectedInterestId) return events
    const matching = events.filter((e) => {
      const interests = eventInterestMap[e.id] ?? []
      return interests.includes(selectedInterestId)
    })
    const nonMatching = events.filter((e) => {
      const interests = eventInterestMap[e.id] ?? []
      return !interests.includes(selectedInterestId)
    })
    return [...matching, ...nonMatching]
  }, [events, selectedInterestId, eventInterestMap])

  // Split into carousels or filter by date
  const { todayEvents, comingSoonEvents } = useMemo(() => {
    if (selectedDate) {
      const dateEvents = filteredEvents.filter((e) => isSameDate(e.event_date, selectedDate))
      return { todayEvents: dateEvents, comingSoonEvents: [] }
    }
    const today: DbEvent[] = []
    const soon: DbEvent[] = []
    for (const e of filteredEvents) {
      if (isToday(e.event_date, now)) {
        today.push(e)
      } else {
        soon.push(e)
      }
    }
    return { todayEvents: today, comingSoonEvents: soon }
  }, [filteredEvents, selectedDate, now])

  const handleDateSelect = useCallback((date: Date | null) => {
    setSelectedDate(date)
    setShowDatePicker(false)
  }, [])

  const todayCarouselEvents = useMemo(
    () => todayEvents.map((e) => toCarouselEvent(e, (eventInterestMap[e.id] ?? []).map((id) => interestNameMap[id] ?? ''), now)),
    [todayEvents, eventInterestMap, interestNameMap, now]
  )

  const comingSoonCarouselEvents = useMemo(
    () => comingSoonEvents.map((e) => toCarouselEvent(e, (eventInterestMap[e.id] ?? []).map((id) => interestNameMap[id] ?? ''), now)),
    [comingSoonEvents, eventInterestMap, interestNameMap, now]
  )

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
      `}</style>

      <DiscoveryHeader userName={userName} />
      <DiscoverySearch onDateFilterClick={() => setShowDatePicker(!showDatePicker)} />

      {/* Date picker dropdown */}
      {showDatePicker && (
        <div style={{ padding: '12px 16px 0' }}>
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              border: '1px solid #E7E5E4',
              padding: 12,
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}
          >
            <button
              type="button"
              onClick={() => handleDateSelect(null)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '8px 12px',
                borderRadius: 8,
                border: 'none',
                background: !selectedDate ? '#FEF3C7' : 'transparent',
                color: '#1C1917',
                fontSize: 14,
                cursor: 'pointer',
                fontWeight: !selectedDate ? 600 : 400,
              }}
            >
              All dates
            </button>
            <button
              type="button"
              onClick={() => handleDateSelect(new Date())}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '8px 12px',
                borderRadius: 8,
                border: 'none',
                background:
                  selectedDate && isToday(selectedDate.toISOString(), new Date())
                    ? '#FEF3C7'
                    : 'transparent',
                color: '#1C1917',
                fontSize: 14,
                cursor: 'pointer',
                fontWeight:
                  selectedDate && isToday(selectedDate.toISOString(), new Date()) ? 600 : 400,
              }}
            >
              Today
            </button>
            {[1, 2, 3, 4, 5, 6].map((offset) => {
              const d = new Date()
              d.setDate(d.getDate() + offset)
              const label = d.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })
              const isSelected =
                selectedDate &&
                selectedDate.getFullYear() === d.getFullYear() &&
                selectedDate.getMonth() === d.getMonth() &&
                selectedDate.getDate() === d.getDate()
              return (
                <button
                  key={offset}
                  type="button"
                  onClick={() => handleDateSelect(d)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: 'none',
                    background: isSelected ? '#FEF3C7' : 'transparent',
                    color: '#1C1917',
                    fontSize: 14,
                    cursor: 'pointer',
                    fontWeight: isSelected ? 600 : 400,
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Interest chips */}
      <div
        className="no-scrollbar"
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          padding: '16px 16px 0',
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

      {/* Carousels */}
      {!selectedDate && (
        <>
          <EventCarousel
            title="Today's Events"
            icon={Sun}
            events={todayCarouselEvents}
            priorityFirst
          />
          <EventCarousel
            title="Coming Soon"
            icon={CalendarDays}
            events={comingSoonCarouselEvents}
          />
        </>
      )}

      {/* Date filter results */}
      {selectedDate && (
        <div style={{ padding: '24px 16px' }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1C1917', margin: '0 0 16px' }}>
            Events on{' '}
            {selectedDate.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </h2>
          {todayCarouselEvents.length === 0 ? (
            <p style={{ fontSize: 14, color: '#A8A29E', textAlign: 'center', padding: '32px 0' }}>
              No events on this date.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {todayCarouselEvents.map((e) => (
                <a
                  key={e.id}
                  href={`/events/${e.id}`}
                  style={{
                    display: 'flex',
                    gap: 12,
                    padding: 12,
                    borderRadius: 12,
                    border: '1px solid #f0f0f0',
                    background: '#fff',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 10,
                      background: 'linear-gradient(135deg, #fef3c7, #e5e7eb)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ fontSize: 9, fontWeight: 600, color: '#D97706' }}>
                      {e.dateBadge.month}
                    </span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#1C1917', lineHeight: 1 }}>
                      {e.dateBadge.day}
                    </span>
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
                      {e.title}
                    </h3>
                    <p
                      style={{
                        fontSize: 12,
                        color: '#78716C',
                        margin: '2px 0 0',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {e.location} · {e.time}
                    </p>
                  </div>
                  {e.status && (
                    <span
                      style={{
                        alignSelf: 'center',
                        flexShrink: 0,
                        borderRadius: 20,
                        background: '#F59E0B',
                        padding: '3px 10px',
                        fontSize: 10,
                        fontWeight: 600,
                        color: '#fff',
                      }}
                    >
                      {e.status}
                    </span>
                  )}
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bottom spacer for nav */}
      <div style={{ height: 24 }} />
    </div>
  )
}
