'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type TicketTier = {
  id: string
  name: string
  price: number
  quantity_available: number
  quantity_sold: number
}

export default function TicketList({
  eventId,
  initialTiers,
}: {
  eventId: string
  initialTiers: TicketTier[]
}) {
  const [tiers, setTiers] = useState<TicketTier[]>(initialTiers)

  useEffect(() => {
    const channel = supabase
      .channel(`ticket_tiers:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ticket_tiers',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          setTiers((current) =>
            current.map((tier) =>
              tier.id === payload.new.id ? (payload.new as TicketTier) : tier
            )
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId])

  if (tiers.length === 0) return <p>No tickets available yet.</p>

  return (
    <ul>
      {tiers.map((tier) => (
        <li key={tier.id}>
          {tier.name} — ${tier.price} ({tier.quantity_available - tier.quantity_sold} left)
        </li>
      ))}
    </ul>
  )
}