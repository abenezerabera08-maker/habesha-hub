import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Event = {
  id: string
  title: string
  event_date: string
  location: string
  ticket_tiers: { price: number }[]
}

async function getLiveEvents(): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select(`
      id, title, event_date, location,
      ticket_tiers ( price )
    `)
    .order('event_date', { ascending: true })

  if (error) {
    console.error('Failed to fetch events:', error.message)
    return []
  }

  return (data ?? []) as Event[]
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

export default async function DiscoverPage() {
  const events = await getLiveEvents()

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
