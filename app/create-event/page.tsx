'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { requireRole } from '@/lib/auth'
import { createEvent, type TierRow, type PaymentMethodRow } from '@/lib/services/events'
import { validateEvent } from '@/lib/validation'

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

function needsProvider(pm: PaymentMethod) {
  return pm.method_type === 'bank_transfer' || pm.method_type === 'other'
}

export default function CreateEventPage() {
  const [loading, setLoading] = useState(true)
  const [isOrganizer, setIsOrganizer] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [cityId, setCityId] = useState('')
  const [cities, setCities] = useState<{ id: string; name: string }[]>([])
  const [allInterests, setAllInterests] = useState<{ id: string; name: string }[]>([])
  const [selectedInterests, setSelectedInterests] = useState<Set<string>>(new Set())
  const [eventDate, setEventDate] = useState('')
  const [tiers, setTiers] = useState<TicketTier[]>([emptyTicketTier()])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([emptyPaymentMethod()])
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const checkAccess = async () => {
      const session = await requireRole('organizer', (href) => router.replace(href))
      if (!session) return
      setIsOrganizer(true)

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

      setLoading(false)
    }
    checkAccess()
  }, [router])

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

  const handleCreateEvent = async (e: React.FormEvent, submitStatus: 'draft' | 'pending_review') => {
    e.preventDefault()
    setError('')

    const validationErrors = validateEvent({
      title,
      location,
      eventDate,
      tiers,
      paymentMethods,
    })
    if (validationErrors.length > 0) {
      setError(validationErrors.join(' '))
      return
    }

    const session = await requireRole('organizer', (href) => router.replace(href))
    if (!session) return

    const result = await createEvent({
      organizerId: session.userId,
      title,
      description,
      location,
      cityId,
      eventDate: new Date(eventDate).toISOString(),
      status: submitStatus,
      tiers: buildTierRows(),
      paymentMethods: buildPaymentMethodRows(),
      interestIds: [...selectedInterests],
    })

    if (!result.ok) {
      setError(result.error)
      return
    }

    router.push('/account')
  }

  if (loading) return <p>Loading...</p>
  if (!isOrganizer) return <p>{error}</p>

  return (
    <div>
      <h1>Create Event</h1>
      <form onSubmit={(e) => e.preventDefault()}>
        <input type="text" placeholder="Event title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <input type="text" placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} required />
        <label style={{ display: 'block', marginBottom: 12 }}>
          City
          <select value={cityId} onChange={(e) => setCityId(e.target.value)} required style={{ display: 'block', width: '100%', marginTop: 4, padding: 8 }}>
            <option value="" disabled>Select a city</option>
            {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <div style={{ marginBottom: 20 }}>
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
        <input type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required />

        <p style={{ fontSize: 13, color: '#555', marginTop: 8, marginBottom: 8 }}>
          Note: the event date you set above ({eventDate ? new Date(eventDate).toLocaleString() : 'not set yet'}) is the latest possible sale end date for any ticket type below.
        </p>
        <h3>Ticket Info</h3>
        <p style={{ fontSize: 13, color: '#555', marginBottom: 12 }}>
          Add one or more ticket types for your event.
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
                  onClick={() => setTiers((prev) => prev.filter((_, i) => i !== index))}
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
          onClick={() => setTiers((prev) => [...prev, emptyTicketTier()])}
          style={{ marginBottom: 24, padding: '8px 16px', cursor: 'pointer' }}
        >
          Add another ticket type
        </button>

        <h3>Payment Methods</h3>
        <p style={{ fontSize: 13, color: '#555', marginBottom: 12 }}>
          Add at least one payment method so attendees know how to pay.
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
                  onClick={() => setPaymentMethods((prev) => prev.filter((_, i) => i !== index))}
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
          onClick={() => setPaymentMethods((prev) => [...prev, emptyPaymentMethod()])}
          style={{ marginBottom: 24, padding: '8px 16px', cursor: 'pointer' }}
        >
          Add another payment method
        </button>

        {error && <p style={{ color: 'red' }}>{error}</p>}
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button type="button" onClick={(e) => handleCreateEvent(e, 'draft')} style={{ padding: '10px 20px', background: '#fff', color: '#171717', border: '1px solid #171717', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
            Save as Draft
          </button>
          <button type="button" onClick={(e) => handleCreateEvent(e, 'pending_review')} style={{ padding: '10px 20px', background: '#171717', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
            Submit for Review
          </button>
        </div>
      </form>
    </div>
  )
}