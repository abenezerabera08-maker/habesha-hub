'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { requireRole } from '@/lib/auth'
import {
  updateEventDetails,
  submitEventForReview,
  replaceTiers,
  replacePaymentMethods,
  type TierRow,
  type PaymentMethodRow,
} from '@/lib/services/events'
import { validateEvent, imageExtensionForMime } from '@/lib/validation'
import TicketAppearanceSelector from '@/components/ticket/TicketAppearanceSelector'
import TicketPreview from '@/components/ticket/TicketPreview'
import type { VisualMode, ImageCropState } from '@/components/ticket/TicketTypeVisualMap'
import { DEFAULT_IMAGE_CROP } from '@/components/ticket/TicketTypeVisualMap'

type PaymentMethod = {
  method_type: string
  provider: string
  account_name: string
  account_number: string
  instructions: string
}

const emptyPaymentMethod = (): PaymentMethod => ({
  method_type: 'telebirr',
  provider: '',
  account_name: '',
  account_number: '',
  instructions: '',
})

type TicketTier = {
  name: string
  description: string
  price: string
  quantity_available: string
  sale_start: string
  sale_end: string
  max_per_order: string
  max_group_size: string
  color: string
  benefits: string[]
  visualMode: VisualMode
  customColor: string
  backgroundImageUrl: string
  imageCrop: ImageCropState
}

const emptyTicketTier = (): TicketTier => ({
  name: '',
  description: '',
  price: '',
  quantity_available: '',
  sale_start: new Date().toISOString().slice(0, 16),
  sale_end: '',
  max_per_order: '',
  max_group_size: '',
  color: '',
  benefits: [],
  visualMode: 'automatic',
  customColor: '',
  backgroundImageUrl: '',
  imageCrop: DEFAULT_IMAGE_CROP,
})

function toUTCISOString(localDateTimeStr: string): string | null {
  if (!localDateTimeStr) return null
  return new Date(localDateTimeStr).toISOString()
}

