'use client'

import React from 'react'
import Image from 'next/image'
import { type LucideIcon } from 'lucide-react'

type CarouselEvent = {
  id: string
  title: string
  location: string
  dateBadge: { month: string; day: string }
  time: string
  status?: string
  priceLabel?: string
  imageUrl?: string | null
}

type EventCarouselProps = {
  title: string
  icon: LucideIcon
  events: CarouselEvent[]
  onSeeAll?: () => void
  priorityFirst?: boolean
}

function CarouselCard({ event, priority }: { event: CarouselEvent; priority?: boolean }) {
  const [imgFailed, setImgFailed] = React.useState(false)
  const showImage = !!event.imageUrl && !imgFailed

  return (
    <a
      href={`/events/${event.id}`}
      style={{
        width: 220,
        flexShrink: 0,
        overflow: 'hidden',
        borderRadius: 16,
        border: '1px solid #f0f0f0',
        background: '#fff',
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <div
        style={{
          position: 'relative',
          height: 120,
          width: '100%',
          background: 'linear-gradient(135deg, #fef3c7 0%, #e5e7eb 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {showImage && (
          <Image
            src={event.imageUrl!}
            alt={event.title}
            fill
            sizes="(max-width: 768px) 50vw, 220px"
            style={{ objectFit: 'cover' }}
            onError={() => setImgFailed(true)}
            priority={priority}
          />
        )}
        <div
          style={{
            position: 'absolute',
            left: 8,
            top: 8,
            borderRadius: 8,
            background: '#fff',
            padding: '4px 8px',
            textAlign: 'center',
            lineHeight: 1,
            boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 600, color: '#D97706' }}>
            {event.dateBadge.month}
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1C1917' }}>
            {event.dateBadge.day}
          </div>
        </div>
      </div>
      <div style={{ padding: '10px 12px 12px' }}>
        <h3
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#1C1917',
            margin: 0,
            lineHeight: 1.3,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {event.title}
        </h3>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            marginTop: 6,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span
            style={{
              fontSize: 11,
              color: '#999',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {event.location}
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            marginTop: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span style={{ fontSize: 11, color: '#999' }}>{event.time}</span>
          </div>
          {event.status && (
            <span
              style={{
                flexShrink: 0,
                borderRadius: 20,
                background: '#F59E0B',
                padding: '2px 8px',
                fontSize: 10,
                fontWeight: 600,
                color: '#fff',
              }}
            >
              {event.status}
            </span>
          )}
        </div>
        {event.priceLabel && (
          <div style={{ marginTop: 6, fontSize: 11, fontWeight: 600, color: '#44403C' }}>
            {event.priceLabel}
          </div>
        )}
      </div>
    </a>
  )
}

export default function EventCarousel({ title, icon: Icon, events, onSeeAll, priorityFirst }: EventCarouselProps) {
  if (events.length === 0) return null

  return (
    <div style={{ marginTop: 24 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon size={16} color="#F59E0B" />
          <span style={{ fontSize: 16, fontWeight: 600, color: '#1C1917' }}>
            {title}
          </span>
        </div>
        {onSeeAll && (
          <button
            type="button"
            onClick={onSeeAll}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              color: '#D97706',
              padding: 0,
            }}
          >
            See all
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        )}
      </div>
      <div
        style={{
          marginTop: 12,
          display: 'flex',
          gap: 12,
          overflowX: 'auto',
          padding: '0 16px 4px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {events.map((e, index) => (
          <CarouselCard key={e.id} event={e} priority={priorityFirst && index === 0} />
        ))}
      </div>
    </div>
  )
}
