'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { Users, User, Hash, Calendar, MapPin, ArrowLeft, Shield, Share2 } from 'lucide-react'
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
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#F5F5F4' }} />
          <div style={{ height: 16, width: 120, borderRadius: 4, background: '#F5F5F4' }} />
        </div>
        <div style={{ height: 440, borderRadius: 16, background: '#F5F5F4', marginBottom: 20 }} />
        <div style={{ height: 180, borderRadius: 12, background: '#F5F5F4' }} />
      </div>
    )
  }

  if (notFound || !order || !event || !tier) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '48px 20px', textAlign: 'center' }}>
        <p style={{ fontSize: 18, fontWeight: 600, color: '#101828', margin: '0 0 8px' }}>
          Ticket not found
        </p>
        <p style={{ fontSize: 14, color: '#667085', margin: '0 0 24px' }}>
          This ticket may no longer exist or you may not have access to it.
        </p>
        <button
          type="button"
          onClick={() => router.push('/my-tickets')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '10px 20px', borderRadius: 10, border: 'none',
            background: '#1C1917', color: '#fff',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
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

  const eventDateObj = new Date(event.event_date)
  const dayName = eventDateObj.toLocaleDateString('en-US', { weekday: 'long' })
  const monthDay = eventDateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const timeStr = eventDateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', paddingBottom: 100 }}>

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid #F2F4F7',
      }}>
        <button
          type="button"
          onClick={() => router.push('/my-tickets')}
          aria-label="Back to My Tickets"
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            border: 'none', background: 'none',
            color: '#101828', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', padding: '6px 8px', borderRadius: 8,
          }}
        >
          <ArrowLeft size={18} />
        </button>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#101828' }}>
          My Tickets
        </span>
        <button
          type="button"
          aria-label="Share ticket"
          style={{
            display: 'flex', alignItems: 'center',
            border: 'none', background: 'none',
            color: '#101828', cursor: 'pointer',
            padding: '6px 8px', borderRadius: 8,
          }}
        >
          <Share2 size={18} />
        </button>
      </div>

      {/* Event title + date — centered */}
      <div style={{ padding: '20px 20px 16px', textAlign: 'center' }}>
        <h1 style={{
          fontSize: 28, fontWeight: 800, color: '#101828',
          margin: '0 0 6px', letterSpacing: '-0.02em',
          lineHeight: 1.15,
        }}>
          {event.title}
        </h1>
        <p style={{ fontSize: 15, color: '#475467', margin: 0 }}>
          {dayName}, {monthDay} · {timeStr}
        </p>
      </div>

      {/* Large Vertical Ticket */}
      <div style={{ padding: '0 20px', marginBottom: 20 }}>
        <div style={{
          background: '#0b0d12', borderRadius: 16, padding: 20,
          maxWidth: 344, margin: '0 auto',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
        }}>
          <VerticalTicket
            visual={visual}
            eventName={event.title}
            eventDate={event.event_date}
            eventLocation={locationStr ?? undefined}
            quantity={order.quantity}
            admissionCount={order.quantity}
            tkCode={order.tk_code ?? undefined}
            price={order.total_price > 0 ? `${order.total_price} ETB` : undefined}
            holderName={holderName || undefined}
          />
        </div>
      </div>

      {/* Status confirmation box */}
      <div style={{ padding: '0 20px', marginBottom: 16 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 16px', borderRadius: 12,
          background: status.bg, border: `1px solid ${status.color}20`,
        }}>
          <span style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, borderRadius: 99,
            background: `${status.color}15`,
          }}>
            <StatusIcon size={18} color={status.color} strokeWidth={2} />
          </span>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: status.color, margin: 0 }}>
              {status.label}
            </p>
            {displayStatus === 'confirmed' && (
              <p style={{ fontSize: 12, color: '#475467', margin: '2px 0 0' }}>Not checked in</p>
            )}
            {displayStatus === 'checked_in' && order.checked_in_at && (
              <p style={{ fontSize: 12, color: '#475467', margin: '2px 0 0' }}>
                {formatCheckedInAt(order.checked_in_at)}
              </p>
            )}
            {displayStatus === 'rejected' && order.payment_verifications_notes && (
              <p style={{ fontSize: 12, color: '#475467', margin: '2px 0 0' }}>
                Reason: {order.payment_verifications_notes}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Ticket info card: Admits / Ticket Holder / Ticket Code */}
      <div style={{ padding: '0 20px', marginBottom: 16 }}>
        <div style={{
          background: '#fff', borderRadius: 12,
          border: '1px solid #E5E7EB', overflow: 'hidden',
        }}>
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

      {/* Event details card */}
      <div style={{ padding: '0 20px', marginBottom: 16 }}>
        <div style={{
          background: '#fff', borderRadius: 12,
          border: '1px solid #E5E7EB', padding: 16,
        }}>
          <p style={{
            fontSize: 11, fontWeight: 700, color: '#98A2B3',
            letterSpacing: '0.08em', textTransform: 'uppercase',
            margin: '0 0 14px',
          }}>
            Event Details
          </p>

          {/* Date */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
            <Calendar size={18} color="#667085" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#101828', margin: 0 }}>
                {dayName}, {monthDay}
              </p>
              <p style={{ fontSize: 14, color: '#475467', margin: '2px 0 0' }}>
                {timeStr}
              </p>
            </div>
          </div>

          {/* Location */}
          {locationStr && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <MapPin size={18} color="#667085" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#101828', margin: 0 }}>
                  {event.venue_name || event.location}
                </p>
                {event.venue_name && event.location && (
                  <p style={{ fontSize: 14, color: '#475467', margin: '2px 0 0' }}>
                    {event.location}
                  </p>
                )}
                {cityName && (
                  <p style={{ fontSize: 14, color: '#475467', margin: '2px 0 0' }}>
                    {cityName}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Entrance warning */}
      {displayStatus !== 'rejected' && displayStatus !== 'checked_in' && (
        <div style={{ padding: '0 20px' }}>
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            padding: '14px 16px', borderRadius: 12,
            background: '#EFF6FF', border: '1px solid #BFDBFE',
          }}>
            <Shield size={18} color="#2563EB" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#1D4ED8', margin: '0 0 2px' }}>
                Show this ticket at the entrance
              </p>
              <p style={{ fontSize: 12, color: '#667085', margin: 0, lineHeight: 1.4 }}>
                Screenshots will not be accepted.
              </p>
            </div>
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
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 16px',
      borderBottom: last ? 'none' : '1px solid #F2F4F7',
    }}>
      <span style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 36, height: 36, borderRadius: 8, background: '#F2F4F7',
        flexShrink: 0,
      }}>
        <Icon size={16} color="#667085" />
      </span>
      <div>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#98A2B3', margin: 0, letterSpacing: '0.03em' }}>
          {label}
        </p>
        <p
          style={{
            fontSize: 15, fontWeight: 600, color: '#101828', margin: '2px 0 0',
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
