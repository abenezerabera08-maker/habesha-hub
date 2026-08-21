'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { requireRole } from '@/lib/auth'
import { useAuth } from '@/lib/AuthContext'
import { createEvent, updateEventDetails } from '@/lib/services/events'
import { imageExtensionForMime } from '@/lib/validation'
import EventEditor from '@/components/event-editor/EventEditor'
import type { SavePayload } from '@/components/event-editor/types'

export default function CreateEventPage() {
  const [loading, setLoading] = useState(true)
  const [isOrganizer, setIsOrganizer] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const router = useRouter()
  const { userId, role, loading: authLoading } = useAuth()

  useEffect(() => {
    const checkAccess = async () => {
      requireRole('organizer', role, authLoading, (href) => router.replace(href))
      if (authLoading || role !== 'organizer') return
      setIsOrganizer(true)
      setLoading(false)
    }
    checkAccess()
  }, [router, userId, role, authLoading])

  const handleSave = async (data: SavePayload) => {
    setSaving(true)
    setSaveError('')

    const result = await createEvent({
      organizerId: userId!,
      title: data.title, description: data.description, location: data.location,
      cityId: data.cityId,
      eventDate: new Date(data.eventDate).toISOString(),
      eventEndDate: data.eventEndDate ? new Date(data.eventEndDate).toISOString() : null,
      status: data.submitStatus,
      tiers: data.tiers.map(t => ({
        name: t.name.trim(), description: t.description.trim(),
        price: parseFloat(t.price), quantity_available: parseInt(t.quantity_available, 10),
        sale_start: t.sale_start ? new Date(t.sale_start).toISOString() : null,
        sale_end: t.sale_end ? new Date(t.sale_end).toISOString() : null,
        max_per_order: t.max_per_order ? parseInt(t.max_per_order, 10) : null,
        max_group_size: t.max_group_size ? parseInt(t.max_group_size, 10) : null,
        color: t.color.trim() || null,
        benefits: t.benefits.map(b => b.trim()).filter(b => b !== ''),
      })),
      paymentMethods: data.paymentMethods.map(pm => ({
        method_type: pm.method_type, provider: pm.provider.trim() || null,
        account_name: pm.account_name.trim(), account_number: pm.account_number.trim(),
        instructions: pm.instructions.trim() || null,
      })),
      interestIds: data.interests,
      googleMapsUrl: data.googleMapsUrl,
    })

    if (!result.ok) {
      setSaving(false)
      return { ok: false, error: result.error }
    }

    if (data.coverImage && result.data?.eventId) {
      const ext = imageExtensionForMime(data.coverImage.type)
      const path = `${userId}/${result.data.eventId}-cover.${ext}`
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
      await updateEventDetails(result.data.eventId, {
        title: data.title, description: data.description, location: data.location,
        cityId: data.cityId,
        eventDate: new Date(data.eventDate).toISOString(),
        eventEndDate: data.eventEndDate ? new Date(data.eventEndDate).toISOString() : null,
        interestIds: data.interests,
        imageUrl: urlData.publicUrl,
        googleMapsUrl: data.googleMapsUrl,
      })
    }

    setSaving(false)
    router.push('/account')
    return { ok: true, eventId: result.data?.eventId }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#6b7280', fontSize: 14 }}>Loading...</p>
      </div>
    )
  }
  if (!isOrganizer) return null

  return (
    <EventEditor
      mode="create"
      userId={userId!}
      role={role}
      authLoading={authLoading}
      onSave={handleSave}
      saving={saving}
      saveError={saveError}
    />
  )
}
