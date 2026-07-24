'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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
})

function toUTCISOString(localDateTimeStr: string): string | null {
  if (!localDateTimeStr) return null
  return new Date(localDateTimeStr).toISOString()
}

const statusColor: Record<string, string> = {
  draft: '#888',
  pending_review: '#a16207',
  published: '#15803d',
  rejected: '#b91c1c',
  archived: '#555',
}

export default function EditEventPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [event, setEvent] = useState<{ id: string; title: string; status: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [tiers, setTiers] = useState<TicketTier[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [tierIds, setTierIds] = useState<string[]>([])
  const [paymentMethodIds, setPaymentMethodIds] = useState<string[]>([])

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const { data, error: fetchError } = await supabase
        .from('events')
        .select('id, title, status, organizer_id, description, location, event_date')
        .eq('id', id)
        .single()

      if (fetchError || !data) {
        setError('Event not found.')
        setLoading(false)
        return
      }

      if (data.organizer_id !== session.user.id) {
        setError("You don't have permission to manage this event.")
        setLoading(false)
        return
      }

      setEvent({ id: data.id, title: data.title, status: data.status })
      setTitle(data.title)
      setDescription(data.description ?? '')
      setLocation(data.location ?? '')
      setEventDate(new Date(data.event_date).toISOString().slice(0, 16))

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

  const handleSubmitForReview = async () => {
    if (!event) return
    setSubmitting(true)

    await supabase
      .from('events')
      .update({ status: 'pending_review' })
      .eq('id', event.id)

    setEvent({ ...event, status: 'pending_review' })
    setSubmitting(false)
  }

  const handleSaveAll = async () => {
    setSaving(true)
    setSaveError('')
    setSaveSuccess(false)

    const { error: eventError } = await supabase
      .from('events')
      .update({
        title: title.trim(),
        description: description.trim() || null,
        location: location.trim(),
        event_date: new Date(eventDate).toISOString(),
      })
      .eq('id', id)

    if (eventError) {
      setSaveError(eventError.message)
      setSaving(false)
      return
    }

    setEvent(event ? { ...event, title: title.trim() } : event)

    if (event?.status === 'draft') {
      for (let i = 0; i < tiers.length; i++) {
        const t = tiers[i]
        const row = {
          name: t.name.trim(),
          description: t.description.trim() || null,
          price: parseFloat(t.price),
          quantity_available: parseInt(t.quantity_available),
          display_order: i,
          sale_start: toUTCISOString(t.sale_start),
          sale_end: toUTCISOString(t.sale_end),
          max_per_order: t.max_per_order ? parseInt(t.max_per_order) : null,
          max_group_size: t.max_group_size ? parseInt(t.max_group_size) : null,
          color: t.color || null,
          benefits: t.benefits.length > 0 ? t.benefits : null,
        }

        const existingId = tierIds[i]
        if (existingId) {
          const { error } = await supabase.from('ticket_tiers').update(row).eq('id', existingId)
          if (error) { setSaveError(error.message); setSaving(false); return }
        } else {
          const { data: inserted, error } = await supabase
            .from('ticket_tiers')
            .insert({ ...row, event_id: event!.id })
            .select('id')
            .single()
          if (error) { setSaveError(error.message); setSaving(false); return }
          if (inserted) {
            const newIds = [...tierIds]
            newIds[i] = inserted.id
            setTierIds(newIds)
          }
        }
      }

      for (let i = 0; i < paymentMethods.length; i++) {
        const pm = paymentMethods[i]
        const row = {
          method_type: pm.method_type,
          provider: pm.provider.trim() || null,
          account_name: pm.account_name.trim(),
          account_number: pm.account_number.trim(),
          instructions: pm.instructions.trim() || null,
        }

        const existingId = paymentMethodIds[i]
        if (existingId) {
          const { error } = await supabase.from('event_payment_methods').update(row).eq('id', existingId)
          if (error) { setSaveError(error.message); setSaving(false); return }
        } else {
          const { data: inserted, error } = await supabase
            .from('event_payment_methods')
            .insert({ ...row, event_id: event!.id })
            .select('id')
            .single()
          if (error) { setSaveError(error.message); setSaving(false); return }
          if (inserted) {
            const newIds = [...paymentMethodIds]
            newIds[i] = inserted.id
            setPaymentMethodIds(newIds)
          }
        }
      }
    }

    setSaveSuccess(true)
    setSaving(false)
  }

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
          Event date
          <input type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required style={{ display: 'block', width: '100%', marginTop: 4, padding: 8 }} />
        </label>
      </div>

      {event.status === 'draft' ? (
        <>
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

                <label style={{ display: 'block', marginBottom: 12 }}>
                  Color (optional)
                  <select
                    id={`tier-color-select-${index}`}
                    value={tier.color}
                    onChange={(e) => {
                      const updated = [...tiers]
                      updated[index].color = e.target.value
                      setTiers(updated)
                    }}
                    style={{ display: 'block', width: '100%', marginTop: 4, padding: 8 }}
                  >
                    <option value="">None</option>
                    <option value="gold">Gold</option>
                    <option value="silver">Silver</option>
                    <option value="bronze">Bronze</option>
                    <option value="blue">Blue</option>
                    <option value="green">Green</option>
                    <option value="purple">Purple</option>
                    <option value="red">Red</option>
                    <option value="gray">Gray</option>
                  </select>
                </label>

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
                      const letters = e.target.value.replace(/[^A-Za-z ]/g, '')
                      const updated = [...paymentMethods]
                      updated[index].account_name = letters
                      setPaymentMethods(updated)
                    }}
                    required
                    style={{ display: 'block', width: '100%', marginTop: 4, padding: 8 }}
                  />
                  {pm.account_name.trim() === '' && (
                    <span style={{ display: 'block', marginTop: 4, fontSize: 12, color: '#c00' }}>
                      Account name must contain letters only
                    </span>
                  )}
                </label>

                <label style={{ display: 'block', marginBottom: 12 }}>
                  Account number
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    id={`account-number-input-${index}`}
                    placeholder="Account or phone number"
                    value={pm.account_number}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '')
                      const updated = [...paymentMethods]
                      updated[index].account_number = digits
                      setPaymentMethods(updated)
                    }}
                    required
                    style={{ display: 'block', width: '100%', marginTop: 4, padding: 8 }}
                  />
                  {pm.account_number.trim() === '' && (
                    <span style={{ display: 'block', marginTop: 4, fontSize: 12, color: '#c00' }}>
                      Account number must contain digits only
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
        {saveSuccess && <p style={{ color: '#15803d', marginTop: 8 }}>Saved successfully.</p>}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 32, paddingTop: 16, borderTop: '1px solid #eee' }}>
        <div>
          <span style={{ color: '#888', fontSize: 13 }}>Status: </span>
          <span style={{ fontWeight: 600 }}>{event.status}</span>
        </div>
        {event.status === 'draft' ? (
          <button onClick={handleSubmitForReview} style={{ padding: '10px 20px', background: '#171717', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
            Submit for Review
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
