'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { requireRole } from '@/lib/auth'
import { useAuth } from '@/lib/AuthContext'
import {
  Calendar, Clock, MapPin, ArrowRight, ImageOff,
  Plus, CalendarDays, FolderOpen,
} from 'lucide-react'

type EventRow = {
  id: string
  title: string
  status: string
  rejection_reason: string | null
  event_date: string
  location: string | null
  venue_name: string | null
  city_id: string | null
  image_url: string | null
}

type CityMap = Record<string, string>

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: '#6B7280', bg: '#F3F4F6' },
  pending_review: { label: 'Pending Review', color: '#D97706', bg: '#FFFBEB' },
  published: { label: 'Published', color: '#059669', bg: '#ECFDF5' },
  rejected: { label: 'Rejected', color: '#DC2626', bg: '#FEF2F2' },
  archived: { label: 'Archived', color: '#6B7280', bg: '#F3F4F6' },
}

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'published', label: 'Published' },
  { key: 'pending_review', label: 'Pending' },
  { key: 'draft', label: 'Drafts' },
  { key: 'rejected', label: 'Rejected' },
] as const

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function MyEventsPage() {
  const router = useRouter()
  const { userId, role, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<EventRow[]>([])
  const [cityMap, setCityMap] = useState<CityMap>({})
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    const load = async () => {
      requireRole('organizer', role, authLoading, router.push)
      if (authLoading || role !== 'organizer' || !userId) return

      const { data } = await supabase
        .from('events')
        .select('id, title, status, rejection_reason, event_date, location, venue_name, city_id, image_url')
        .eq('organizer_id', userId)
        .order('event_date', { ascending: false })

      const rows = (data ?? []) as EventRow[]

      const cityIds = [...new Set(rows.map(e => e.city_id).filter(Boolean))] as string[]
      if (cityIds.length > 0) {
        const { data: cities } = await supabase
          .from('cities')
          .select('id, name')
          .in('id', cityIds)
        const map: CityMap = {}
        for (const c of cities ?? []) map[c.id] = c.name
        setCityMap(map)
      }

      setEvents(rows)
      setLoading(false)
    }
    load()
  }, [router, userId, role, authLoading])

  const filtered = filter === 'all' ? events : events.filter(e => e.status === filter)
  const counts = {
    all: events.length,
    published: events.filter(e => e.status === 'published').length,
    pending_review: events.filter(e => e.status === 'pending_review').length,
    draft: events.filter(e => e.status === 'draft').length,
    rejected: events.filter(e => e.status === 'rejected').length,
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px 100px' }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ height: 28, width: 160, borderRadius: 8, background: '#F3F4F6', marginBottom: 8 }} />
          <div style={{ height: 14, width: 300, borderRadius: 6, background: '#F3F4F6' }} />
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {[1,2,3,4].map(i => <div key={i} style={{ height: 32, width: 80, borderRadius: 999, background: '#F3F4F6' }} />)}
        </div>
        {[1,2].map(i => (
          <div key={i} style={{
            display: 'flex', gap: 16, padding: 16, borderRadius: 12,
            border: '1px solid #F3F4F6', marginBottom: 12,
          }}>
            <div style={{ width: 200, height: 120, borderRadius: 10, background: '#F3F4F6', flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
              <div style={{ height: 18, width: '60%', borderRadius: 6, background: '#F3F4F6' }} />
              <div style={{ height: 12, width: '40%', borderRadius: 4, background: '#F3F4F6' }} />
              <div style={{ height: 12, width: '35%', borderRadius: 4, background: '#F3F4F6' }} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px 100px' }}>

      {/* Header */}
      <div className="my-events-header">
        <div>
          <h1 style={{
            fontSize: 28, fontWeight: 750, color: '#111827', margin: '0 0 4px',
            letterSpacing: '-0.02em',
          }}>
            My Events
          </h1>
          <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>
            Manage, edit, and track the events you&apos;ve created.
            {events.length > 0 && (
              <span style={{ marginLeft: 6, color: '#9CA3AF' }}>
                {events.length} event{events.length !== 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>
        <Link href="/create-event" className="my-events-create-btn">
          <Plus size={16} />
          Create New Event
        </Link>
      </div>

      {/* Filter tabs */}
      {events.length > 0 && (
        <div className="my-events-filters">
          {FILTER_TABS.map(tab => {
            const active = filter === tab.key
            const count = counts[tab.key]
            if (tab.key !== 'all' && count === 0) return null
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                className={`my-events-filter-tab ${active ? 'my-events-filter-active' : ''}`}
              >
                {tab.label}
                {count > 0 && (
                  <span className="my-events-filter-count">{count}</span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Event list */}
      {filtered.length === 0 ? (
        <div className="my-events-empty">
          <div className="my-events-empty-icon">
            {events.length === 0 ? (
              <CalendarDays size={32} color="#D1D5DB" />
            ) : (
              <FolderOpen size={32} color="#D1D5DB" />
            )}
          </div>
          <p style={{ fontSize: 17, fontWeight: 600, color: '#111827', margin: '0 0 6px' }}>
            {events.length === 0 ? 'No events yet' : 'No matching events'}
          </p>
          <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 20px', maxWidth: 280 }}>
            {events.length === 0
              ? 'Create your first event and start sharing it with your audience.'
              : 'Try selecting a different filter.'}
          </p>
          {events.length === 0 && (
            <Link href="/create-event" className="my-events-create-btn">
              <Plus size={16} />
              Create Your Event
            </Link>
          )}
        </div>
      ) : (
        <div className="my-events-list">
          {filtered.map(event => {
            const badge = STATUS_BADGE[event.status] ?? STATUS_BADGE.draft
            const locationStr = [event.venue_name || event.location, event.city_id ? cityMap[event.city_id] : null]
              .filter(Boolean)
              .join(', ')

            return (
              <div key={event.id} className="my-events-card">
                {/* Cover image */}
                <div className="my-events-card-image">
                  {event.image_url ? (
                    <img
                      src={event.image_url}
                      alt={event.title}
                      className="my-events-card-img"
                    />
                  ) : (
                    <div className="my-events-card-placeholder">
                      <ImageOff size={24} color="rgba(255,255,255,0.4)" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="my-events-card-body">
                  <div className="my-events-card-top">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 className="my-events-card-title">{event.title}</h3>
                      <div className="my-events-card-meta">
                        <Calendar size={13} color="#9CA3AF" />
                        <span>{formatDate(event.event_date)}</span>
                        <span style={{ color: '#D1D5DB' }}>·</span>
                        <Clock size={13} color="#9CA3AF" />
                        <span>{formatTime(event.event_date)}</span>
                      </div>
                      {locationStr && (
                        <div className="my-events-card-meta">
                          <MapPin size={13} color="#9CA3AF" />
                          <span>{locationStr}</span>
                        </div>
                      )}
                    </div>
                    <span
                      className="my-events-status-badge"
                      style={{ color: badge.color, background: badge.bg }}
                    >
                      {badge.label}
                    </span>
                  </div>

                  {event.status === 'rejected' && event.rejection_reason && (
                    <p style={{ fontSize: 12, color: '#DC2626', margin: '6px 0 0', lineHeight: 1.4 }}>
                      Rejected: {event.rejection_reason}
                    </p>
                  )}

                  <div className="my-events-card-actions">
                    <Link href={`/events/${event.id}/edit`} className="my-events-manage-btn">
                      Manage Event
                      <ArrowRight size={14} />
                    </Link>
                    <Link href={`/events/${event.id}`} className="my-events-view-link">
                      View Event
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
