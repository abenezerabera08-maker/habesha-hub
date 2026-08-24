'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { requireRole } from '@/lib/auth'
import { useAuth } from '@/lib/AuthContext'
import {
  updateEventDetails,
  submitEventForReview,
  replaceTiers,
  replacePaymentMethods,
} from '@/lib/services/events'
import { imageExtensionForMime } from '@/lib/validation'
import { apiPost } from '@/lib/apiClient'
import EventEditor from '@/components/event-editor/EventEditor'
import type { SavePayload, EventInitialData, TicketTier, PaymentMethod } from '@/components/event-editor/types'

export default function EditEventPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { userId, role, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [event, setEvent] = useState<{
    id: string; title: string; status: string; rejection_reason: string | null; image_url: string | null
  } | null>(null)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)
  const [initialData, setInitialData] = useState<EventInitialData | null>(null)
  const [tierIds, setTierIds] = useState<string[]>([])
  const [paymentMethodIds, setPaymentMethodIds] = useState<string[]>([])

  useEffect(() => {
    const load = async () => {
      requireRole('organizer', role, authLoading, (href) => router.replace(href))
      if (authLoading || role !== 'organizer') return

      const { data, error: fetchError } = await supabase
        .from('events')
        .select('id, title, status, organizer_id, description, location, event_date, end_at, city_id, rejection_reason, image_url, google_maps_url')
        .eq('id', id)
        .single()

      if (fetchError || !data) { setError('Event not found.'); setLoading(false); return }
      if (data.organizer_id !== userId) { setError("You don't have permission to manage this event."); setLoading(false); return }

      setEvent({ id: data.id, title: data.title, status: data.status, rejection_reason: data.rejection_reason, image_url: data.image_url })

      const [citiesResult, interestsResult, eventInterestsResult, tiersResult, pmResult] = await Promise.all([
        supabase.from('cities').select('id, name').eq('is_active', true).order('name', { ascending: true }),
        supabase.from('interests').select('id, name').order('name', { ascending: true }),
        supabase.from('event_interests').select('interest_id').eq('event_id', data.id),
        supabase.from('ticket_tiers')
          .select('id, name, description, price, quantity_available, sale_start, sale_end, max_per_order, max_group_size, color, benefits')
          .eq('event_id', data.id)
          .order('display_order'),
        supabase.from('event_payment_methods')
          .select('id, method_type, provider, account_name, account_number, instructions')
          .eq('event_id', data.id),
      ])

      const tiers: TicketTier[] = (tiersResult.data ?? []).map(t => ({
        name: t.name ?? '', description: t.description ?? '', price: String(t.price ?? ''),
        quantity_available: String(t.quantity_available ?? ''),
        sale_start: t.sale_start ? new Date(t.sale_start).toISOString().slice(0, 16) : '',
        sale_end: t.sale_end ? new Date(t.sale_end).toISOString().slice(0, 16) : '',
        max_per_order: t.max_per_order != null ? String(t.max_per_order) : '',
        max_group_size: t.max_group_size != null ? String(t.max_group_size) : '',
        color: t.color ?? '', benefits: t.benefits ?? [],
        visualMode: 'automatic' as const, customColor: '', backgroundImageUrl: '',
        imageCrop: { positionX: 50, positionY: 50, zoom: 1 },
      }))
      setTierIds((tiersResult.data ?? []).map(t => t.id))

      const pms: PaymentMethod[] = (pmResult.data ?? []).map(pm => ({
        method_type: pm.method_type ?? 'telebirr', provider: pm.provider ?? '',
        account_name: pm.account_name ?? '', account_number: pm.account_number ?? '',
        instructions: pm.instructions ?? '',
      }))
      setPaymentMethodIds((pmResult.data ?? []).map(pm => pm.id))

      setInitialData({
        title: data.title,
        description: data.description ?? '',
        location: data.location ?? '',
        cityId: data.city_id ?? '',
        eventDate: data.event_date ? new Date(data.event_date).toISOString().slice(0, 16) : '',
        eventEndDate: data.end_at ? new Date(data.end_at).toISOString().slice(0, 16) : '',
        googleMapsUrl: data.google_maps_url ?? '',
        interests: (eventInterestsResult.data ?? []).map(r => r.interest_id),
        cities: (citiesResult.data ?? []) as { id: string; name: string }[],
        allInterests: (interestsResult.data ?? []) as { id: string; name: string }[],
        tiers,
        paymentMethods: pms,
      })

      setLoading(false)
    }
    load()
  }, [id, router, userId, role, authLoading])

  const handleSave = async (data: SavePayload) => {
    if (!event) return { ok: false, error: 'No event loaded' }
    setSaving(true)
    setSaveError('')
    setSaveSuccess(null)

    let finalImageUrl = event.image_url
    if (data.coverImage) {
      const ext = imageExtensionForMime(data.coverImage.type)
      const path = `${userId}/${event.id}-cover.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('event-images')
        .upload(path, data.coverImage, { upsert: true, contentType: 'image/jpeg' })
      if (uploadErr) {
        setSaving(false)
        return { ok: false, error: 'Image upload failed: ' + uploadErr.message }
      }
      const { data: urlData } = supabase.storage
        .from('event-images')
        .getPublicUrl(path)
      finalImageUrl = urlData.publicUrl
    }

    const needsReReview = event.status === 'published' || event.status === 'pending_review'

    // Capture previous date before update (for notification comparison)
    const previousEventData = needsReReview
      ? await supabase
          .from('events')
          .select('event_date, end_at')
          .eq('id', event.id)
          .maybeSingle()
      : null
    const previousDate = previousEventData?.data?.event_date as string | undefined
    const previousEndDate = previousEventData?.data?.end_at as string | undefined

    const details = await updateEventDetails(event.id, {
      title: data.title, description: data.description, location: data.location,
      cityId: data.cityId,
      eventDate: new Date(data.eventDate).toISOString(),
      eventEndDate: data.eventEndDate ? new Date(data.eventEndDate).toISOString() : null,
      interestIds: data.interests,
      status: needsReReview ? 'pending_review' : undefined,
      imageUrl: finalImageUrl,
      googleMapsUrl: data.googleMapsUrl,
    })
    if (!details.ok) {
      setSaving(false)
      return { ok: false, error: details.error }
    }

    if (event.status === 'draft' || event.status === 'rejected') {
      const tierResult = await replaceTiers(event.id, data.tiers.map(t => ({
        name: t.name.trim(), description: t.description.trim(),
        price: parseFloat(t.price), quantity_available: parseInt(t.quantity_available, 10),
        sale_start: t.sale_start ? new Date(t.sale_start).toISOString() : null,
        sale_end: t.sale_end ? new Date(t.sale_end).toISOString() : null,
        max_per_order: t.max_per_order ? parseInt(t.max_per_order, 10) : null,
        max_group_size: t.max_group_size ? parseInt(t.max_group_size, 10) : null,
        color: t.color.trim() || null,
        benefits: t.benefits.map(b => b.trim()).filter(b => b !== ''),
      })), tierIds)
      if (!tierResult.ok) { setSaving(false); return { ok: false, error: tierResult.error } }

      const pmResult = await replacePaymentMethods(event.id, data.paymentMethods.map(pm => ({
        method_type: pm.method_type, provider: pm.provider.trim() || null,
        account_name: pm.account_name.trim(), account_number: pm.account_number.trim(),
        instructions: pm.instructions.trim() || null,
      })), paymentMethodIds)
      if (!pmResult.ok) { setSaving(false); return { ok: false, error: pmResult.error } }
    }

    setEvent(prev => prev ? {
      ...prev,
      title: data.title.trim(),
      status: needsReReview ? 'pending_review' : prev.status,
    } : prev)

    setSaveSuccess(needsReReview
      ? 'Saved — this event has been resubmitted for review since it was previously live.'
      : 'Saved successfully.')
    setSaving(false)

    // Send update/reschedule notifications (fire-and-forget — don't block the save)
    if (needsReReview) {
      apiPost('/api/events/notify-update', {
        eventId: event.id,
        previousDate,
        previousEndDate,
      }).catch((err) => console.error('Event update notifications failed:', err))
    }

    return { ok: true }
  }

  const handleSubmitForReview = async () => {
    if (!event) return { ok: false, error: 'No event' }
    setSubmitting(true)
    setSaveError('')
    setSaveSuccess(null)

    const result = await submitEventForReview(event.id)
    if (!result.ok) {
      setSaveError(result.error)
      setSubmitting(false)
      return { ok: false, error: result.error }
    }
    setEvent({ ...event, status: 'pending_review' })
    setSubmitting(false)
    return { ok: true }
  }

  if (loading) return <p>Loading...</p>
  if (error) return <p>{error}</p>
  if (!event || !initialData) return null

  return (
    <EventEditor
      mode="edit"
      userId={userId!}
      role={role}
      authLoading={authLoading}
      initialData={initialData}
      eventStatus={event.status}
      rejectionReason={event.rejection_reason}
      existingImageUrl={event.image_url}
      existingTierIds={tierIds}
      existingPaymentMethodIds={paymentMethodIds}
      onSave={handleSave}
      onSubmitForReview={(event.status === 'draft' || event.status === 'rejected') ? handleSubmitForReview : undefined}
      saving={saving}
      submitting={submitting}
      saveError={saveError}
      saveSuccess={saveSuccess}
    />
  )
}