export default function EditEventPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [event, setEvent] = useState<{ id: string; title: string; status: string; rejection_reason: string | null; image_url: string | null } | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [cityId, setCityId] = useState('')
  const [cities, setCities] = useState<{ id: string; name: string }[]>([])
  const [allInterests, setAllInterests] = useState<{ id: string; name: string }[]>([])
  const [selectedInterests, setSelectedInterests] = useState<Set<string>>(new Set())
  const [eventDate, setEventDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [tiers, setTiers] = useState<TicketTier[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [tierIds, setTierIds] = useState<string[]>([])
  const [paymentMethodIds, setPaymentMethodIds] = useState<string[]>([])
  const [coverImage, setCoverImage] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const session = await requireRole('organizer', (href) => router.replace(href))
      if (!session) return

      const { data, error: fetchError } = await supabase
        .from('events')
        .select('id, title, status, organizer_id, description, location, event_date, city_id, rejection_reason, image_url')
        .eq('id', id)
        .single()

      if (fetchError || !data) {
        setError('Event not found.')
        setLoading(false)
        return
      }

      if (data.organizer_id !== session.userId) {
        setError("You don't have permission to manage this event.")
        setLoading(false)
        return
      }

      setEvent({ id: data.id, title: data.title, status: data.status, rejection_reason: data.rejection_reason, image_url: data.image_url })
      setImageUrl(data.image_url)
      setTitle(data.title)
      setDescription(data.description ?? '')
      setLocation(data.location ?? '')
      setCityId(data.city_id ?? '')
      setEventDate(new Date(data.event_date).toISOString().slice(0, 16))

      const { data: citiesData } = await supabase
        .from('cities')
        .select('id, name')
        .eq('is_active', true)
        .order('name', { ascending: true })
      setCities((citiesData ?? []) as { id: string; name: string }[])

      const { data: interestsData } = await supabase
        .from('interests')
        .select('id, name')
        .order('name', { ascending: true })
      setAllInterests((interestsData ?? []) as { id: string; name: string }[])

      const { data: eventInterestRows } = await supabase
        .from('event_interests')
        .select('interest_id')
        .eq('event_id', data.id)
      setSelectedInterests(new Set((eventInterestRows ?? []).map((r) => r.interest_id)))

      const { data: tierRows } = await supabase
        .from('ticket_tiers')
        .select('id, name, description, price, quantity_available, sale_start, sale_end, max_per_order, max_group_size, color, benefits')
        .eq('event_id', data.id)
        .order('display_order')

      if (tierRows) {
        setTiers(tierRows.map((t) => ({
          name: t.name ?? '',
          description: t.description ?? '',
          price: String(t.price ?? ''),
          quantity_available: String(t.quantity_available ?? ''),
          sale_start: t.sale_start ? new Date(t.sale_start).toISOString().slice(0, 16) : '',
          sale_end: t.sale_end ? new Date(t.sale_end).toISOString().slice(0, 16) : '',
          max_per_order: t.max_per_order != null ? String(t.max_per_order) : '',
          max_group_size: t.max_group_size != null ? String(t.max_group_size) : '',
          color: t.color ?? '',
          benefits: t.benefits ?? [],
          visualMode: 'automatic' as VisualMode,
          customColor: '',
          backgroundImageUrl: '',
          imageCrop: DEFAULT_IMAGE_CROP,
        })))
        setTierIds(tierRows.map((t) => t.id))
      }

      const { data: pmRows } = await supabase
        .from('event_payment_methods')
        .select('id, method_type, provider, account_name, account_number, instructions')
        .eq('event_id', data.id)

      if (pmRows) {
        setPaymentMethods(pmRows.map((pm) => ({
          method_type: pm.method_type ?? 'telebirr',
          provider: pm.provider ?? '',
          account_name: pm.account_name ?? '',
          account_number: pm.account_number ?? '',
          instructions: pm.instructions ?? '',
        })))
        setPaymentMethodIds(pmRows.map((pm) => pm.id))
      }

      setLoading(false)
    }
    load()
  }, [id, router])

  const needsReReview = event?.status === 'published' || event?.status === 'pending_review'

  const handleSubmitForReview = async () => {
    if (!event) return
    setSubmitting(true)
    setSaveError('')

    const result = await submitEventForReview(event.id)
    if (!result.ok) {
      setSaveError(result.error)
      setSubmitting(false)
      return
    }

    setEvent({ ...event, status: 'pending_review' })
    setSubmitting(false)
  }

  const handleSaveAll = async () => {
    setSaving(true)
    setSaveError('')
    setSaveSuccess(false)

    const validationErrors = validateEvent({
      title,
      location,
      eventDate,
      tiers,
      paymentMethods,
    })
    if (validationErrors.length > 0) {
      setSaveError(validationErrors.join(' '))
      setSaving(false)
      return
    }

    const session = await requireRole('organizer', (href) => router.replace(href))
    if (!session) return

    let finalImageUrl = imageUrl
    if (coverImage) {
      const ext = imageExtensionForMime(coverImage.type)
      const path = `${session.userId}/${id}-cover.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('event-images')
        .upload(path, coverImage, { upsert: true })
      if (uploadErr) {
        setSaveError('Image upload failed: ' + uploadErr.message)
        setSaving(false)
        return
      }
      const { data: urlData } = supabase.storage
        .from('event-images')
        .getPublicUrl(path)
      finalImageUrl = urlData.publicUrl
    }

    const details = await updateEventDetails(id, {
      title,
      description,
      location,
      cityId,
      eventDate: new Date(eventDate).toISOString(),
      interestIds: [...selectedInterests],
      status: needsReReview ? 'pending_review' : undefined,
      imageUrl: finalImageUrl,
    })
    if (!details.ok) {
      setSaveError(details.error)
      setSaving(false)
      return
    }

    setEvent((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        title: title.trim(),
        ...(needsReReview ? { status: 'pending_review' } : {}),
      }
    })

    if (event?.status === 'draft' || event?.status === 'rejected') {
      const tierResult = await replaceTiers(
        event.id,
        buildTierRows(),
        tierIds
      )
      if (!tierResult.ok) {
        setSaveError(tierResult.error)
        setSaving(false)
        return
      }

      const pmResult = await replacePaymentMethods(
        event.id,
        buildPaymentMethodRows(),
        paymentMethodIds
      )
      if (!pmResult.ok) {
        setSaveError(pmResult.error)
        setSaving(false)
        return
      }
    }

    setSaveSuccess(true)
    setSaving(false)
  }

  const buildTierRows = (): TierRow[] =>
    tiers.map((t) => ({
      name: t.name.trim(),
      description: t.description.trim(),
      price: parseFloat(t.price),
      quantity_available: parseInt(t.quantity_available, 10),
      sale_start: toUTCISOString(t.sale_start),
      sale_end: toUTCISOString(t.sale_end),
      max_per_order: t.max_per_order ? parseInt(t.max_per_order, 10) : null,
      max_group_size: t.max_group_size ? parseInt(t.max_group_size, 10) : null,
      color: t.color.trim() || null,
      benefits: t.benefits.map((b) => b.trim()).filter((b) => b !== ''),
    }))

  const buildPaymentMethodRows = (): PaymentMethodRow[] =>
    paymentMethods.map((pm) => ({
      method_type: pm.method_type,
      provider: pm.provider.trim() || null,
      account_name: pm.account_name.trim(),
      account_number: pm.account_number.trim(),
      instructions: pm.instructions.trim() || null,
    }))

  if (loading) return <p>Loading...</p>
  if (error) return <p>{error}</p>
  if (!event) return null

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ marginBottom: 16 }}>{event.title}</h1>

      <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Event Details</h3>
        <label style={{ display: 'block', marginBottom: 12 }}>
          Title
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required style={{ display: 'block', width: '100%', marginTop: 4, padding: 8 }} />
        </label>
        <label style={{ display: 'block', marginBottom: 12 }}>
          Description
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ display: 'block', width: '100%', marginTop: 4, padding: 8 }} />
        </label>
        <label style={{ display: 'block', marginBottom: 12 }}>
          Location
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} required style={{ display: 'block', width: '100%', marginTop: 4, padding: 8 }} />
        </label>
        <label style={{ display: 'block', marginBottom: 12 }}>
          City
          <select value={cityId} onChange={(e) => setCityId(e.target.value)} required style={{ display: 'block', width: '100%', marginTop: 4, padding: 8 }}>
            <option value="" disabled>Select a city</option>
            {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 8 }}>Interests (optional)</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {allInterests.map((interest) => {
              const isSelected = selectedInterests.has(interest.id)
              return (
                <button
                  key={interest.id}
                  type="button"
                  onClick={() => {
                    setSelectedInterests(prev => {
                      const next = new Set(prev)
                      if (next.has(interest.id)) next.delete(interest.id)
                      else next.add(interest.id)
                      return next
                    })
                  }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 20,
                    border: '1px solid',
                    borderColor: isSelected ? '#171717' : '#ccc',
                    background: isSelected ? '#171717' : '#fff',
                    color: isSelected ? '#fff' : '#171717',
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  {interest.name}
                </button>
              )
            })}
          </div>
        </div>
        <label style={{ display: 'block', marginBottom: 12 }}>
          Event date
          <input type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required style={{ display: 'block', width: '100%', marginTop: 4, padding: 8 }} />
        </label>
      </div>

      {event.status === 'draft' || event.status === 'rejected' ? (
        <>
          <div style={{ marginTop: 24 }}>
            <h3>Cover image (optional)</h3>
            <p style={{ fontSize: 13, color: '#555', marginBottom: 8 }}>
              Recommended: 1200×630px, JPG/PNG/WebP, max 5 MB.
            </p>
            {(coverImage ? URL.createObjectURL(coverImage) : imageUrl) && (
              <img
                src={coverImage ? URL.createObjectURL(coverImage) : imageUrl!}
                alt="Cover preview"
                style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }}
              />
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  if (file.size > 5 * 1024 * 1024) {
                    setSaveError('Cover image must be under 5 MB.')
                    return
                  }
                  const ext = imageExtensionForMime(file.type)
                  if (!ext) {
                    setSaveError('Cover image must be JPG, PNG, WebP, or HEIC.')
                    return
                  }
                  setCoverImage(file)
                  setSaveError('')
                }
              }}
            />
          </div>

          <div style={{ marginTop: 24 }}>
            <h3>Ticket Info</h3>
            <p style={{ fontSize: 13, color: '#555', marginBottom: 12 }}>
              Edit your ticket types below.
            </p>
            {tiers.map((tier, index) => (
              <div
                key={index}
                style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 12 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <strong>Ticket type {index + 1}</strong>
                  {tiers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setTiers((prev) => prev.filter((_, i) => i !== index))
                        setTierIds((prev) => prev.filter((_, i) => i !== index))
                      }}
                      style={{ background: 'none', border: 'none', color: '#c00', cursor: 'pointer', fontSize: 13 }}
                    >
                      Remove this ticket type
                    </button>
                  )}
                </div>

                <label style={{ display: 'block', marginBottom: 12 }}>
                  Name
                  <select
                    id={`tier-name-input-${index}`}
                    value={tier.name}
                    onChange={(e) => {
                      const updated = [...tiers]
                      updated[index].name = e.target.value
                      if (e.target.value !== 'Jema (Group Ticket)') {
                        updated[index].max_group_size = ''
                      }
                      setTiers(updated)
                    }}
                    required
                    style={{ display: 'block', width: '100%', marginTop: 4, padding: 8 }}
                  >
                    <option value="" disabled>Select ticket type</option>
                    <option value="Early Bird">Early Bird</option>
                    <option value="VIP">VIP</option>
                    <option value="General Admission">General Admission</option>
                    <option value="Jema (Group Ticket)">Jema (Group Ticket)</option>
                    <option value="Backstage Pass">Backstage Pass</option>
                    <option value="Balcony/Standing">Balcony/Standing</option>
                  </select>
                  {tier.name === '' && (
                    <span style={{ display: 'block', marginTop: 4, fontSize: 12, color: '#c00' }}>
                      Ticket name is required
                    </span>
                  )}
                </label>

                <label style={{ display: 'block', marginBottom: 12 }}>
                  Description (optional)
                  <textarea
                    id={`tier-description-input-${index}`}
                    placeholder="e.g. Includes front-row seating and complimentary drinks"
                    value={tier.description}
                    onChange={(e) => {
                      const updated = [...tiers]
                      updated[index].description = e.target.value
                      setTiers(updated)
                    }}
                    style={{ display: 'block', width: '100%', marginTop: 4, padding: 8 }}
                  />
                </label>

                <label style={{ display: 'block', marginBottom: 12 }}>
                  Price
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    id={`tier-price-input-${index}`}
                    placeholder="0.00"
                    value={tier.price}
                    onChange={(e) => {
                      const updated = [...tiers]
                      updated[index].price = e.target.value
                      setTiers(updated)
                    }}
                    required
                    style={{ display: 'block', width: '100%', marginTop: 4, padding: 8 }}
                  />
                  {tier.price.trim() === '' && (
                    <span style={{ display: 'block', marginTop: 4, fontSize: 12, color: '#c00' }}>
                      Price is required
                    </span>
                  )}
                </label>

                <label style={{ display: 'block', marginBottom: 12 }}>
                  Quantity available
                  <input
                    type="number"
                    min="1"
                    id={`tier-quantity-input-${index}`}
                    placeholder="Number of tickets"
                    value={tier.quantity_available}
                    onChange={(e) => {
                      const updated = [...tiers]
                      updated[index].quantity_available = e.target.value
                      setTiers(updated)
                    }}
                    required
                    style={{ display: 'block', width: '100%', marginTop: 4, padding: 8 }}
                  />
                  {(tier.quantity_available.trim() === '' || parseInt(tier.quantity_available) <= 0) && (
                    <span style={{ display: 'block', marginTop: 4, fontSize: 12, color: '#c00' }}>
                      Quantity must be greater than 0
                    </span>
                  )}
                </label>

                <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                  <label style={{ display: 'block', flex: 1 }}>
                    Sale start (optional)
                    <input
                      type="datetime-local"
                      id={`tier-sale-start-input-${index}`}
                      value={tier.sale_start}
                      onChange={(e) => {
                        const updated = [...tiers]
                        updated[index].sale_start = e.target.value
                        setTiers(updated)
                      }}
                      style={{ display: 'block', width: '100%', marginTop: 4, padding: 8 }}
                    />
                  </label>
                  <label style={{ display: 'block', flex: 1 }}>
                    Sale end (optional)
                    <input
                      type="datetime-local"
                      id={`tier-sale-end-input-${index}`}
                      value={tier.sale_end}
                      onChange={(e) => {
                        const updated = [...tiers]
                        updated[index].sale_end = e.target.value
                        setTiers(updated)
                      }}
                      max={eventDate || undefined}
                      style={{ display: 'block', width: '100%', marginTop: 4, padding: 8 }}
                    />
                  </label>
                </div>

                <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                  <label style={{ display: 'block', flex: 1 }}>
                    Max per order (optional)
                    <input
                      type="number"
                      min="1"
                      id={`tier-max-per-order-input-${index}`}
                      placeholder="e.g. 4"
                      value={tier.max_per_order}
                      onChange={(e) => {
                        const updated = [...tiers]
                        updated[index].max_per_order = e.target.value
                        setTiers(updated)
                      }}
                      style={{ display: 'block', width: '100%', marginTop: 4, padding: 8 }}
                    />
                  </label>
                  {tier.name === 'Jema (Group Ticket)' && (
                    <label style={{ display: 'block', flex: 1 }}>
                      Max group size
                      <input
                        type="number"
                        min="2"
                        id={`tier-max-group-size-input-${index}`}
                        placeholder="e.g. 10"
                        value={tier.max_group_size}
                        onChange={(e) => {
                          const updated = [...tiers]
                          updated[index].max_group_size = e.target.value
                          setTiers(updated)
                        }}
                        required
                        style={{ display: 'block', width: '100%', marginTop: 4, padding: 8 }}
                      />
                      {(tier.max_group_size.trim() === '' || parseInt(tier.max_group_size) <= 1) && (
                        <span style={{ display: 'block', marginTop: 4, fontSize: 12, color: '#c00' }}>
                          Group size must be greater than 1
                        </span>
                      )}
                    </label>
                  )}
                </div>

                <TicketAppearanceSelector
                  tierName={tier.name}
                  visualMode={tier.visualMode}
                  customColor={tier.customColor}
                  backgroundImageUrl={tier.backgroundImageUrl}
                  imageCrop={tier.imageCrop}
                  onModeChange={(mode) => {
                    const updated = [...tiers]
                    updated[index].visualMode = mode
                    setTiers(updated)
                  }}
                  onCustomColorChange={(color) => {
                    const updated = [...tiers]
                    updated[index].customColor = color
                    setTiers(updated)
                  }}
                  onBackgroundImageChange={(url) => {
                    const updated = [...tiers]
                    updated[index].backgroundImageUrl = url
                    setTiers(updated)
                  }}
                  onImageCropChange={(crop) => {
                    const updated = [...tiers]
                    updated[index].imageCrop = crop
                    setTiers(updated)
                  }}
                />

                <TicketPreview
                  tierName={tier.name}
                  visualMode={tier.visualMode}
                  customColor={tier.customColor}
                  backgroundImageUrl={tier.backgroundImageUrl}
                  imageCrop={tier.imageCrop}
                  eventName={title}
                  eventDate={eventDate}
                  eventLocation={location}
                  quantity={tier.quantity_available ? parseInt(tier.quantity_available, 10) || undefined : undefined}
                  price={tier.price ? `ETB ${parseFloat(tier.price).toFixed(2)}` : undefined}
                />

                <div style={{ marginBottom: 12 }}>
                  <span style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>Benefits (optional)</span>
                  {tier.benefits.map((benefit, bIndex) => (
                    <div key={bIndex} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                      <input
                        type="text"
                        placeholder="e.g. Front-row seating"
                        value={benefit}
                        onChange={(e) => {
                          const updated = [...tiers]
                          updated[index].benefits[bIndex] = e.target.value
                          setTiers(updated)
                        }}
                        style={{ flex: 1, padding: 8 }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...tiers]
                          updated[index].benefits = updated[index].benefits.filter((_, i) => i !== bIndex)
                          setTiers(updated)
                        }}
                        style={{ background: 'none', border: 'none', color: '#c00', cursor: 'pointer', fontSize: 13 }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const updated = [...tiers]
                      updated[index].benefits = [...updated[index].benefits, '']
                      setTiers(updated)
                    }}
                    style={{ background: 'none', border: 'none', color: '#0066cc', cursor: 'pointer', fontSize: 13, marginTop: 4 }}
                  >
                    + Add benefit
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                setTiers((prev) => [...prev, emptyTicketTier()])
                setTierIds((prev) => [...prev, ''])
              }}
              style={{ marginBottom: 24, padding: '8px 16px', cursor: 'pointer' }}
            >
              Add another ticket type
            </button>

            <h3>Payment Methods</h3>
            <p style={{ fontSize: 13, color: '#555', marginBottom: 12 }}>
              Edit your payment methods below.
            </p>
            {paymentMethods.map((pm, index) => (
              <div
                key={index}
                style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 12 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <strong>Payment method {index + 1}</strong>
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethods((prev) => prev.filter((_, i) => i !== index))
                        setPaymentMethodIds((prev) => prev.filter((_, i) => i !== index))
                      }}
                      style={{ background: 'none', border: 'none', color: '#c00', cursor: 'pointer', fontSize: 13 }}
                    >
                      Remove
                    </button>
                  )}
                </div>

                <label style={{ display: 'block', marginBottom: 12 }}>
                  Method type
                  <select
                    id={`method-type-select-${index}`}
                    value={pm.method_type}
                    onChange={(e) => {
                      const updated = [...paymentMethods]
                      updated[index].method_type = e.target.value
                      setPaymentMethods(updated)
                    }}
                    style={{ display: 'block', width: '100%', marginTop: 4, padding: 8 }}
                  >
                    <option value="telebirr">TeleBirr</option>
                    <option value="cbe_birr">CBE Birr</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="other">Other</option>
                  </select>
                </label>

                <label style={{ display: 'block', marginBottom: 12 }}>
                  Provider / Bank name{needsProvider(pm) ? '' : ' (optional)'}
                  <input
                    type="text"
                    id={`provider-input-${index}`}
                    placeholder="e.g. Dashen Bank"
                    value={pm.provider}
                    onChange={(e) => {
                      const updated = [...paymentMethods]
                      updated[index].provider = e.target.value
                      setPaymentMethods(updated)
                    }}
                    style={{ display: 'block', width: '100%', marginTop: 4, padding: 8 }}
                  />
                  {needsProvider(pm) && pm.provider.trim() === '' && (
                    <span style={{ display: 'block', marginTop: 4, fontSize: 12, color: '#c00' }}>
                      Bank/provider name is required for this payment method
                    </span>
                  )}
                </label>

                <label style={{ display: 'block', marginBottom: 12 }}>
                  Account name
                  <input
                    type="text"
                    id={`account-name-input-${index}`}
                    placeholder="Account holder name"
                    value={pm.account_name}
                    onChange={(e) => {
                      const updated = [...paymentMethods]
                      updated[index].account_name = e.target.value
                      setPaymentMethods(updated)
                    }}
                    required
                    style={{ display: 'block', width: '100%', marginTop: 4, padding: 8 }}
                  />
                  {pm.account_name.trim() === '' && (
                    <span style={{ display: 'block', marginTop: 4, fontSize: 12, color: '#c00' }}>
                      Account name is required
                    </span>
                  )}
                </label>

                <label style={{ display: 'block', marginBottom: 12 }}>
                  Account number
                <input
                  type="text"
                  id={`account-number-input-${index}`}
                  placeholder="Account or phone number"
                    value={pm.account_number}
                    onChange={(e) => {
                      const updated = [...paymentMethods]
                      updated[index].account_number = e.target.value
                      setPaymentMethods(updated)
                    }}
                    required
                    style={{ display: 'block', width: '100%', marginTop: 4, padding: 8 }}
                  />
                  {pm.account_number.trim() === '' && (
                    <span style={{ display: 'block', marginTop: 4, fontSize: 12, color: '#c00' }}>
                      Account or phone number is required
                    </span>
                  )}
                </label>

                <label style={{ display: 'block', marginBottom: 12 }}>
                  Instructions (optional)
                  <textarea
                    id={`instructions-input-${index}`}
                    placeholder="e.g. Please include your name in the transfer reference"
                    value={pm.instructions}
                    onChange={(e) => {
                      const updated = [...paymentMethods]
                      updated[index].instructions = e.target.value
                      setPaymentMethods(updated)
                    }}
                    style={{ display: 'block', width: '100%', marginTop: 4, padding: 8 }}
                  />
                </label>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                setPaymentMethods((prev) => [...prev, emptyPaymentMethod()])
                setPaymentMethodIds((prev) => [...prev, ''])
              }}
              style={{ marginBottom: 24, padding: '8px 16px', cursor: 'pointer' }}
            >
              Add another payment method
            </button>
          </div>
        </>
      ) : (
        <div style={{ marginTop: 24 }}>
          {tiers.length > 0 && (
            <>
              <h3>Tickets</h3>
              {tiers.map((t, i) => (
                <div key={i} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, marginBottom: 8 }}>
                  <strong>{t.name || 'Unnamed'}</strong> — {t.price || '0'} ETB
                </div>
              ))}
            </>
          )}
          {paymentMethods.length > 0 && (
            <>
              <h3>Payment Methods</h3>
              {paymentMethods.map((pm, i) => (
                <div key={i} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, marginBottom: 8 }}>
                  {pm.method_type} — {pm.account_name || 'No name'}
                </div>
              ))}
            </>
          )}
          <p style={{ color: '#888', fontSize: 13, marginTop: 12 }}>
            Tickets and payment methods can only be edited while the event is in draft.
          </p>
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <button
          type="button"
          onClick={handleSaveAll}
          disabled={saving}
          style={{ padding: '10px 24px', background: '#171717', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}
        >
          {saving ? 'Saving\u2026' : 'Save Changes'}
        </button>
        {saveError && <p style={{ color: '#c00', marginTop: 8 }}>{saveError}</p>}
        {saveSuccess && (
          <p style={{ color: '#15803d', marginTop: 8 }}>
            {needsReReview
              ? 'Saved — this event has been resubmitted for review since it was previously live.'
              : 'Saved successfully.'}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 32, paddingTop: 16, borderTop: '1px solid #eee' }}>
        <div>
          {event.status === 'rejected' && event.rejection_reason && (
            <p style={{ color: '#7f1d1d', fontSize: 13, marginBottom: 8 }}>
              Rejected: {event.rejection_reason}
            </p>
          )}
          <span style={{ color: '#888', fontSize: 13 }}>Status: </span>
          <span style={{ fontWeight: 600 }}>{event.status}</span>
        </div>
      {event.status === 'draft' || event.status === 'rejected' ? (
          <button onClick={handleSubmitForReview} disabled={submitting} style={{ padding: '10px 20px', background: '#171717', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer' }}>
            {submitting ? 'Submitting\u2026' : 'Submit for Review'}
          </button>
        ) : (
          <span style={{ color: '#888', fontSize: 13 }}>This event is currently {event.status} and does not need to be submitted.</span>
        )}
      </div>
    </div>
  )
}

function needsProvider(pm: PaymentMethod) {
  return pm.method_type === 'bank_transfer' || pm.method_type === 'other'
}
