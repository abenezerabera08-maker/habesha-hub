import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import TicketList from './TicketList'

async function getEvent(id: string) {
  const { data, error } = await supabase
    .from('events')
    .select('id, title, description, location, event_date')
    .eq('id', id)
    .single()

  if (error || !data) return null
  return data
}

async function getTicketTiers(eventId: string) {
  const { data, error } = await supabase
    .from('purchasable_ticket_tiers')
    .select('*')
    .eq('event_id', eventId)

  if (error) return []
  return data ?? []
}

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const event = await getEvent(id)
  if (!event) notFound()

  const tiers = await getTicketTiers(id)

  return (
    <div>
      <h1>{event.title}</h1>
      <p>{event.description}</p>
      <p><strong>Location:</strong> {event.location}</p>
      <p><strong>Date:</strong> {new Date(event.event_date).toLocaleString()}</p>

      <h2>Tickets</h2>
      <TicketList eventId={event.id} initialTiers={tiers} />
    </div>
  )
}