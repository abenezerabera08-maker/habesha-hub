'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type TicketTier = {
  id: string
  name: string
  description: string | null
  price: number
  quantity_remaining: number
  color: string | null
  benefits: string[] | null
  max_group_size: number | null
}

const colorMap: Record<string, string> = {
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
  blue: '#3B82F6',
  green: '#22C55E',
  purple: '#A855F7',
  red: '#EF4444',
  gray: '#9CA3AF',
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

  const handleSelectTier = async (tierId: string) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/choose-role')
    } else {
      router.push(`/events/${eventId}/checkout?tier=${tierId}`)
    }
  }

  useEffect(() => {
    const fetchTiers = async () => {
      const { data } = await supabase
        .from('purchasable_ticket_tiers')
        .select('*')
        .eq('event_id', eventId)
      if (data) setTiers(data)
    }

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
        () => {
          fetchTiers()
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
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {tiers.map((tier) => (
          <li
            key={tier.id}
            style={{
              border: '1px solid #ddd',
              borderRadius: 8,
              padding: 16,
              marginBottom: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              {tier.color && (
                <span
                  style={{
                    display: 'inline-block',
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: colorMap[tier.color] ?? '#999',
                  }}
                />
              )}
              <strong>{tier.name}</strong>
            </div>
            {tier.description && (
              <p style={{ margin: '4px 0', color: '#555', fontSize: 14 }}>{tier.description}</p>
            )}
            <p style={{ margin: '4px 0' }}>
              {tier.price} ETB — {tier.quantity_remaining} remaining
            </p>
            {tier.benefits && tier.benefits.length > 0 && (
              <ul style={{ margin: '4px 0', paddingLeft: 20, fontSize: 14 }}>
                {tier.benefits.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            )}
            {tier.max_group_size && (
              <p style={{ margin: '4px 0', fontSize: 14, fontStyle: 'italic' }}>
                Group ticket — admits up to {tier.max_group_size} people per ticket
              </p>
            )}
            <button
              onClick={() => handleSelectTier(tier.id)}
              style={{ marginTop: 8, padding: '8px 20px', borderRadius: 8, border: 'none', background: '#171717', color: '#fff', fontSize: 14, cursor: 'pointer' }}
            >
              Select this ticket
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}