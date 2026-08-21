'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Clock, MapPin, Share2, ExternalLink, ChevronRight, Crown, Star, Users, Ticket, ImageOff, Check } from 'lucide-react'
import { getEventStatus, type EventTimingStatus } from '@/lib/eventStatus'

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

type Props = {
  event: {
    id: string
    title: string
    description: string | null
    location: string | null
    eventDate: string
    endAt: string | null
    imageUrl: string | null
    googleMapsUrl: string | null
  }
  tiers: TicketTier[]
  organizer: { org_name: string; org_description: string | null } | null
  interests: { id: string; name: string }[]
  cityName: string | null
}

const TIER_ICON_MAP: Record<string, typeof Ticket> = {
  VIP: Crown,
  'Early Bird': Clock,
  'General Admission': Star,
  'Jema (Group Ticket)': Users,
  'Backstage Pass': Crown,
  'Balcony/Standing': Users,
}

const TIER_COLOR_MAP: Record<string, string> = {
  VIP: '#7C3AED',
  'Early Bird': '#2563EB',
  'General Admission': '#059669',
  'Jema (Group Ticket)': '#EA580C',
  'Backstage Pass': '#DC2626',
  'Balcony/Standing': '#6B7280',
}

function getTierIcon(name: string) {
  return TIER_ICON_MAP[name] || Ticket
}

function getTierColor(name: string) {
  return TIER_COLOR_MAP[name] || '#6B7280'
}

function renderAbout(description: string) {
  const lines = description.split('\n')
  return lines.map((line, i) => {
    if (line.startsWith('### ')) {
      return <h3 key={i} style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: '18px 0 8px' }}>{line.slice(4)}</h3>
    }
    if (line.startsWith('## ')) {
      return <h2 key={i} style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '22px 0 10px' }}>{line.slice(3)}</h2>
    }
    if (line.startsWith('# ')) {
      return <h1 key={i} style={{ fontSize: 21, fontWeight: 700, color: '#111827', margin: '26px 0 12px' }}>{line.slice(2)}</h1>
    }
    if (line.startsWith('- ')) {
      return (
        <li key={i} style={{ fontSize: 15, color: '#374151', lineHeight: 1.65, marginLeft: 16, marginBottom: 4 }}>
          {line.slice(2)}
        </li>
      )
    }
    if (line.trim() === '') {
      return <div key={i} style={{ height: 12 }} />
    }
    const parts: React.ReactNode[] = []
    const regex = /\*\*(.*?)\*\*|\*(.*?)\*/g
    let lastIdx = 0
    let m: RegExpExecArray | null
    while ((m = regex.exec(line)) !== null) {
      if (m.index > lastIdx) parts.push(<span key={`t${lastIdx}`}>{line.slice(lastIdx, m.index)}</span>)
      if (m[1] !== undefined) {
        parts.push(<strong key={`b${m.index}`} style={{ fontWeight: 600 }}>{m[1]}</strong>)
      } else if (m[2] !== undefined) {
        parts.push(<em key={`i${m.index}`}>{m[2]}</em>)
      }
      lastIdx = m.index + m[0].length
    }
    if (lastIdx < line.length) parts.push(<span key={`t${lastIdx}`}>{line.slice(lastIdx)}</span>)
    return <p key={i} style={{ fontSize: 15, color: '#374151', lineHeight: 1.7, margin: '0 0 6px' }}>{parts.length > 0 ? parts : line}</p>
  })
}

const s = {
  iconBadge: (bg: string): React.CSSProperties => ({
    width: 38, height: 38, borderRadius: 10, background: bg,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  }),
  sectionHead: { fontSize: 18, fontWeight: 700, color: '#111827' as const, margin: '0 0 14px' },
}

