'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function CreateEventPage() {
  const [loading, setLoading] = useState(true)
  const [isOrganizer, setIsOrganizer] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [ticketName, setTicketName] = useState('General Admission')
  const [ticketPrice, setTicketPrice] = useState('')
  const [ticketQuantity, setTicketQuantity] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (profile?.role !== 'organizer') {
        setError('Only organizers can create events.')
        setLoading(false)
        return
      }
      setIsOrganizer(true)
      setLoading(false)
    }
    checkAccess()
  }, [router])

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    // Step 1: create the event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        organizer_id: session.user.id,
        title,
        description,
        location,
        event_date: eventDate,
      })
      .select()
      .single()

    if (eventError) {
      setError(eventError.message)
      return
    }

    // Step 2: create the ticket tier, linked to that event
    const { error: tierError } = await supabase.from('ticket_tiers').insert({
      event_id: event.id,
      name: ticketName,
      price: parseFloat(ticketPrice),
      quantity_available: parseInt(ticketQuantity),
      quantity_sold: 0,
    })

    if (tierError) {
      setError(tierError.message)
      return
    }

    router.push('/account')
  }

  if (loading) return <p>Loading...</p>
  if (!isOrganizer) return <p>{error}</p>

  return (
    <div>
      <h1>Create Event</h1>
      <form onSubmit={handleCreateEvent}>
        <input type="text" placeholder="Event title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <input type="text" placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} required />
        <input type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required />

        <h3>Ticket Info</h3>
        <input type="text" placeholder="Ticket type (e.g. General Admission)" value={ticketName} onChange={(e) => setTicketName(e.target.value)} required />
        <input type="number" step="0.01" placeholder="Price" value={ticketPrice} onChange={(e) => setTicketPrice(e.target.value)} required />
        <input type="number" placeholder="Quantity available" value={ticketQuantity} onChange={(e) => setTicketQuantity(e.target.value)} required />

        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit">Create Event</button>
      </form>
    </div>
  )
}