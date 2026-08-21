'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronRight, MapPin } from 'lucide-react'
import {
  getTierConfig,
  getDisplayStatus,
  STATUS_CONFIG,
  isGroupTier,
  formatEventDate,
  formatOrderedAt,
} from './ticketDisplay'

type TicketSummaryOrder = {
  id: string
  quantity: number
  total_price: number
  status: string
  created_at: string | null
  tk_code: string | null
  checked_in_at: string | null
  rejection_reason: string | null
  event: { title: string; event_date: string; location: string | null; image_url: string | null } | null
  tier: { name: string; price: number } | null
}

export default function TicketSummaryCard({ order }: { order: TicketSummaryOrder }) {
  const [imgFailed, setImgFailed] = useState(false)
  const displayStatus = getDisplayStatus(order)
  const status = STATUS_CONFIG[displayStatus]
  const StatusIcon = status.icon
  const tierConfig = getTierConfig(order.tier?.name)
  const TierIcon = tierConfig.icon
  const groupTicket = isGroupTier(order.tier?.name)
  const isClickable = displayStatus === 'confirmed' || displayStatus === 'checked_in'

  const personLabel = order.quantity === 1 ? 'Person' : 'People'
  const price = order.total_price > 0 ? `${order.total_price.toLocaleString()} ETB` : 'Free'

  return (
    <Link
      href={isClickable ? `/my-tickets/${order.id}` : '#'}
      style={{
        display: 'flex', flexDirection: 'column',
        borderRadius: 14, background: '#fff',
        border: '1px solid #E5E7EB',
        textDecoration: 'none', color: 'inherit',
        cursor: isClickable ? 'pointer' : 'default',
        opacity: displayStatus === 'rejected' ? 0.6 : 1,
        overflow: 'hidden',
        transition: 'box-shadow 0.15s, transform 0.15s',
      }}
      tabIndex={0}
      aria-label={isClickable ? `View ticket for ${order.event?.title ?? 'event'}` : undefined}
      onClick={e => { if (!isClickable) e.preventDefault() }}
      onMouseEnter={e => {
        if (isClickable) {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)'
          e.currentTarget.style.transform = 'translateY(-1px)'
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.transform = 'none'
      }}
    >
      {/* Section 1: Event header */}
      <div style={{ display: 'flex', gap: 12, padding: '14px 14px 12px' }}>
        {/* Event image */}
        <div style={{
          width: 88, aspectRatio: '16 / 9', borderRadius: 10, overflow: 'hidden',
          flexShrink: 0, background: '#F2F4F7', position: 'relative',
        }}>
          {order.event?.image_url && !imgFailed ? (
            <Image
              src={order.event.image_url}
              alt=""
              fill
              sizes="88px"
              style={{ objectFit: 'cover' }}
              onError={() => setImgFailed(true)}
            />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              background: 'linear-gradient(135deg, #312e81, #111827)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 24, opacity: 0.4 }}>🎉</span>
            </div>
          )}
        </div>

        {/* Event info */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{
              fontSize: 16, fontWeight: 700, color: '#101828', margin: 0,
              lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {order.event?.title ?? 'Unknown Event'}
            </h3>
            <p style={{ fontSize: 13, color: '#475467', margin: '4px 0 0', lineHeight: 1.4 }}>
              {order.event?.event_date ? formatEventDate(order.event.event_date) : '—'}
            </p>
            {order.event?.location && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <MapPin size={12} color="#667085" style={{ flexShrink: 0 }} />
                <p style={{
                  fontSize: 13, color: '#667085', margin: 0,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {order.event.location}
                </p>
              </div>
            )}
          </div>
          {isClickable && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <ChevronRight size={18} color="#D0D5DD" />
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Ticket type */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px',
        background: tierConfig.bg,
        borderTop: '1px solid rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, borderRadius: 7,
            background: `${tierConfig.color}18`, color: tierConfig.color,
          }}>
            <TierIcon size={14} strokeWidth={2.5} />
          </span>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#101828', margin: 0 }}>
              {order.tier?.name ?? 'Ticket'}
            </p>
            <p style={{ fontSize: 12, color: '#475467', margin: '1px 0 0' }}>
              {groupTicket ? `${order.quantity} People` : `${order.quantity} ${personLabel}`}
            </p>
          </div>
        </div>
        <span style={{ fontSize: 14, fontWeight: 600, color: tierConfig.color }}>
          {price}
        </span>
      </div>

      {/* Section 3: Status */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px',
        borderTop: '1px solid #E5E7EB',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 24, height: 24, borderRadius: 99,
            background: status.bg,
          }}>
            <StatusIcon size={14} color={status.color} strokeWidth={2.5} />
          </span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: status.color, margin: 0 }}>
              {status.label}
            </p>
            {displayStatus === 'checked_in' && order.checked_in_at && (
              <p style={{ fontSize: 11, color: '#667085', margin: '1px 0 0' }}>Checked in</p>
            )}
            {displayStatus === 'confirmed' && (
              <p style={{ fontSize: 11, color: '#667085', margin: '1px 0 0' }}>Not checked in</p>
            )}
          </div>
        </div>
        <span style={{ fontSize: 12, color: '#667085' }}>
          Ordered {formatOrderedAt(order.created_at)}
        </span>
      </div>

      {/* Rejection reason */}
      {displayStatus === 'rejected' && order.rejection_reason && (
        <div style={{
          padding: '8px 14px 10px', borderTop: '1px solid #FEF2F2',
          background: '#FEF2F2',
        }}>
          <p style={{ fontSize: 12, color: '#B91C1C', margin: 0, lineHeight: 1.4 }}>
            {order.rejection_reason}
          </p>
        </div>
      )}
    </Link>
  )
}
