'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Heart, Share2, MapPin, Calendar, ImageOff } from 'lucide-react'

type EventCardProps = {
  id: string
  title: string
  description: string | null
  location: string
  eventDate: string
  imageUrl: string | null
  interestNames: string[]
  price: string
}

function formatDay(iso: string): string {
  return new Date(iso).getDate().toString()
}

function formatMonth(iso: string): string {
  return new Date(iso)
    .toLocaleDateString('en-US', { month: 'short' })
    .toUpperCase()
}

function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function formatEventTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function EventCard({
  id,
  title,
  description,
  location,
  eventDate,
  imageUrl,
  interestNames,
  price,
}: EventCardProps) {
  const [isFavorite, setIsFavorite] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)
  const showImage = !!imageUrl && !imgFailed

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: `Check out ${title} on Habesha Hub!`,
          url: `${window.location.origin}/events/${id}`,
        })
      } catch {
        /* user cancelled */
      }
    }
  }

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsFavorite((prev) => !prev)
  }

  return (
    <Link
      href={`/events/${id}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: '#fff',
        borderRadius: 14,
        overflow: 'hidden',
        border: '1px solid #eee',
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      {/* Image */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          paddingBottom: '56.25%',
          background: '#f0f0f0',
        }}
      >
        {showImage ? (
          <img
            src={imageUrl!}
            alt={title}
            onError={() => setImgFailed(true)}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #f5af19 0%, #f12711 100%)',
            }}
          >
            <ImageOff size={40} color="rgba(255,255,255,0.6)" />
          </div>
        )}

        {/* Date badge */}
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            background: '#fff',
            borderRadius: 8,
            padding: '5px 9px',
            textAlign: 'center',
            boxShadow: '0 1px 6px rgba(0,0,0,0.12)',
            lineHeight: 1,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700, color: '#171717' }}>
            {formatDay(eventDate)}
          </div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: '#888',
              marginTop: 1,
            }}
          >
            {formatMonth(eventDate)}
          </div>
        </div>

        {/* Action buttons */}
        <div
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <button
            type="button"
            aria-label="Share"
            onClick={handleShare}
            style={{
              background: '#fff',
              border: 'none',
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 1px 6px rgba(0,0,0,0.12)',
            }}
          >
            <Share2 size={14} color="#171717" />
          </button>
          <button
            type="button"
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            onClick={handleFavorite}
            style={{
              background: '#fff',
              border: 'none',
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 1px 6px rgba(0,0,0,0.12)',
            }}
          >
            <Heart
              size={14}
              fill={isFavorite ? '#ef4444' : 'none'}
              color={isFavorite ? '#ef4444' : '#171717'}
            />
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '14px 14px 16px' }}>
        <h3
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#171717',
            margin: '0 0 6px',
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </h3>

        {description && (
          <p
            style={{
              fontSize: 13,
              color: '#666',
              margin: '0 0 10px',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: 1.4,
            }}
          >
            {description}
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
          <MapPin size={13} color="#999" />
          <span
            style={{
              fontSize: 12,
              color: '#888',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {location}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
          <Calendar size={13} color="#999" />
          <span style={{ fontSize: 12, color: '#888' }}>
            {formatEventDate(eventDate)} · {formatEventTime(eventDate)}
          </span>
        </div>

        {interestNames.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
            {interestNames.slice(0, 3).map((name) => (
              <span
                key={name}
                style={{
                  padding: '3px 9px',
                  borderRadius: 20,
                  background: '#f5f5f5',
                  fontSize: 11,
                  fontWeight: 500,
                  color: '#555',
                }}
              >
                {name}
              </span>
            ))}
          </div>
        )}

        <p style={{ fontSize: 15, fontWeight: 700, color: '#171717', margin: 0 }}>
          {price}
        </p>
      </div>
    </Link>
  )
}
