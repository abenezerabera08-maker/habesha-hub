'use client'

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { validateEvent, imageExtensionForMime } from '@/lib/validation'
import TicketAppearanceSelector from '@/components/ticket/TicketAppearanceSelector'
import TicketPreview from '@/components/ticket/TicketPreview'
import type { EventEditorProps, TicketTier, PaymentMethod } from './types'
import { emptyPaymentMethod, emptyTicketTier, needsProvider, toUTCISOString } from './helpers'
import { SectionCard, Field, inputBase } from './primitives'
import { ProgressSteps } from './ProgressSteps'
import { MobileHeader } from './MobileHeader'
import { EventPreviewCard, OrganizerTips, NeedHelp, ReviewSection, OrganizerGuideModal } from './sidebar'
import {
  Calendar, Hash, Image as ImageIcon, UploadCloud, Ticket, Wallet, Info,
  Plus, Trash2, ShieldCheck, ChevronDown, Pencil, Lightbulb,
  Bold, Italic, Underline, List, ListOrdered, Link as LinkIcon,
} from 'lucide-react'

export default function EventEditor({
  mode, userId, role, authLoading,
  initialData,
  eventStatus, rejectionReason, existingImageUrl,
  existingTierIds = [], existingPaymentMethodIds = [],
  onSave, onSubmitForReview, saving, submitting, saveError, saveSuccess,
}: EventEditorProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [cityId, setCityId] = useState('')
  const [googleMapsUrl, setGoogleMapsUrl] = useState('')
  const [cities, setCities] = useState<{ id: string; name: string }[]>([])
  const [allInterests, setAllInterests] = useState<{ id: string; name: string }[]>([])
  const [selectedInterests, setSelectedInterests] = useState<Set<string>>(new Set())
  const [eventDate, setEventDate] = useState('')
  const [eventEndDate, setEventEndDate] = useState('')
  const [tiers, setTiers] = useState<TicketTier[]>([emptyTicketTier()])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([emptyPaymentMethod()])
  const [coverImage, setCoverImage] = useState<File | null>(null)
  const [processingImage, setProcessingImage] = useState(false)
  const [error, setError] = useState('')
  const [guideOpen, setGuideOpen] = useState(false)
  const [tipsExpanded, setTipsExpanded] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const hydratedRef = useRef(false)

  useEffect(() => {
    if (hydratedRef.current) return
    if (mode === 'create') {
      const load = async () => {
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
      }
      load()
      hydratedRef.current = true
    } else if (initialData) {
      hydratedRef.current = true
      setTitle(initialData.title)
      setDescription(initialData.description)
      setLocation(initialData.location)
      setCityId(initialData.cityId)
      setEventDate(initialData.eventDate)
      setEventEndDate(initialData.eventEndDate)
      setGoogleMapsUrl(initialData.googleMapsUrl)
      setSelectedInterests(new Set(initialData.interests))
      setCities(initialData.cities)
      setAllInterests(initialData.allInterests)
      if (initialData.tiers.length > 0) setTiers(initialData.tiers)
      if (initialData.paymentMethods.length > 0) setPaymentMethods(initialData.paymentMethods)
    }
  }, [mode, initialData])

  const coverImageUrl = useMemo(() => {
    if (coverImage) return URL.createObjectURL(coverImage)
    if (existingImageUrl) return existingImageUrl
    return null
  }, [coverImage, existingImageUrl])

  const processImage = useCallback(async (file: File) => {
    setProcessingImage(true)
    setError('')
    try {
      let blob: Blob = file
      const isHeic = file.type === 'image/heic' || file.type === 'image/heif'
        || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')
      if (isHeic) {
        try {
          const mod = await import('heic2any') as { default: (opts: { blob: File; toType: string; quality: number }) => Promise<Blob | Blob[]> }
          const converted = await mod.default({ blob: file, toType: 'image/jpeg', quality: 0.85 })
          blob = Array.isArray(converted) ? converted[0] : converted
        } catch {
          setError('Could not process this HEIC image — try exporting it as JPG first.')
          setProcessingImage(false)
          return
        }
      }
      const { default: imageCompression } = await import('browser-image-compression')
      const compressed = await imageCompression(blob as File, {
        maxWidthOrHeight: 1600,
        maxSizeMB: 1,
        initialQuality: 0.85,
        fileType: 'image/jpeg',
        useWebWorker: true,
      })
      const finalFile = new File([compressed], 'cover.jpg', { type: 'image/jpeg' })
      setCoverImage(finalFile)
    } catch {
      setError('Failed to process image — try a different file.')
    } finally {
      setProcessingImage(false)
    }
  }, [])

  const reviewChecklist = useMemo(() => {
    const basicsComplete = Boolean(title.trim() && description.trim() && location.trim() && cityId)
    const dateComplete = Boolean(eventDate)
    const ticketsComplete = tiers.length > 0 && tiers.every(t =>
      t.name && t.price.trim() !== '' && t.quantity_available.trim() !== '' && parseInt(t.quantity_available) > 0)
    const paymentsComplete = paymentMethods.length > 0 && paymentMethods.every(m =>
      m.method_type && m.account_name.trim() && m.account_number.trim())
    const coverImageComplete = Boolean(coverImage || existingImageUrl)
    const interestsComplete = selectedInterests.size > 0

    return [
      { id: 'basics', required: true, status: basicsComplete ? 'complete' as const : 'attention' as const, title: 'Event Basics', message: 'Add your event name, location, city, and description.', href: '#section-event-basics' },
      { id: 'date', required: true, status: dateComplete ? 'complete' as const : 'attention' as const, title: 'Event Date & Time', message: 'Set the event date.', href: '#section-event-date' },
      { id: 'tickets', required: true, status: ticketsComplete ? 'complete' as const : 'attention' as const, title: 'Tickets', message: 'Every ticket needs a name, price, and quantity.', href: '#section-tickets' },
      { id: 'payments', required: true, status: paymentsComplete ? 'complete' as const : 'attention' as const, title: 'Payment Methods', message: 'Add at least one complete payment method.', href: '#section-payment-methods' },
      { id: 'cover-image', required: false, status: coverImageComplete ? 'complete' as const : 'optional' as const, title: 'Cover Image', message: 'Events with a photo get more clicks.', href: '#section-cover-image' },
      { id: 'interests', required: false, status: interestsComplete ? 'complete' as const : 'optional' as const, title: 'Interests', message: 'Add a few categories to help with discovery.', href: '#section-interests' },
    ]
  }, [title, description, location, cityId, eventDate, tiers, paymentMethods, coverImage, existingImageUrl, selectedInterests])

  const readyToSubmit = reviewChecklist.filter(i => i.required).every(i => i.status === 'complete')

  const currentStep = useMemo(() => {
    if (!title.trim() || !description.trim() || !location.trim() || !cityId) return 1
    if (tiers.length === 0 || !tiers.every(t => t.name && t.price.trim() !== '' && t.quantity_available.trim() !== '')) return 2
    if (paymentMethods.length === 0 || !paymentMethods.every(m => m.method_type && m.account_name.trim() && m.account_number.trim())) return 3
    return 4
  }, [title, description, location, cityId, tiers, paymentMethods])

  const buildTierRows = () =>
    tiers.map(t => ({
      name: t.name.trim(), description: t.description.trim(),
      price: parseFloat(t.price), quantity_available: parseInt(t.quantity_available, 10),
      sale_start: toUTCISOString(t.sale_start), sale_end: toUTCISOString(t.sale_end),
      max_per_order: t.max_per_order ? parseInt(t.max_per_order, 10) : null,
      max_group_size: t.max_group_size ? parseInt(t.max_group_size, 10) : null,
      color: t.color.trim() || null,
      benefits: t.benefits.map(b => b.trim()).filter(b => b !== ''),
    }))

  const buildPaymentMethodRows = () =>
    paymentMethods.map(pm => ({
      method_type: pm.method_type, provider: pm.provider.trim() || null,
      account_name: pm.account_name.trim(), account_number: pm.account_number.trim(),
      instructions: pm.instructions.trim() || null,
    }))

  const handleSave = async (submitStatus: 'draft' | 'pending_review') => {
    setError('')
    const validationErrors = validateEvent({ title, location, eventDate, eventEndDate, googleMapsUrl, tiers, paymentMethods })
    if (validationErrors.length > 0) { setError(validationErrors.join(' ')); return }

    const result = await onSave({
      title, description, location, cityId, eventDate, eventEndDate, googleMapsUrl,
      interests: [...selectedInterests],
      tiers, paymentMethods, coverImage, submitStatus,
    })
    if (!result.ok && result.error) setError(result.error)
  }

  const handleSubmitForReview = async () => {
    if (!onSubmitForReview) return
    setError('')
    const result = await onSubmitForReview()
    if (!result.ok && result.error) setError(result.error)
  }

  const isEditable = mode === 'create' || eventStatus === 'draft' || eventStatus === 'rejected'

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', color: '#111827' }}>
      <MobileHeader />
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 16px' }}>

        {/* Header + actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>
                {mode === 'create' ? 'Create Event' : title || 'Edit Event'}
              </h1>
              {mode === 'edit' && eventStatus && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                  background: eventStatus === 'published' ? '#ecfdf5' : eventStatus === 'rejected' ? '#fef2f2' : eventStatus === 'pending_review' ? '#fffbeb' : '#f3f4f6',
                  color: eventStatus === 'published' ? '#059669' : eventStatus === 'rejected' ? '#e11d48' : eventStatus === 'pending_review' ? '#d97706' : '#6b7280',
                }}>
                  {eventStatus === 'draft' ? 'Draft' : eventStatus === 'published' ? 'Published' : eventStatus === 'rejected' ? 'Rejected' : eventStatus === 'pending_review' ? 'Pending Review' : eventStatus}
                </span>
              )}
            </div>
            <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
              {mode === 'create' ? 'Fill in the details to publish an amazing event.' : 'Update your event details below.'}
            </p>
          </div>

          {rejectionReason && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, background: '#fef2f2',
              border: '1px solid #fecaca', color: '#991b1b', fontSize: 13,
            }}>
              <strong>Rejection reason:</strong> {rejectionReason}
            </div>
          )}

          <div className="create-event-actions" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {mode === 'create' && (
              <button type="button" onClick={() => handleSave('draft')}
                style={{
                  padding: '10px 20px', borderRadius: 8, background: '#fff', color: '#374151',
                  border: '1px solid #e5e7eb', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                }}>
                Save as Draft
              </button>
            )}
            <button type="button" onClick={() => handleSave(mode === 'create' ? 'pending_review' : (isEditable ? 'pending_review' : 'pending_review'))}
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 20px', borderRadius: 8, background: '#111827', color: '#fff',
                border: 'none', fontWeight: 600, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}>
              {saving ? 'Saving\u2026' : mode === 'create' ? 'Submit for Review' : 'Save Changes'} <span aria-hidden>›</span>
            </button>
          </div>
        </div>

        {/* Error banner */}
        {(error || saveError) && (
          <div style={{
            marginBottom: 24, padding: '12px 16px', borderRadius: 8,
            background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: 13,
          }}>
            {error || saveError}
          </div>
        )}

        {/* Success banner */}
        {saveSuccess && (
          <div style={{
            marginBottom: 24, padding: '12px 16px', borderRadius: 8,
            background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', fontSize: 13,
          }}>
            {saveSuccess}
          </div>
        )}

        {/* Progress */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '16px 20px', marginBottom: 24 }}>
          <ProgressSteps currentStep={currentStep} />
        </div>

        {/* Content grid */}
        <div className="create-event-grid">

          {/* ---- Main column ---- */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Event Basics */}
            <SectionCard id="section-event-basics" icon={Calendar} title="Event Basics" subtitle="Tell people what your event is about.">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                <Field label="Event name" required hint="Keep it short and catchy">
                  <input style={inputBase} placeholder="e.g. Afro Beats Night" value={title} onChange={e => setTitle(e.target.value)} />
                </Field>
                <Field label="Location" required hint="Add the venue or area">
                  <input style={inputBase} placeholder="e.g. Millennium Hall, Addis Ababa" value={location} onChange={e => setLocation(e.target.value)} />
                </Field>
              </div>
              <div style={{ marginTop: 16, maxWidth: 400 }}>
                <Field label="City" required hint="Choose the city where it will take place">
                  <select style={{ ...inputBase, appearance: 'none' }} value={cityId} onChange={e => setCityId(e.target.value)}>
                    <option value="">Select city</option>
                    {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
              </div>
              <div style={{ marginTop: 16 }}>
                <Field label="Google Maps Link" required hint="Paste the Google Maps URL for your venue">
                  <input style={inputBase} placeholder="https://maps.app.goo.gl/..." value={googleMapsUrl} onChange={e => setGoogleMapsUrl(e.target.value)} />
                </Field>
              </div>
              <div style={{ marginTop: 16 }}>
                <Field label="Description" required hint="Be clear and exciting! People love details.">
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff' }}>
                    <div style={{ display: 'flex', gap: 2, padding: '6px 10px', borderBottom: '1px solid #f3f4f6' }}>
                      {[Bold, Italic, Underline, List, ListOrdered, LinkIcon].map((Icon, i) => (
                        <button key={i} type="button" tabIndex={-1}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: 32, height: 32, borderRadius: 6, border: 'none',
                            background: 'transparent', color: '#6b7280', cursor: 'pointer',
                          }}
                          onMouseDown={e => e.preventDefault()}>
                          <Icon size={16} />
                        </button>
                      ))}
                    </div>
                    <textarea
                      style={{ ...inputBase, border: 'none', borderRadius: 0, minHeight: 110, resize: 'vertical', padding: '12px 14px' }}
                      placeholder="Describe your event, what people can expect, highlights, special guests, etc."
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                    />
                  </div>
                </Field>
              </div>
            </SectionCard>

            {/* Interests */}
            <SectionCard id="section-interests" icon={Hash} title="Interests" badge="optional" subtitle="Help people discover your event.">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {allInterests.map(interest => {
                  const active = selectedInterests.has(interest.id)
                  return (
                    <button key={interest.id} type="button"
                      onClick={() => setSelectedInterests(prev => {
                        const next = new Set(prev)
                        if (next.has(interest.id)) next.delete(interest.id)
                        else next.add(interest.id)
                        return next
                      })}
                      style={{
                        padding: '6px 14px', borderRadius: 99, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                        border: `1px solid ${active ? '#818cf8' : '#e5e7eb'}`,
                        background: active ? '#eef2ff' : '#fff',
                        color: active ? '#4338ca' : '#4b5563',
                      }}>
                      {interest.name}
                    </button>
                  )
                })}
              </div>
            </SectionCard>

            {/* Cover Image */}
            <SectionCard id="section-cover-image" icon={ImageIcon} title="Cover Image" badge="optional" subtitle="This will be the main image for your event.">
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const file = e.dataTransfer.files?.[0]; if (file) processImage(file) }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  border: '2px dashed #e5e7eb', borderRadius: 12, background: '#f9fafb',
                  padding: '40px 24px', textAlign: 'center', cursor: processingImage ? 'wait' : 'pointer',
                  opacity: processingImage ? 0.7 : 1,
                }}
                onClick={() => { if (!processingImage) fileInputRef.current?.click() }}
              >
                {processingImage ? (
                  <div style={{ padding: '20px 0' }}>
                    <div style={{
                      width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: '#F59E0B',
                      borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
                    }} />
                    <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Processing image...</p>
                  </div>
                ) : coverImage && coverImageUrl ? (
                  <div style={{ width: '100%', maxWidth: 400 }}>
                    <img src={coverImageUrl} alt="Cover preview" style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 8, marginBottom: 12 }} />
                    <button type="button" onClick={e => { e.stopPropagation(); setCoverImage(null) }}
                      style={{ background: 'none', border: 'none', color: '#e11d48', fontSize: 12, fontWeight: 500, cursor: 'pointer', textDecoration: 'underline' }}>
                      Remove image
                    </button>
                  </div>
                ) : existingImageUrl ? (
                  <div style={{ width: '100%', maxWidth: 400 }}>
                    <img src={existingImageUrl} alt="Current cover" style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 8, marginBottom: 12 }} />
                    <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>Current cover image. Click to replace.</p>
                  </div>
                ) : (
                  <>
                    <UploadCloud size={24} color="#9ca3af" style={{ marginBottom: 8 }} />
                    <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 12px' }}>Drag and drop an image here</p>
                    <button type="button"
                      style={{
                        padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb',
                        background: '#fff', color: '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                      }}>
                      Choose File
                    </button>
                    <p style={{ fontSize: 11, color: '#9ca3af', margin: '12px 0 0' }}>
                      Recommended: 1200×630px (JPG, PNG, WebP) • Max 5 MB
                    </p>
                  </>
                )}
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    if (file.size > 5 * 1024 * 1024) { setError('Cover image must be under 5 MB.'); return }
                    const ext = imageExtensionForMime(file.type)
                    if (!ext) { setError('Cover image must be JPG, PNG, WebP, or HEIC.'); return }
                    processImage(file)
                  }} />
              </div>
            </SectionCard>

            {/* Event Date */}
            <SectionCard id="section-event-date" icon={Calendar} title="Event Date" subtitle="When is your event?">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <Field label="Event Date" required hint="This is when your event will start">
                  <input type="datetime-local" style={inputBase} value={eventDate} onChange={e => setEventDate(e.target.value)} />
                </Field>
                <Field label="Event Ending Time" hint="Optional — leave blank if the event has no specified ending time">
                  <input type="datetime-local" style={inputBase} value={eventEndDate} onChange={e => setEventEndDate(e.target.value)} />
                </Field>
              </div>
              <div style={{
                marginTop: 16, display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '12px 16px', borderRadius: 8, background: 'rgba(238,242,255,0.7)',
              }}>
                <Info size={16} color="#4f46e5" style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 12, color: '#4338ca', margin: 0, lineHeight: 1.6 }}>
                  Make sure the date and time are correct. The event date you set ({eventDate ? new Date(eventDate).toLocaleString() : 'not set yet'}) is the latest possible sale end date for any ticket type below.
                </p>
              </div>
            </SectionCard>

            {/* Tickets */}
            {isEditable ? (
              <div id="section-tickets" style={{ scrollMarginTop: 112 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 99, background: '#111827' }} />
                  <h2 style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#111827', margin: 0 }}>Tickets</h2>
                </div>
                <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 16px' }}>Create ticket types for your event.</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {tiers.map((tier, index) => (
                    <div key={index} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>Ticket Type {index + 1}</h3>
                        {tiers.length > 1 && (
                          <button type="button" onClick={() => setTiers(prev => prev.filter((_, i) => i !== index))}
                            style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: 4 }}>
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                        <Field label="Ticket name" required hint="Choose or create a ticket type">
                          <select style={{ ...inputBase, appearance: 'none' }} value={tier.name}
                            onChange={e => {
                              const updated = [...tiers]; updated[index].name = e.target.value
                              if (e.target.value !== 'Jema (Group Ticket)') updated[index].max_group_size = ''
                              setTiers(updated)
                            }}>
                            <option value="" disabled>Select ticket type</option>
                            <option value="Early Bird">Early Bird</option>
                            <option value="VIP">VIP</option>
                            <option value="General Admission">General Admission</option>
                            <option value="Jema (Group Ticket)">Jema (Group Ticket)</option>
                            <option value="Backstage Pass">Backstage Pass</option>
                            <option value="Balcony/Standing">Balcony/Standing</option>
                          </select>
                        </Field>
                        <Field label="Price" required hint="Set the price in ETB">
                          <div style={{ display: 'flex', overflow: 'hidden', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                            <input type="number" step="0.01" min="0" placeholder="0.00" value={tier.price}
                              onChange={e => { const u = [...tiers]; u[index].price = e.target.value; setTiers(u) }}
                              style={{ ...inputBase, border: 'none', borderRadius: 0 }} />
                            <span style={{ display: 'flex', alignItems: 'center', padding: '0 12px', background: '#f9fafb', fontSize: 13, fontWeight: 500, color: '#6b7280' }}>ETB</span>
                          </div>
                        </Field>
                      </div>

                      <div style={{ marginTop: 16 }}>
                        <Field label="Description" hint="e.g. Includes front-row seating and complimentary drinks">
                          <textarea rows={2} placeholder="e.g. Includes front-row seating and complimentary drinks"
                            value={tier.description}
                            onChange={e => { const u = [...tiers]; u[index].description = e.target.value; setTiers(u) }}
                            style={{ ...inputBase, minHeight: 64, resize: 'vertical' }} />
                        </Field>
                      </div>

                      <div style={{ marginTop: 16 }}>
                        <Field label="Quantity" required hint="Number of tickets available">
                          <input type="number" min="1" placeholder="e.g. 100" value={tier.quantity_available}
                            onChange={e => { const u = [...tiers]; u[index].quantity_available = e.target.value; setTiers(u) }}
                            style={inputBase} />
                        </Field>
                      </div>

                      <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                        <Field label="Sale starts" hint="(optional)">
                          <input type="datetime-local" value={tier.sale_start}
                            onChange={e => { const u = [...tiers]; u[index].sale_start = e.target.value; setTiers(u) }}
                            style={inputBase} />
                        </Field>
                        <Field label="Sale ends" hint="(optional)">
                          <input type="datetime-local" value={tier.sale_end} max={eventDate || undefined}
                            onChange={e => { const u = [...tiers]; u[index].sale_end = e.target.value; setTiers(u) }}
                            style={inputBase} />
                        </Field>
                      </div>

                      <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                        <Field label="Max per order" hint="Maximum tickets per person (optional)">
                          <input type="number" min="1" placeholder="e.g. 4" value={tier.max_per_order}
                            onChange={e => { const u = [...tiers]; u[index].max_per_order = e.target.value; setTiers(u) }}
                            style={{ ...inputBase, maxWidth: 200 }} />
                        </Field>
                        {tier.name === 'Jema (Group Ticket)' && (
                          <Field label="Max group size" required hint="e.g. 10">
                            <input type="number" min="2" placeholder="e.g. 10" value={tier.max_group_size}
                              onChange={e => { const u = [...tiers]; u[index].max_group_size = e.target.value; setTiers(u) }}
                              style={inputBase} />
                          </Field>
                        )}
                      </div>

                      <div style={{ marginTop: 20 }}>
                        <TicketAppearanceSelector
                          tierName={tier.name} visualMode={tier.visualMode} customColor={tier.customColor}
                          backgroundImageUrl={tier.backgroundImageUrl} imageCrop={tier.imageCrop}
                          onModeChange={mode => { const u = [...tiers]; u[index].visualMode = mode; setTiers(u) }}
                          onCustomColorChange={color => { const u = [...tiers]; u[index].customColor = color; setTiers(u) }}
                          onBackgroundImageChange={url => { const u = [...tiers]; u[index].backgroundImageUrl = url; setTiers(u) }}
                          onImageCropChange={crop => { const u = [...tiers]; u[index].imageCrop = crop; setTiers(u) }}
                        />
                      </div>

                      <div style={{ marginTop: 16 }}>
                        <TicketPreview
                          tierName={tier.name} visualMode={tier.visualMode} customColor={tier.customColor}
                          backgroundImageUrl={tier.backgroundImageUrl} imageCrop={tier.imageCrop}
                          eventName={title} eventDate={eventDate} eventLocation={location}
                          quantity={tier.quantity_available ? parseInt(tier.quantity_available, 10) || undefined : undefined}
                          admissionCount={tier.name === 'Jema (Group Ticket)' ? (parseInt(tier.max_group_size, 10) || 1) : 1}
                          price={tier.price ? `ETB ${parseFloat(tier.price).toFixed(2)}` : undefined}
                        />
                      </div>

                      <div style={{ marginTop: 16 }}>
                        <span style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 500, color: '#374151' }}>Benefits (optional)</span>
                        {tier.benefits.map((benefit, bIndex) => (
                          <div key={bIndex} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                            <input type="text" placeholder="e.g. Front-row seating" value={benefit}
                              onChange={e => { const u = [...tiers]; u[index].benefits[bIndex] = e.target.value; setTiers(u) }}
                              style={{ ...inputBase, flex: 1 }} />
                            <button type="button" onClick={() => { const u = [...tiers]; u[index].benefits = u[index].benefits.filter((_, i) => i !== bIndex); setTiers(u) }}
                              style={{ background: 'none', border: 'none', color: '#e11d48', cursor: 'pointer', fontSize: 12, flexShrink: 0 }}>
                              Remove
                            </button>
                          </div>
                        ))}
                        <button type="button" onClick={() => { const u = [...tiers]; u[index].benefits = [...u[index].benefits, '']; setTiers(u) }}
                          style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: 13, fontWeight: 500, padding: 0, marginTop: 4 }}>
                          + Add benefit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button type="button" onClick={() => setTiers(prev => [...prev, emptyTicketTier()])}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, marginTop: 16,
                    background: 'none', border: 'none', color: '#4f46e5', fontWeight: 600, fontSize: 13,
                    cursor: 'pointer', padding: 0,
                  }}>
                  <Plus size={16} /> Add another ticket type
                </button>
              </div>
            ) : (
              <div id="section-tickets" style={{ scrollMarginTop: 112, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginTop: 0 }}>Tickets</h3>
                {tiers.map((t, i) => (
                  <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, marginBottom: 8 }}>
                    <strong>{t.name || 'Unnamed'}</strong> — {t.price || '0'} ETB
                  </div>
                ))}
                <p style={{ color: '#6b7280', fontSize: 13, marginTop: 12 }}>
                  Tickets can only be edited while the event is in draft or rejected.
                </p>
              </div>
            )}

            {/* Payment Methods */}
            {isEditable ? (
              <div id="section-payment-methods" style={{ scrollMarginTop: 112 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 99, background: '#111827' }} />
                  <h2 style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#111827', margin: 0 }}>Payment Methods</h2>
                </div>
                <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 16px' }}>Add payment options for attendees.</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {paymentMethods.map((pm, index) => (
                    <div key={index} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>Payment Method {index + 1}</h3>
                        {index > 0 && (
                          <button type="button" onClick={() => setPaymentMethods(prev => prev.filter((_, i) => i !== index))}
                            style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: 4 }}>
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                        <Field label="Method type" required>
                          <select style={{ ...inputBase, appearance: 'none' }} value={pm.method_type}
                            onChange={e => { const u = [...paymentMethods]; u[index].method_type = e.target.value; setPaymentMethods(u) }}>
                            <option value="telebirr">TeleBirr</option>
                            <option value="cbe_birr">CBE Birr</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="other">Other</option>
                          </select>
                        </Field>
                        <Field label="Provider / Bank name" hint={needsProvider(pm) ? undefined : '(optional)'} error={needsProvider(pm) && pm.provider.trim() === '' ? 'Required for this payment method' : undefined}>
                          <input type="text" placeholder="e.g. Dashen Bank" value={pm.provider}
                            onChange={e => { const u = [...paymentMethods]; u[index].provider = e.target.value; setPaymentMethods(u) }}
                            style={inputBase} />
                        </Field>
                        <Field label="Account name" required>
                          <input type="text" placeholder="Account holder name" value={pm.account_name}
                            onChange={e => { const u = [...paymentMethods]; u[index].account_name = e.target.value; setPaymentMethods(u) }}
                            style={inputBase} />
                        </Field>
                        <Field label="Account number" required>
                          <input type="text" placeholder="Account or phone number" value={pm.account_number}
                            onChange={e => { const u = [...paymentMethods]; u[index].account_number = e.target.value; setPaymentMethods(u) }}
                            style={inputBase} />
                        </Field>
                      </div>

                      <div style={{ marginTop: 16 }}>
                        <Field label="Instructions" hint="(optional)">
                          <input type="text" placeholder="e.g. Please include your name in the transfer reference" value={pm.instructions}
                            onChange={e => { const u = [...paymentMethods]; u[index].instructions = e.target.value; setPaymentMethods(u) }}
                            style={inputBase} />
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>

                <button type="button" onClick={() => setPaymentMethods(prev => [...prev, emptyPaymentMethod()])}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, marginTop: 16,
                    background: 'none', border: 'none', color: '#4f46e5', fontWeight: 600, fontSize: 13,
                    cursor: 'pointer', padding: 0,
                  }}>
                  <Plus size={16} /> Add another payment method
                </button>
              </div>
            ) : (
              <div id="section-payment-methods" style={{ scrollMarginTop: 112, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginTop: 0 }}>Payment Methods</h3>
                {paymentMethods.map((pm, i) => (
                  <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, marginBottom: 8 }}>
                    {pm.method_type} — {pm.account_name || 'No name'}
                  </div>
                ))}
                <p style={{ color: '#6b7280', fontSize: 13, marginTop: 12 }}>
                  Payment methods can only be edited while the event is in draft or rejected.
                </p>
              </div>
            )}

          </div>

          {/* ---- Sidebar ---- */}
          <aside className="create-event-sidebar">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <ShieldCheck size={16} color="#4f46e5" />
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>Event Preview</h3>
                  <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>This is how your event will appear to others.</p>
                </div>
              </div>
              <EventPreviewCard
                eventName={title} city={cities.find(c => c.id === cityId)?.name ?? ''}
                location={location} date={eventDate}
                interests={[...selectedInterests].map(id => allInterests.find(i => i.id === id)?.name ?? id)}
                coverImageUrl={coverImageUrl}
              />
            </div>

            <div>
              <button type="button" className="create-event-tip-toggle"
                onClick={() => setTipsExpanded(prev => !prev)}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Lightbulb size={16} color="#4f46e5" />
                  Organizer Tips
                </span>
                <ChevronDown size={18} style={{ color: '#9ca3af', transform: tipsExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
              </button>
              <div className={`create-event-tips-wrapper${tipsExpanded ? ' expanded' : ''}`}>
                <OrganizerTips />
              </div>
            </div>
            <ReviewSection checklist={reviewChecklist} readyToSubmit={readyToSubmit} />
            <NeedHelp onOpenGuide={() => setGuideOpen(true)} />
          </aside>

        </div>
      </main>

      {/* Edit mode: submit for review button at bottom */}
      {mode === 'edit' && eventStatus && (eventStatus === 'draft' || eventStatus === 'rejected') && onSubmitForReview && (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px 48px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" onClick={handleSubmitForReview} disabled={submitting}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 20px', borderRadius: 8, background: '#059669', color: '#fff',
                border: 'none', fontWeight: 600, fontSize: 14,
                cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1,
              }}>
              {submitting ? 'Submitting\u2026' : 'Submit for Review'}
            </button>
          </div>
        </div>
      )}

      <OrganizerGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
    </div>
  )
}

export type { TicketTier, PaymentMethod } from './types'
export { emptyPaymentMethod, emptyTicketTier, toUTCISOString } from './helpers'
