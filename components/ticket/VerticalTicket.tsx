'use client'

import { useMemo, useRef, useState, useLayoutEffect, useCallback } from 'react'
import { Calendar, Clock, MapPin } from 'lucide-react'
import {
  computeTicketPath,
  QRPlaceholder,
  TicketArtwork,
  ARTWORK_WIDTH,
  ARTWORK_HEIGHT,
  type ResolvedVisual,
  type ImageCropState,
  DEFAULT_IMAGE_CROP,
} from './TicketTypeVisualMap'

type VerticalTicketProps = {
  visual: ResolvedVisual
  eventName?: string
  eventDate?: string
  eventLocation?: string
  imageCrop?: ImageCropState
  quantity?: number
  admissionCount?: number
  tkCode?: string
  price?: string
  holderName?: string
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).toUpperCase()
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).toUpperCase()
}

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"

const REF_W = 320
const MAX_DISPLAY_WIDTH = 380
const FALLBACK_HEIGHT = 700
const FALLBACK_NOTCH_Y = FALLBACK_HEIGHT * 0.7814
const HERO_MIN_HEIGHT = (REF_W * ARTWORK_HEIGHT) / ARTWORK_WIDTH

export default function VerticalTicket({
  visual,
  eventName,
  eventDate,
  eventLocation,
  imageCrop,
  quantity,
  admissionCount,
  tkCode,
  holderName,
}: VerticalTicketProps) {
  const TierIcon = visual.tierIcon
  const crop = imageCrop ?? DEFAULT_IMAGE_CROP
  const outerRef = useRef<HTMLDivElement>(null)
  const designRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [naturalHeight, setNaturalHeight] = useState(FALLBACK_HEIGHT)
  const [notchY, setNotchY] = useState(FALLBACK_NOTCH_Y)
  const [heroHeight, setHeroHeight] = useState(HERO_MIN_HEIGHT)
  const [imgFailed, setImgFailed] = useState(false)

  const admissions = admissionCount ?? quantity ?? 1
  const admitLabel = admissions === 1 ? 'ADMIT ONE' : `ADMIT ${admissions} PEOPLE`

  useLayoutEffect(() => {
    const outerEl = outerRef.current
    const designEl = designRef.current
    if (!outerEl || !designEl) return

    const measure = () => {
      const w = outerEl.clientWidth
      if (w > 0) setScale(w / REF_W)
      const h = designEl.offsetHeight
      if (h > 0) setNaturalHeight(h)
      if (footerRef.current) {
        setNotchY(footerRef.current.offsetTop)
      }
      if (heroRef.current) {
        setHeroHeight(heroRef.current.offsetHeight)
      }
    }
    measure()

    const ro = new ResizeObserver(measure)
    ro.observe(outerEl)
    ro.observe(designEl)
    return () => ro.disconnect()
  }, [])

  const clipPathStyle = useMemo(() => {
    const pathD = computeTicketPath(REF_W, naturalHeight, notchY)
    return {
      WebkitClipPath: `path('${pathD}')`,
      clipPath: `path('${pathD}')`,
    }
  }, [naturalHeight, notchY])

  const handleImgError = useCallback(() => setImgFailed(true), [])

  return (
    <div
      ref={outerRef}
      style={{
        width: '100%',
        maxWidth: MAX_DISPLAY_WIDTH,
        height: naturalHeight * scale,
        position: 'relative',
        flexShrink: 0,
        filter: 'drop-shadow(0 20px 34px rgba(0,0,0,0.5)) drop-shadow(0 4px 10px rgba(0,0,0,0.35))',
        margin: '0 auto',
      }}
    >
      <div
        ref={designRef}
        style={{
          width: REF_W,
          transformOrigin: 'top left',
          transform: `scale(${scale})`,
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        <div
          style={{
            width: '100%',
            background: visual.cardBackground,
            position: 'relative',
            overflow: 'hidden',
            fontFamily: FONT,
            ...clipPathStyle,
          }}
        >
          {/* Faint diagonal texture — only over the solid-color area below the hero photo */}
          <div
            style={{
              position: 'absolute',
              top: heroHeight,
              left: 0,
              right: 0,
              height: Math.max(0, notchY - heroHeight),
              opacity: 0.05,
              backgroundImage:
                'repeating-linear-gradient(45deg, #fff 0px, #fff 1px, transparent 1px, transparent 10px)',
              pointerEvents: 'none',
            }}
          />

          {/* HERO: photo (or fallback art) spans header + title + info rows, all text overlaid on it */}
          <div ref={heroRef} style={{ position: 'relative', overflow: 'hidden', minHeight: HERO_MIN_HEIGHT }}>
            <div style={{ position: 'absolute', inset: 0 }}>
              {visual.artworkImage && !imgFailed ? (
                <img
                  src={visual.artworkImage}
                  alt=""
                  onError={handleImgError}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: `${crop.positionX}% ${crop.positionY}%`,
                    transform: `scale(${crop.zoom})`,
                    transformOrigin: `${crop.positionX}% ${crop.positionY}%`,
                  }}
                />
              ) : (
                <TicketArtwork kind={visual.artworkKey} />
              )}
            </div>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 22%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.75) 100%)',
              }}
            />

            <div style={{ position: 'relative' }}>
              {/* HEADER */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  padding: '20px 0 10px',
                }}
              >
                <TierIcon size={16} color={visual.accentColor} strokeWidth={2} />
                <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '0.18em' }}>
                  HABESHA HUB
                </div>
                <div style={{ fontSize: 8, fontWeight: 500, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.22em' }}>
                  PRESENTS
                </div>
              </div>

              {/* TITLE */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px 20px 16px',
                  textAlign: 'center',
                  gap: 4,
                }}
              >
                <div
                  style={{
                    fontSize: 36,
                    fontWeight: 900,
                    lineHeight: 1.1,
                    letterSpacing: '0.02em',
                    maxWidth: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    ...(visual.titleGradient
                      ? {
                          backgroundImage: visual.titleGradient,
                          WebkitBackgroundClip: 'text',
                          backgroundClip: 'text',
                          color: 'transparent',
                        }
                      : { color: '#fff' }),
                  }}
                >
                  {eventName || 'Event Name'}
                </div>
                {visual.badge && (
                  <div
                    style={{
                      marginTop: 2,
                      background: visual.badge.bg,
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      padding: '4px 12px',
                      borderRadius: 999,
                    }}
                  >
                    {visual.badge.text}
                  </div>
                )}
              </div>

              {/* INFO ROWS */}
              <div style={{ padding: '10px 24px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {eventDate && (
                  <>
                    <InfoRow Icon={Calendar} color={visual.accentColor} l1={formatDay(eventDate)} l2={formatDateShort(eventDate)} />
                    <InfoRow Icon={Clock} color={visual.accentColor} l1={formatTime(eventDate)} l2="DOORS OPEN" />
                  </>
                )}
                {eventLocation && (
                  <InfoRow Icon={MapPin} color={visual.accentColor} l1={eventLocation.toUpperCase()} l2="" />
                )}
              </div>
            </div>
          </div>

          {/* TICKET HOLDER / CODE / ADMITS */}
          <div style={{ padding: '14px 24px 20px' }}>
            <div style={{ borderTop: '1px dotted rgba(255,255,255,0.3)', paddingTop: 12 }}>
              <div style={{ fontSize: 9, fontWeight: 600, color: visual.accentColor, letterSpacing: '0.12em', marginBottom: 3 }}>
                TICKET HOLDER
              </div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: '#fff',
                  marginBottom: 10,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '100%',
                }}
              >
                {holderName || '—'}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 600, color: visual.accentColor, letterSpacing: '0.12em', marginBottom: 3 }}>
                    TICKET CODE
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                    {tkCode || '—'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 9, fontWeight: 600, color: visual.accentColor, letterSpacing: '0.12em', marginBottom: 3 }}>
                    ADMITS
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>
                    {admissions === 1 ? '1 PERSON' : `${admissions} PEOPLE`}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* FOOTER / QR */}
          <div
            ref={footerRef}
            style={{
              background: visual.footerBackground,
              borderTop: '2px dashed rgba(255,255,255,0.35)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              padding: '14px 24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: visual.footerLabel.length > 10 ? 17 : 22, fontWeight: 800, color: '#fff', letterSpacing: '0.02em', lineHeight: 1.05 }}>
                  {visual.footerLabel}
                </div>
                {visual.footerSubtitle && (
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.14em' }}>
                    {visual.footerSubtitle}
                  </div>
                )}
              </div>
              <TierIcon size={22} color="rgba(255,255,255,0.9)" strokeWidth={2} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#fff', letterSpacing: '0.22em', whiteSpace: 'nowrap' }}>
                {admitLabel}
              </div>
              <div style={{ width: 78, height: 78, background: '#F4EEDD', borderRadius: 8, padding: 6, flexShrink: 0 }}>
                <QRPlaceholder />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ Icon, color, l1, l2 }: { Icon: typeof Calendar; color: string; l1: string; l2: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <Icon size={16} color={color} strokeWidth={2} style={{ flexShrink: 0 }} />
      <div style={{ lineHeight: 1.3, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {l1}
        </div>
        {l2 && (
          <div style={{ fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.04em' }}>
            {l2}
          </div>
        )}
      </div>
    </div>
  )
}
