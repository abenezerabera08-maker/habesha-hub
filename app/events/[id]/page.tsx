import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EventDetailClient from './EventDetailClient'

async function getEvent(id: string) {
  const supabase = await createClient()
  console.log('[getEvent] querying id:', id)
  const { data: event, error } = await supabase
    .from('events')
    .select('id, title, description, location, event_date, end_at, image_url, organizer_id, city_id, google_maps_url')
    .eq('id', id)
    .maybeSingle()
  console.log('[getEvent] error:', error ? JSON.stringify(error) : 'null')
  console.log('[getEvent] event:', event)

  if (error || !event) return null
  return event
}

async function getTicketTiers(eventId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('purchasable_ticket_tiers')
    .select('id, event_id, name, description, price, quantity_remaining, color, benefits, max_per_order, max_group_size')
    .eq('event_id', eventId)

  if (error) return []
  return data ?? []
}

async function getOrganizer(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('organizer_profiles')
    .select('org_name, org_description')
    .eq('user_id', userId)
    .maybeSingle()

  return data ?? null
}

async function getEventInterests(eventId: string) {
  const supabase = await createClient()
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
  const supabase = await createClient()
  const { data } = await supabase
    .from('cities')
    .select('name')
    .eq('id', cityId)
    .maybeSingle()
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

  return (
    <EventDetailClient
      event={{
        id: event.id,
        title: event.title,
        description: event.description,
        location: event.location,
        eventDate: event.event_date,
        endAt: event.end_at,
        imageUrl: event.image_url,
        googleMapsUrl: event.google_maps_url,
      }}
      tiers={tiers}
      organizer={organizer}
      interests={interests}
      cityName={cityName}
    />
  )
}
