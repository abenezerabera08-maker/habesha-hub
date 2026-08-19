'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import {
  getTierConfig,
  getDisplayStatus,
  STATUS_CONFIG,
  isGroupTier,
  formatOrderedAt,
} from './ticketDisplay'

type TicketSummaryOrder = {
  id: string
  quantity: number
  status: string
  created_at: string | null
  tk_code: string | null
  checked_in_at: string | null
  rejection_reason: string | null
  event: { title: string; event_date: string } | null
  tier: { name: string } | null
}

export default function TicketSummaryCard({ order }: { order: TicketSummaryOrder }) {
  const displayStatus = getDisplayStatus(order)
  const status = STATUS_CONFIG[displayStatus]
  const StatusIcon = status.icon
  const tierConfig = getTierConfig(order.tier?.name)
  const TierIcon = tierConfig.icon
  const groupTicket = isGroupTier(order.tier?.name)
  const isClickable = displayStatus === 'confirmed' || displayStatus === 'checked_in'

  const personLabel = order.quantity === 1 ? 'Person' : 'People'

  return (
    <Link
      href={isClickable ? `/my-tickets/${order.id}` : '#'}
      style={{
        display: 'flex',
        borderRadius: 14,
        background: '#fff',
        border: '1px solid #F5F5F4',
        textDecoration: 'none',
        color: 'inherit',
        cursor: isClickable ? 'pointer' : 'default',
        opacity: displayStatus === 'rejected' ? 0.6 : 1,
        overflow: 'hidden',
        transition: 'box-shadow 0.15s',
      }}
      tabIndex={0}
      aria-label={
        isClickable
          ? `View ticket for ${order.event?.title ?? 'event'}`
          : undefined
      }
      onClick={(e) => {
        if (!isClickable) e.preventDefault()
      }}
    >
      {/* Left accent bar */}
      <div
        style={{
          width: 4,
          flexShrink: 0,
          background: tierConfig.color,
          borderRadius: '14px 0 0 14px',
        }}
      />

      {/* Content */}
      <div style={{ flex: 1, padding: '14px 14px 14px 14px', minWidth: 0 }}>
        {/* Top row: tier badge + status */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 8px',
              borderRadius: 6,
              background: tierConfig.bg,
              fontSize: 11,
              fontWeight: 700,
              color: tierConfig.color,
              letterSpacing: '0.03em',
            }}
          >
            <TierIcon size={12} strokeWidth={2.5} />
            {(order.tier?.name ?? 'Ticket').toUpperCase()}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <StatusIcon size={13} color={status.color} strokeWidth={2.5} />
            <span style={{ fontSize: 11, fontWeight: 700, color: status.color, letterSpacing: '0.02em' }}>
              {status.label.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Event title */}
        <h3
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: '#1C1917',
            margin: 0,
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {order.event?.title ?? 'Unknown Event'}
        </h3>

        {/* Tier + quantity */}
        <p style={{ fontSize: 13, color: '#78716C', margin: '4px 0 0' }}>
          {groupTicket ? `${order.quantity} People · ` : `${order.quantity} ${personLabel} · `}
          Ordered {formatOrderedAt(order.created_at)}
        </p>

        {/* Rejection reason */}
        {displayStatus === 'rejected' && order.rejection_reason && (
          <p style={{ fontSize: 12, color: '#B91C1C', margin: '6px 0 0', lineHeight: 1.4 }}>
            {order.rejection_reason}
          </p>
        )}

        {/* Bottom row: arrow for clickable cards */}
        {isClickable && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
            <ChevronRight size={16} color="#D6D3D1" />
          </div>
        )}
      </div>
    </Link>
  )
}