export default function EventDetailClient({ event, tiers, organizer, interests, cityName }: Props) {
  const router = useRouter()
  const [imgFailed, setImgFailed] = useState(false)

  const handleSelectTier = useCallback(async (tierId: string) => {
    const { supabase } = await import('@/lib/supabase')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/choose-role') } else { router.push(`/events/${event.id}/checkout?tier=${tierId}`) }
  }, [event.id, router])

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try { await navigator.share({ title: event.title, url: window.location.href }) } catch { /* ignore */ }
    } else {
      await navigator.clipboard.writeText(window.location.href)
    }
  }, [event.title])

  const eventDate = new Date(event.eventDate)
  const dateStr = eventDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const startTimeStr = eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const endTimeStr = event.endAt ? new Date(event.endAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : null
  const timeRangeStr = endTimeStr ? `${startTimeStr} – ${endTimeStr}` : startTimeStr
  const showImage = !!event.imageUrl && !imgFailed
  const fullLocation = event.location ? (cityName ? `${event.location}, ${cityName}` : event.location) : cityName || ''

  const { status: timingStatus, label: statusLabel } = getEventStatus(event.eventDate, event.endAt)

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', paddingBottom: 100 }}>
      {/* Cover Image */}
      <div style={{ position: 'relative', margin: '0 16px', marginTop: 12, borderRadius: 20, overflow: 'hidden', aspectRatio: '16/9', background: '#F3F4F6' }}>
        {showImage ? (
          <img src={event.imageUrl!} alt={event.title} onError={() => setImgFailed(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #FDE68A 0%, #F59E0B 50%, #D97706 100%)' }}>
            <ImageOff size={48} color="rgba(255,255,255,0.5)" />
          </div>
        )}
        <button type="button" onClick={() => router.back()} aria-label="Go back"
          style={{ position: 'absolute', top: 12, left: 12, width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
      </div>

      <div style={{ padding: '0 16px' }}>
        {/* Title + Share */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginTop: 20 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1.2, flex: 1 }}>{event.title}</h1>
          <button type="button" onClick={handleShare} aria-label="Share event"
            style={{ width: 42, height: 42, borderRadius: 12, border: '1px solid #E5E7EB', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'background 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
            onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
            <Share2 size={18} color="#6B7280" />
          </button>
        </div>

        {/* Status badge */}
        {statusLabel && (
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '4px 12px', borderRadius: 20,
              background: timingStatus === 'upcoming' ? '#FEF3C7' : timingStatus === 'happening' ? '#ECFDF5' : '#F3F4F6',
              color: timingStatus === 'upcoming' ? '#92400E' : timingStatus === 'happening' ? '#065F46' : '#6B7280',
              fontSize: 12, fontWeight: 600,
            }}>
              {timingStatus === 'upcoming' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B' }} />}
              {timingStatus === 'happening' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E' }} />}
              {timingStatus === 'ended' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#9CA3AF' }} />}
              {statusLabel}
            </span>
          </div>
        )}

        {/* Date / Time / Location */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={s.iconBadge('#FEF3C7')}><Calendar size={18} color="#D97706" /></div>
            <span style={{ fontSize: 15, color: '#374151', fontWeight: 500 }}>{dateStr}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={s.iconBadge('#FEF3C7')}><Clock size={18} color="#D97706" /></div>
            <span style={{ fontSize: 15, color: '#374151', fontWeight: 500 }}>{timeRangeStr}</span>
          </div>
          {fullLocation && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={s.iconBadge('#FEF3C7')}><MapPin size={18} color="#D97706" /></div>
              <span style={{ fontSize: 15, color: '#374151', fontWeight: 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {fullLocation}
              </span>
            </div>
          )}
        </div>

        {/* View on Map */}
        {event.googleMapsUrl && (
          <a href={event.googleMapsUrl} target="_blank" rel="noopener noreferrer"
            aria-label="View event location on Google Maps"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', marginTop: 14, padding: '13px 0', borderRadius: 12,
              border: '1px solid #E5E7EB', background: '#fff', fontSize: 14, fontWeight: 600,
              color: '#374151', cursor: 'pointer', textDecoration: 'none',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
            onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
            <MapPin size={16} color="#D97706" /> View on Map <ExternalLink size={14} color="#9CA3AF" />
          </a>
        )}

        {/* Interest Tags */}
        {interests.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
            {interests.map((interest) => (
              <span key={interest.id} style={{ padding: '5px 14px', borderRadius: 20, background: '#FEF3C7', fontSize: 13, fontWeight: 500, color: '#92400E' }}>
                {interest.name}
              </span>
            ))}
          </div>
        )}

        {/* About */}
        {event.description && (
          <div style={{ marginTop: 28 }}>
            <h2 style={s.sectionHead}>About this event</h2>
            <div style={{ whiteSpace: 'pre-wrap' }}>{renderAbout(event.description)}</div>
          </div>
        )}

        {/* Organizers */}
        {organizer && (
          <div style={{ marginTop: 32 }}>
            <h2 style={s.sectionHead}>Organizers</h2>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '16px', border: '1px solid #E5E7EB', borderRadius: 14, background: '#fff',
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%', background: '#FEF3C7',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 700, color: '#D97706', flexShrink: 0,
              }}>
                {organizer.org_name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{organizer.org_name}</p>
                <p style={{ fontSize: 13, color: '#9CA3AF', margin: '2px 0 0' }}>Organizer</p>
              </div>
              <ChevronRight size={18} color="#D1D5DB" />
            </div>
          </div>
        )}

        {/* Tickets */}
        <div style={{ marginTop: 32 }}>
          <h2 style={s.sectionHead}>Tickets</h2>
          {tiers.length === 0 ? (
            <div style={{ padding: '28px 16px', textAlign: 'center', borderRadius: 14, border: '1px solid #F3F4F6', background: '#FAFAF9' }}>
              <Ticket size={28} color="#D6D3D1" style={{ marginBottom: 10 }} />
              <p style={{ fontSize: 15, color: '#A8A29E', margin: 0 }}>No tickets available yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {tiers.map((tier) => {
                const TierIcon = getTierIcon(tier.name)
                const tierColor = getTierColor(tier.name)
                const soldOut = tier.quantity_remaining <= 0
                return (
                  <div key={tier.id} style={{
                    background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 18,
                    transition: 'box-shadow 0.15s',
                  }}>
                    {/* Top: icon + name + price */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: 10,
                          background: `${tierColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <TierIcon size={20} color={tierColor} />
                        </div>
                        <span style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>{tier.name}</span>
                      </div>
                      <span style={{ fontSize: 17, fontWeight: 700, color: '#111827' }}>
                        {tier.price === 0 ? 'Free' : `ETB ${tier.price}`}
                      </span>
                    </div>

                    {/* Description */}
                    {tier.description && (
                      <p style={{ margin: '10px 0 0', fontSize: 14, color: '#6B7280', lineHeight: 1.5 }}>{tier.description}</p>
                    )}

                    {/* Benefits */}
                    {tier.benefits && tier.benefits.length > 0 && (
                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #F3F4F6' }}>
                        {tier.benefits.map((b, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <Check size={14} color="#22C55E" strokeWidth={2.5} />
                            <span style={{ fontSize: 13, color: '#57534E' }}>{b}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Bottom: remaining + button */}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      marginTop: 14, paddingTop: 12, borderTop: '1px solid #F3F4F6',
                    }}>
                      <div>
                        <span style={{ fontSize: 13, color: soldOut ? '#DC2626' : '#9CA3AF', fontWeight: soldOut ? 600 : 400 }}>
                          {soldOut ? 'Sold out' : `${tier.quantity_remaining} remaining`}
                        </span>
                        {tier.max_group_size && !soldOut && (
                          <span style={{ fontSize: 13, color: '#9CA3AF' }}> · Up to {tier.max_group_size} per ticket</span>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={soldOut}
                        onClick={() => !soldOut && handleSelectTier(tier.id)}
                        aria-label={soldOut ? `${tier.name} sold out` : `Get your ${tier.name} ticket`}
                        style={{
                          padding: '11px 22px', borderRadius: 10, border: 'none',
                          background: soldOut ? '#F3F4F6' : tierColor,
                          color: soldOut ? '#9CA3AF' : '#fff',
                          fontSize: 14, fontWeight: 600,
                          cursor: soldOut ? 'not-allowed' : 'pointer',
                          transition: 'opacity 0.15s',
                        }}
                        onMouseEnter={e => { if (!soldOut) e.currentTarget.style.opacity = '0.85' }}
                        onMouseLeave={e => { if (!soldOut) e.currentTarget.style.opacity = '1' }}>
                        {soldOut ? 'Sold Out' : 'Get Your Ticket'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
