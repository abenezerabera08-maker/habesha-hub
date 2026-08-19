'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Ticket } from 'lucide-react'

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
        .select('id, event_id, name, description, price, quantity_remaining, color, benefits, max_per_order, max_group_size')
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

  if (tiers.length === 0) {
    return (
      <div
        style={{
          padding: '24px 16px',
          textAlign: 'center',
          borderRadius: 12,
          border: '1px solid #F5F5F4',
          background: '#FAFAF9',
        }}
      >
        <Ticket size={24} color="#D6D3D1" style={{ marginBottom: 8 }} />
        <p style={{ fontSize: 14, color: '#A8A29E', margin: 0 }}>No tickets available yet.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {tiers.map((tier) => (
        <div
          key={tier.id}
          style={{
            border: '1px solid #F5F5F4',
            borderRadius: 12,
            padding: 14,
            background: '#fff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {tier.color && (
                <span
                  style={{
                    display: 'inline-block',
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: colorMap[tier.color] ?? '#999',
                  }}
                />
              )}
              <span style={{ fontSize: 14, fontWeight: 600, color: '#1C1917' }}>
                {tier.name}
              </span>
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1C1917' }}>
              {tier.price === 0 ? 'Free' : `ETB ${tier.price}`}
            </span>
          </div>

          {tier.description && (
            <p style={{ margin: '6px 0 0', fontSize: 13, color: '#78716C', lineHeight: 1.4 }}>
              {tier.description}
            </p>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontSize: 12, color: '#A8A29E' }}>
              {tier.quantity_remaining} remaining
              {tier.max_group_size && ` · Up to ${tier.max_group_size} per ticket`}
            </span>
            <button
              type="button"
              onClick={() => handleSelectTier(tier.id)}
              style={{
                padding: '6px 16px',
                borderRadius: 8,
                border: 'none',
                background: '#1C1917',
                color: '#fff',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Select
            </button>
          </div>

          {tier.benefits && tier.benefits.length > 0 && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #F5F5F4' }}>
              {tier.benefits.map((b, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span style={{ fontSize: 12, color: '#57534E' }}>{b}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
