'use client'

import { use, useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { checkoutOrder } from '@/lib/services/payments'
import {
  ArrowLeft, Ticket, Crown, Star, Users, Clock,
  Minus, Plus, Upload, Lock,
  ChevronRight, Check, Calendar, MapPin, ImageOff,
} from 'lucide-react'

type Tier = {
  id: string
  event_id: string
  name: string
  description: string | null
  price: number
  quantity_remaining: number
  color: string | null
  benefits: string[] | null
  max_per_order: number | null
  max_group_size: number | null
}

type PaymentMethod = {
  id: string
  method_type: string
  provider: string | null
  account_name: string
  account_number: string
  instructions: string | null
}

type EventInfo = {
  id: string
  title: string
  event_date: string
  location: string | null
  image_url: string | null
  city_id: string | null
  cities: { name: string } | null
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

const YELLOW = '#F59E0B'

function getTierIcon(name: string) { return TIER_ICON_MAP[name] || Ticket }
function getTierColor(name: string) { return TIER_COLOR_MAP[name] || '#6B7280' }

function formatPrice(cents: number) {
  return cents === 0 ? 'Free' : `${cents.toLocaleString()} ETB`
}

export default function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const searchParams = useSearchParams()
  const preselectedTierId = searchParams.get('tier')
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null)
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null)
  const [tierNotFound, setTierNotFound] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [quantity, setQuantity] = useState(1)
  const [selectedPmId, setSelectedPmId] = useState('')
  const [loading, setLoading] = useState(true)
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [referenceNumber, setReferenceNumber] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [imgFailed, setImgFailed] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: eventData } = await supabase
        .from('events')
        .select('id, title, event_date, location, image_url, city_id, cities(name)')
        .eq('id', id)
        .single()

      if (!eventData) { setLoading(false); return }
      setEventInfo(eventData as unknown as EventInfo)

      if (!preselectedTierId) {
        setTierNotFound(true)
        setLoading(false)
        return
      }

      const { data: tierData } = await supabase
        .from('purchasable_ticket_tiers')
        .select('id, event_id, name, description, price, quantity_remaining, color, benefits, max_per_order, max_group_size')
        .eq('id', preselectedTierId)
        .eq('event_id', id)
        .single()

      if (!tierData) {
        setTierNotFound(true)
        setLoading(false)
        return
      }

      setSelectedTier(tierData as unknown as Tier)

      const { data: pmData } = await supabase
        .from('event_payment_methods')
        .select('id, method_type, provider, account_name, account_number, instructions')
        .eq('event_id', id)
        .eq('is_active', true)

      const pms = (pmData ?? []) as PaymentMethod[]
      setPaymentMethods(pms)
      if (pms.length > 0) setSelectedPmId(pms[0].id)

      setLoading(false)
    }
    init()
  }, [id, preselectedTierId, router])

  const maxQty = selectedTier
    ? Math.min(selectedTier.max_per_order ?? 999, selectedTier.quantity_remaining)
    : 1

  const subtotal = selectedTier ? selectedTier.price * quantity : 0

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
    else if (e.type === 'dragleave') setDragActive(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false)
    if (e.dataTransfer.files?.[0]) setProofFile(e.dataTransfer.files[0])
  }, [])

  const isFree = selectedTier?.price === 0

  const handleSubmit = async () => {
    setError('')
    if (!selectedTier) { setError('Please select a ticket.'); return }
    if (!isFree) {
      if (!selectedPmId) { setError('Please select a payment method.'); return }
      if (!proofFile) { setError('Please upload proof of payment.'); return }
    }

    setSubmitting(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    const result = await checkoutOrder({
      userId: session.user.id,
      eventId: id,
      tierId: selectedTier.id,
      quantity,
      file: isFree ? undefined : proofFile!,
      referenceNumber,
      paymentMethodId: isFree ? undefined : selectedPmId,
    })
    if (!result.ok) {
      setError(result.error)
      setSubmitting(false)
      return
    }

    router.push('/my-tickets')
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '16px 20px 100px' }}>
        <div style={{ height: 40, width: 120, borderRadius: 8, background: '#F3F4F6', marginBottom: 20 }} />
        <div style={{ height: 120, borderRadius: 14, background: '#F3F4F6', marginBottom: 16 }} />
        <div style={{ height: 80, borderRadius: 14, background: '#F3F4F6', marginBottom: 16 }} />
        <div style={{ height: 80, borderRadius: 14, background: '#F3F4F6' }} />
      </div>
    )
  }

  if (!eventInfo) {
    return (
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '48px 20px', textAlign: 'center' }}>
        <Ticket size={40} color="#D1D5DB" style={{ marginBottom: 16 }} />
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>Event Not Found</h1>
        <p style={{ fontSize: 15, color: '#6B7280', margin: '0 0 24px' }}>This event may have been removed or is unavailable.</p>
        <Link href="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '10px 20px', borderRadius: 10, border: 'none',
          background: '#1C1917', color: '#fff', fontSize: 14, fontWeight: 600,
          textDecoration: 'none', cursor: 'pointer',
        }}>
          <ArrowLeft size={16} /> Back to Home
        </Link>
      </div>
    )
  }

  if (tierNotFound || !selectedTier) {
    return (
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '48px 20px', textAlign: 'center' }}>
        <Ticket size={40} color="#D1D5DB" style={{ marginBottom: 16 }} />
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
          {preselectedTierId ? 'Ticket Not Found' : 'Please Select a Ticket'}
        </h1>
        <p style={{ fontSize: 15, color: '#6B7280', margin: '0 0 24px' }}>
          {preselectedTierId
            ? 'The ticket you selected could not be found. It may have been removed or is no longer available.'
            : 'Please go to the event page and select a ticket to continue.'}
        </p>
        <Link href={`/events/${id}`} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '10px 20px', borderRadius: 10, border: 'none',
          background: '#1C1917', color: '#fff', fontSize: 14, fontWeight: 600,
          textDecoration: 'none', cursor: 'pointer',
        }}>
          <ArrowLeft size={16} /> Back to Event
        </Link>
      </div>
    )
  }

  const eventDate = new Date(eventInfo.event_date)
  const dateStr = eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const timeStr = eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const showEventImage = !!eventInfo.image_url && !imgFailed
  const tier = selectedTier
  const tierColor = getTierColor(tier.name)
  const TierIcon = getTierIcon(tier.name)
  const soldOut = tier.quantity_remaining <= 0

  return (
    <>
      <div className="checkout-page">
        {/* Header */}
        <div className="checkout-header">
          <button type="button" onClick={() => router.back()} aria-label="Go back" className="checkout-back-btn">
            <ArrowLeft size={18} color="#111827" />
          </button>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>Checkout</h1>
            <p style={{ fontSize: 13, color: '#6B7280', margin: '1px 0 0' }}>
              {isFree ? 'Confirm your free ticket' : 'Complete your payment to secure your ticket'}
            </p>
          </div>
        </div>

        <div className="checkout-layout">
          <div className="checkout-main">

            {/* Event Context */}
            <div className="checkout-event-card">
              {showEventImage ? (
                <img src={eventInfo.image_url!} alt={eventInfo.title} onError={() => setImgFailed(true)}
                  className="checkout-event-img" />
              ) : (
                <div className="checkout-event-img-placeholder">
                  <ImageOff size={24} color="rgba(255,255,255,0.5)" />
                </div>
              )}
              <div className="checkout-event-info">
                <p className="checkout-event-title">{eventInfo.title}</p>
                <div className="checkout-event-meta">
                  <Calendar size={13} color="#6B7280" />
                  <span>{dateStr} &middot; {timeStr}</span>
                </div>
                {(eventInfo.location || eventInfo.cities) && (
                  <div className="checkout-event-meta">
                    <MapPin size={13} color="#6B7280" />
                    <span>
                      {eventInfo.location}
                      {eventInfo.location && eventInfo.cities ? `, ${eventInfo.cities.name}` : eventInfo.cities?.name || ''}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Section: Selected Ticket */}
            <div className="checkout-section">
              <h2 className="checkout-section-title">Selected Ticket</h2>
              <p className="checkout-section-sub">Review the ticket you selected.</p>

              <div className={`checkout-tier-card selected${soldOut ? ' sold-out' : ''}`}
                style={{ borderColor: YELLOW }}>
                <div className="checkout-tier-top">
                  <div className="checkout-tier-left">
                    <div className="checkout-tier-icon-badge" style={{ background: `${tierColor}14`, color: tierColor }}>
                      <TierIcon size={18} />
                    </div>
                    <div className="checkout-tier-text">
                      <div className="checkout-tier-name-row">
                        <span className="checkout-tier-name">{tier.name}</span>
                        <span className="checkout-tier-badge">Selected</span>
                      </div>
                      {tier.description && (
                        <p className="checkout-tier-desc">{tier.description}</p>
                      )}
                      <div className="checkout-tier-avail">
                        {soldOut
                          ? <span className="checkout-tier-soldout-text">Sold out</span>
                          : <span>{tier.quantity_remaining} remaining{tier.max_per_order ? ` \u00B7 Limit ${tier.max_per_order}` : ''}</span>
                        }
                      </div>
                    </div>
                  </div>
                  <div className="checkout-tier-right">
                    <span className="checkout-tier-price">{formatPrice(tier.price)}</span>
                  </div>
                </div>

                {/* Benefits */}
                {tier.benefits && tier.benefits.length > 0 && (
                  <div className="checkout-tier-benefits">
                    {tier.benefits.map((b, i) => (
                      <div key={i} className="checkout-tier-benefit">
                        <Check size={12} color="#22C55E" strokeWidth={2.5} />
                        <span>{b}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Quantity or Sold Out */}
                <div className="checkout-tier-bottom">
                  {soldOut ? (
                    <span className="checkout-tier-soldout-badge">Sold Out</span>
                  ) : (
                    <div className="checkout-qty-control">
                      <button type="button" aria-label="Decrease quantity"
                        disabled={quantity <= 1}
                        onClick={() => setQuantity(q => Math.max(1, q - 1))}
                        className="checkout-qty-btn">
                        <Minus size={16} />
                      </button>
                      <span className="checkout-qty-value">{quantity}</span>
                      <button type="button" aria-label="Increase quantity"
                        disabled={quantity >= maxQty}
                        onClick={() => setQuantity(q => Math.min(maxQty, q + 1))}
                        className="checkout-qty-btn checkout-qty-plus">
                        <Plus size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Section: Payment Method — paid tickets only */}
            {!isFree && (
              <div className="checkout-section">
                <h2 className="checkout-section-title">Payment Method</h2>
                <p className="checkout-section-sub">Select how you&apos;d like to pay.</p>

                {paymentMethods.length === 0 ? (
                  <div className="checkout-empty-pm">
                    <p>No payment methods configured for this event yet.</p>
                  </div>
                ) : (
                  <div className="checkout-pm-list">
                    {paymentMethods.map(pm => {
                      const selected = selectedPmId === pm.id
                      return (
                        <button key={pm.id} type="button" onClick={() => setSelectedPmId(pm.id)}
                          className={`checkout-pm-card${selected ? ' selected' : ''}`}>
                          <div className="checkout-pm-radio" style={selected ? { borderColor: YELLOW, background: YELLOW } : undefined}>
                            {selected && <Check size={12} color="#fff" strokeWidth={3} />}
                          </div>
                          <div className="checkout-pm-info">
                            <div className="checkout-pm-name-row">
                              <span className="checkout-pm-name">{pm.method_type.replace(/_/g, ' ')}</span>
                              {pm.provider && <span className="checkout-pm-provider">&mdash; {pm.provider}</span>}
                            </div>
                            <p className="checkout-pm-detail">{pm.account_name} &middot; {pm.account_number}</p>
                            {pm.instructions && <p className="checkout-pm-instructions">{pm.instructions}</p>}
                          </div>
                          <ChevronRight size={16} color="#D1D5DB" />
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Section: Proof of Payment — paid tickets only */}
            {!isFree && (
              <div className="checkout-section">
                <h2 className="checkout-section-title">Proof of Payment</h2>
                <p className="checkout-section-sub">Upload your payment receipt for verification.</p>

                <div
                  onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  role="button" tabIndex={0} aria-label="Upload payment proof"
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click() }}
                  className={`checkout-upload-zone${dragActive ? ' drag-active' : ''}`}>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                    onChange={(e) => setProofFile(e.target.files?.[0] ?? null)} style={{ display: 'none' }} />
                  {proofFile ? (
                    <>
                      <div className="checkout-upload-icon-success">
                        <Check size={22} color="#059669" />
                      </div>
                      <p className="checkout-upload-filename">{proofFile.name}</p>
                      <p className="checkout-upload-size">{(proofFile.size / (1024 * 1024)).toFixed(1)} MB &middot; Click to replace</p>
                    </>
                  ) : (
                    <>
                      <Upload size={28} color={dragActive ? YELLOW : '#9CA3AF'} style={{ marginBottom: 10 }} />
                      <p className="checkout-upload-title">Upload your payment receipt</p>
                      <p className="checkout-upload-sub">Drag &amp; drop or click to browse</p>
                      <p className="checkout-upload-hint">JPG, PNG, WebP or HEIC &middot; Max 5 MB</p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Section: Reference Number — paid tickets only */}
            {!isFree && (
              <div className="checkout-section">
                <label className="checkout-label">
                  <span className="checkout-label-text">
                    Reference Number <span className="checkout-label-hint">(optional)</span>
                  </span>
                  <input type="text" placeholder="e.g. bank transfer reference"
                    value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)}
                    className="checkout-input" />
                </label>
                <p className="checkout-input-hint">Helps us verify your payment faster.</p>
              </div>
            )}

            {/* Total + Submit */}
            <div className="checkout-submit-section">
              <div className="checkout-total-row">
                <span className="checkout-total-label">Total Amount</span>
                <span className="checkout-total-value">{formatPrice(subtotal)}</span>
              </div>

              {error && (
                <div className="checkout-error">{error}</div>
              )}

              <button type="button" onClick={handleSubmit}
                disabled={submitting || soldOut}
                className="checkout-submit-btn">
                <Lock size={18} />
                {submitting
                  ? 'Processing\u2026'
                  : isFree
                    ? 'Get Your Free Ticket'
                    : 'Submit Payment for Verification'}
              </button>

              <p className="checkout-submit-note">
                {isFree
                  ? 'Your ticket will be issued immediately.'
                  : 'Your payment will be reviewed and your ticket will be issued once the payment is confirmed.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
