import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import TicketList from './TicketList'
import EventDetailHeader from './EventDetailHeader'

async function getEvent(id: string) {
  const { data, error } = await supabase
    .from('events')
    .select('id, title, description, location, event_date, image_url, organizer_id, city_id')
    .eq('id', id)
    .single()

  if (error || !data) return null
  return data
}

async function getTicketTiers(eventId: string) {
  const { data, error } = await supabase
    .from('purchasable_ticket_tiers')
    .select('id, event_id, name, description, price, quantity_remaining, color, benefits, max_per_order, max_group_size')
    .eq('event_id', eventId)

  if (error) return []
  return data ?? []
}

async function getOrganizer(userId: string) {
  const { data } = await supabase
    .from('organizer_profiles')
    .select('org_name, org_description')
    .eq('user_id', userId)
    .single()

  return data ?? null
}

async function getEventInterests(eventId: string) {
  const { data } = await supabase
    .from('event_interests')
    .select('interest_id, interests ( id, name )')
    .eq('event_id', eventId)

  if (!data) return []
  const rows = data as unknown as { interest_id: string; interests: { id: string; name: string } | null }[]
  return rows
    .map((row) => row.interests)
    .filter((interest): interest is { id: string; name: string } => interest !== null)
}

async function getCity(cityId: string | null) {
  if (!cityId) return null
  const { data } = await supabase
    .from('cities')
    .select('name')
    .eq('id', cityId)
    .single()
  return data?.name ?? null
}

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const event = await getEvent(id)
  if (!event) notFound()

  const [tiers, organizer, interests, cityName] = await Promise.all([
    getTicketTiers(id),
    getOrganizer(event.organizer_id),
    getEventInterests(id),
    getCity(event.city_id),
  ])

  const eventDate = new Date(event.event_date)
  const dateStr = eventDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  const timeStr = eventDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', paddingBottom: 84 }}>
      <EventDetailHeader imageUrl={event.image_url} title={event.title} />

      <div style={{ padding: '0 16px' }}>
        {/* Title */}
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: '#1C1917',
            margin: '16px 0 12px',
            lineHeight: 1.2,
          }}
        >
          {event.title}
        </h1>

        {/* Metadata row */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
              <line x1="16" x2="16" y1="2" y2="6" />
              <line x1="8" x2="8" y1="2" y2="6" />
              <line x1="3" x2="21" y1="10" y2="10" />
            </svg>
            <span style={{ fontSize: 14, color: '#44403C' }}>{dateStr}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span style={{ fontSize: 14, color: '#44403C' }}>{timeStr}</span>
          </div>
          {(event.location || cityName) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span style={{ fontSize: 14, color: '#44403C' }}>
                {event.location}{event.location && cityName ? `, ${cityName}` : cityName || ''}
              </span>
            </div>
          )}
        </div>

        {/* Organizer */}
        {organizer && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 0',
              borderTop: '1px solid #F5F5F4',
              borderBottom: '1px solid #F5F5F4',
              marginBottom: 16,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: '#FEF3C7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 700,
                color: '#D97706',
                flexShrink: 0,
              }}
            >
              {organizer.org_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1C1917', margin: 0 }}>
                {organizer.org_name}
              </p>
              <p style={{ fontSize: 12, color: '#78716C', margin: 0 }}>Organizer</p>
            </div>
          </div>
        )}

        {/* Interests */}
        {interests.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {interests.map((interest) => (
              <span
                key={interest.id}
                style={{
                  padding: '4px 12px',
                  borderRadius: 20,
                  background: '#FEF3C7',
                  fontSize: 12,
                  fontWeight: 500,
                  color: '#92400E',
                }}
              >
                {interest.name}
              </span>
            ))}
          </div>
        )}

        {/* Description */}
        {event.description && (
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1C1917', margin: '0 0 8px' }}>
              About this event
            </h2>
            <p style={{ fontSize: 14, color: '#57534E', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
              {event.description}
            </p>
          </div>
        )}

        {/* Tickets */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1C1917', margin: '0 0 12px' }}>
            Tickets
          </h2>
          <TicketList eventId={event.id} initialTiers={tiers} />
        </div>
      </div>
    </div>
  )
}
