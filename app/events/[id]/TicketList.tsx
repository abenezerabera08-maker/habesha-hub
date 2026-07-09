'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()
  const [tiers, setTiers] = useState<TicketTier[]>(initialTiers)

  const handleBuyTickets = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/choose-role')
    } else {
      router.push(`/events/${eventId}/checkout`)
    }
  }

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
    <>
      <ul>
        {tiers.map((tier) => (
          <li key={tier.id}>
            {tier.name} — ${tier.price} ({tier.quantity_available - tier.quantity_sold} left)
          </li>
        ))}
      </ul>
      <button onClick={handleBuyTickets} style={{ marginTop: 16, padding: '10px 28px', borderRadius: 8, border: 'none', background: '#171717', color: '#fff', fontSize: 15, cursor: 'pointer' }}>
        Buy Tickets
      </button>
    </>
  )
}