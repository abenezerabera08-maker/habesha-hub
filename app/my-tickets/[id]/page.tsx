'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { Users, User, Hash, Calendar, MapPin, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import VerticalTicket from '@/components/ticket/VerticalTicket'
import { resolveVisual } from '@/components/ticket/TicketTypeVisualMap'
import {
  getDisplayStatus,
  STATUS_CONFIG,
  isGroupTier,
  formatCheckedInAt,
} from '@/components/tickets/ticketDisplay'

type OrderData = {
  id: string
  quantity: number
  total_price: number
  status: string
  created_at: string | null
  tk_code: string | null
  checked_in_at: string | null
  checked_in_by: string | null
  event_id: string
  ticket_tier_id: string
  user_id: string
  payment_verifications_notes: string | null
}

type EventData = {
  id: string
  title: string
  event_date: string
  location: string | null
  venue_name: string | null
  city_id: string | null
}

type TierData = {
  id: string
  name: string
  price: number
}

type ProfileData = {
  full_name: string
}

export default function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

  const [order, setOrder] = useState<OrderData | null>(null)
  const [event, setEvent] = useState<EventData | null>(null)
  const [tier, setTier] = useState<TierData | null>(null)
  const [holderName, setHolderName] = useState<string>('')
  const [cityName, setCityName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('id, quantity, total_price, status, created_at, tk_code, checked_in_at, checked_in_by, event_id, ticket_tier_id, user_id')
        .eq('id', id)
        .eq('user_id', session.user.id)
        .single()

      if (orderError || !orderData) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setOrder(orderData as OrderData)

      const [eventRes, tierRes, profileRes] = await Promise.all([
        supabase
          .from('events')
          .select('id, title, event_date, location, venue_name, city_id')
          .eq('id', orderData.event_id)
          .single(),
        supabase
          .from('ticket_tiers')
          .select('id, name, price')
          .eq('id', orderData.ticket_tier_id)
          .single(),
        supabase
          .from('profiles')
          .select('full_name')
          .eq('id', session.user.id)
          .single(),
      ])

      if (eventRes.data) {
        setEvent(eventRes.data as EventData)
        if (eventRes.data.city_id) {
          const { data: city } = await supabase
            .from('cities')
            .select('name')
            .eq('id', eventRes.data.city_id)
            .single()
          setCityName(city?.name ?? null)
        }
      }
      if (tierRes.data) setTier(tierRes.data as TierData)
      if (profileRes.data) setHolderName((profileRes.data as ProfileData).full_name)

      setLoading(false)
    }

    load()
  }, [id, router])

  if (loading) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#F5F5F4' }} />
          <div style={{ height: 16, width: 100, borderRadius: 4, background: '#F5F5F4' }} />
        </div>
        <div style={{ height: 400, borderRadius: 16, background: '#F5F5F4', marginBottom: 20 }} />
        <div style={{ height: 200, borderRadius: 12, background: '#F5F5F4' }} />
      </div>
    )
  }

  if (notFound || !order || !event || !tier) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '48px 16px', textAlign: 'center' }}>
        <p style={{ fontSize: 18, fontWeight: 600, color: '#1C1917', margin: '0 0 8px' }}>
          Ticket not found
        </p>
        <p style={{ fontSize: 14, color: '#78716C', margin: '0 0 24px' }}>
          This ticket may no longer exist or you may not have access to it.
        </p>
        <button
          type="button"
          onClick={() => router.push('/my-tickets')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 20px',
            borderRadius: 10,
            border: 'none',
            background: '#1C1917',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={16} />
          Back to My Tickets
        </button>
      </div>
    )
  }

  const displayStatus = getDisplayStatus(order)
  const status = STATUS_CONFIG[displayStatus]
  const StatusIcon = status.icon
  const groupTicket = isGroupTier(tier.name)

  const visual = resolveVisual(tier.name, 'automatic', null, null)

  const locationStr = [event.venue_name || event.location, cityName]
    .filter(Boolean)
    .join(', ') || null

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', paddingBottom: 84 }}>
      {/* Sticky header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 16px',
          background: 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderBottom: '1px solid #F5F5F4',
        }}
      >
        <button
          type="button"
          onClick={() => router.push('/my-tickets')}
          aria-label="Back to My Tickets"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            border: 'none',
            background: 'none',
            color: '#1C1917',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            padding: '6px 8px',
            borderRadius: 8,
          }}
        >
          <ArrowLeft size={16} />
          My Tickets
        </button>
      </div>

      {/* Ticket visual */}
      <div style={{ padding: '24px 16px 20px' }}>
        <div
          style={{
            background: '#0b0d12',
            borderRadius: 16,
            padding: 20,
            maxWidth: 440,
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <VerticalTicket
            visual={visual}
            eventName={event.title}
            eventDate={event.event_date}
            eventLocation={locationStr ?? undefined}
            quantity={order.quantity}
            tkCode={order.tk_code ?? undefined}
            price={order.total_price > 0 ? `${order.total_price} ETB` : undefined}
          />
        </div>
      </div>

      {/* Status badge */}
      <div style={{ padding: '0 16px', marginBottom: 16 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '14px 16px',
            borderRadius: 12,
            background: status.bg,
          }}
        >
          <StatusIcon size={20} color={status.color} strokeWidth={2} style={{ flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: status.color, margin: 0 }}>
              {status.label}
            </p>
            {displayStatus === 'checked_in' && order.checked_in_at && (
              <p style={{ fontSize: 12, color: status.color, margin: '2px 0 0', opacity: 0.8 }}>
                {formatCheckedInAt(order.checked_in_at)}
              </p>
            )}
            {displayStatus === 'rejected' && order.payment_verifications_notes && (
              <p style={{ fontSize: 12, color: status.color, margin: '2px 0 0', opacity: 0.8 }}>
                Reason: {order.payment_verifications_notes}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Info card: Admits / Ticket Holder / Ticket Code */}
      <div style={{ padding: '0 16px', marginBottom: 16 }}>
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            border: '1px solid #F5F5F4',
            overflow: 'hidden',
          }}
        >
          <InfoRow
            Icon={Users}
            label="Admits"
            value={groupTicket ? `${order.quantity} People` : `${order.quantity} Person`}
          />
          <InfoRow
            Icon={User}
            label="Ticket Holder"
            value={holderName || '—'}
          />
          {order.tk_code && (
            <InfoRow
              Icon={Hash}
              label="Ticket Code"
              value={order.tk_code}
              last
              mono
            />
          )}
        </div>
      </div>

      {/* Event card */}
      <div style={{ padding: '0 16px', marginBottom: 16 }}>
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            border: '1px solid #F5F5F4',
            padding: 16,
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#A8A29E',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              margin: '0 0 12px',
            }}
          >
            Event
          </p>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
            <Calendar size={16} color="#A8A29E" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1C1917', margin: 0 }}>
                {new Date(event.event_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
              <p style={{ fontSize: 13, color: '#78716C', margin: '2px 0 0' }}>
                {new Date(event.event_date).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
          {locationStr && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <MapPin size={16} color="#A8A29E" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1C1917', margin: 0 }}>
                  {event.venue_name || event.location}
                </p>
                {event.venue_name && event.location && (
                  <p style={{ fontSize: 13, color: '#78716C', margin: '2px 0 0' }}>
                    {event.location}
                  </p>
                )}
                {cityName && (
                  <p style={{ fontSize: 13, color: '#78716C', margin: '2px 0 0' }}>
                    {cityName}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Show at entrance notice */}
      {displayStatus !== 'rejected' && displayStatus !== 'checked_in' && (
        <div style={{ padding: '0 16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 16px',
              borderRadius: 10,
              background: '#EFF6FF',
            }}
          >
            <p style={{ fontSize: 13, color: '#1D4ED8', margin: 0 }}>
              Show this ticket at the entrance. Screenshots will not be accepted.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({
  Icon,
  label,
  value,
  last,
  mono,
}: {
  Icon: typeof Users
  label: string
  value: string
  last?: boolean
  mono?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 16px',
        borderBottom: last ? 'none' : '1px solid #F5F5F4',
      }}
    >
      <Icon size={16} color="#A8A29E" style={{ flexShrink: 0 }} />
      <div>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#A8A29E', margin: 0, letterSpacing: '0.03em' }}>
          {label}
        </p>
        <p
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#1C1917',
            margin: '2px 0 0',
            ...(mono
              ? { fontFamily: "'SF Mono', 'Fira Code', 'Fira Mono', monospace", letterSpacing: '0.08em' }
              : {}),
          }}
        >
          {value}
        </p>
      </div>
    </div>
  )
}
