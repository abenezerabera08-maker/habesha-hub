import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import TicketList from './TicketList'

async function getEvent(id: string) {
  const { data, error } = await supabase
    .from('events')
    .select(`
      id, title, description, location, event_date,
      ticket_tiers ( id, name, price, quantity_available, quantity_sold )
    `)
    .eq('id', id)
    .single()

  if (error || !data) return null
  return data
}

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const event = await getEvent(id)
  if (!event) notFound()

  return (
    <div>
      <h1>{event.title}</h1>
      <p>{event.description}</p>
      <p><strong>Location:</strong> {event.location}</p>
      <p><strong>Date:</strong> {new Date(event.event_date).toLocaleString()}</p>

      <h2>Tickets</h2>
      <TicketList eventId={event.id} initialTiers={event.ticket_tiers} />
    </div>
  )
}