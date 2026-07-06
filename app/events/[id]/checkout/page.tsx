'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type TicketTier = {
  id: string
  name: string
  price: number
  quantity_available: number
  quantity_sold: number
}

export default function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [eventTitle, setEventTitle] = useState('')
  const [tiers, setTiers] = useState<TicketTier[]>([])
  const [selectedTierId, setSelectedTierId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const init = async () => {
      console.log('[checkout] route param id:', id)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      console.log('[checkout] fetching event:', id)
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id, title')
        .eq('id', id)
        .single()
      console.log('[checkout] event result:', { event, eventError })

      if (eventError || !event) {
        setError('Event not found.')
        setLoading(false)
        return
      }

      setEventTitle(event.title)

      console.log('[checkout] fetching ticket_tiers for event_id:', id)
      const { data: tiersData, error: tiersError } = await supabase
        .from('ticket_tiers')
        .select('id, name, price, quantity_available, quantity_sold')
        .eq('event_id', id)
      console.log('[checkout] tiers result:', { tiersData, tiersError })

      if (tiersError) {
        setError(tiersError.message)
        setLoading(false)
        return
      }

      const fetchedTiers = (tiersData ?? []) as TicketTier[]
      console.log('[checkout] parsed tiers:', fetchedTiers)

      setTiers(fetchedTiers)
      if (fetchedTiers.length > 0) {
        setSelectedTierId(fetchedTiers[0].id)
      }

      setLoading(false)
    }

    init()
  }, [id, router])

  const selectedTier = tiers.find((t) => t.id === selectedTierId)
  const totalPrice = selectedTier ? selectedTier.price * quantity : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!selectedTier) return

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }

    setSubmitting(true)

    const { error: insertError } = await supabase.from('orders').insert({
      user_id: session.user.id,
      event_id: id,
      ticket_tier_id: selectedTier.id,
      quantity,
      total_price: totalPrice,
      status: 'confirmed',
    })

    setSubmitting(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    router.push('/my-tickets')
  }

  if (loading) return <p>Loading...</p>
  if (error) return <p>{error}</p>

  return (
    <div style={{ maxWidth: 480, margin: '40px auto', padding: '0 16px' }}>
      <h1>Checkout</h1>
      <p style={{ marginBottom: 24, color: '#555' }}>{eventTitle || 'Untitled event'}</p>

      <form onSubmit={handleSubmit}>
        <label style={{ display: 'block', marginBottom: 16 }}>
          Ticket type
          <select
            value={selectedTierId}
            onChange={(e) => setSelectedTierId(e.target.value)}
            style={{ display: 'block', width: '100%', marginTop: 4, padding: 8 }}
            required
          >
            {tiers.length === 0 && <option value="">No tickets available</option>}
            {tiers.map((tier) => (
              <option key={tier.id} value={tier.id}>
                {tier.name} — ${tier.price.toFixed(2)}
              </option>
            ))}
          </select>
        </label>

        {tiers.length > 0 && (
          <label style={{ display: 'block', marginBottom: 16 }}>
            Quantity
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              style={{ display: 'block', width: '100%', marginTop: 4, padding: 8 }}
              required
            />
          </label>
        )}

        <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
          Total: ${totalPrice.toFixed(2)}
        </p>

        <button
          type="submit"
          disabled={submitting || tiers.length === 0}
          style={{ padding: '10px 24px', cursor: submitting ? 'not-allowed' : 'pointer' }}
        >
          {submitting ? 'Processing\u2026' : 'Confirm Purchase'}
        </button>
      </form>
    </div>
  )
}
