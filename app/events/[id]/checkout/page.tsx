'use client'

import { use, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { checkoutOrder } from '@/lib/services/payments'

type Tier = {
  id: string
  event_id: string
  name: string
  description: string | null
  price: number
  quantity_remaining: number
  color: string | null
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

export default function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const searchParams = useSearchParams()
  const tierId = searchParams.get('tier')
  const router = useRouter()

  const [tier, setTier] = useState<Tier | null>(null)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [selectedPmId, setSelectedPmId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)
  const [notAvailable, setNotAvailable] = useState(false)
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [referenceNumber, setReferenceNumber] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      if (!tierId) {
        setNotAvailable(true)
        setLoading(false)
        return
      }

      const { data: tierData, error: tierError } = await supabase
        .from('purchasable_ticket_tiers')
        .select('id, event_id, name, description, price, quantity_remaining, color, benefits, max_per_order, max_group_size')
        .eq('id', tierId)
        .eq('event_id', id)
        .maybeSingle()

      if (tierError || !tierData) {
        setNotAvailable(true)
        setLoading(false)
        return
      }

      setTier(tierData as Tier)

      const { data: pmData, error: pmError } = await supabase
        .from('event_payment_methods')
        .select('id, method_type, provider, account_name, account_number, instructions')
        .eq('event_id', id)
        .eq('is_active', true)

      if (pmError) {
        setNotAvailable(true)
        setLoading(false)
        return
      }

      setPaymentMethods((pmData ?? []) as PaymentMethod[])
      if (pmData && pmData.length > 0) {
        setSelectedPmId(pmData[0].id)
      }

      setLoading(false)
    }

    init()
  }, [id, tierId, router])

  const totalPrice = tier ? tier.price * quantity : 0
  const maxQty = tier ? Math.min(tier.max_per_order ?? 999, tier.quantity_remaining) : 999

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!tierId) {
      setError('Please select a ticket tier.')
      return
    }
    if (!selectedPmId) {
      setError('Please select a payment method.')
      return
    }
    if (!proofFile) {
      setError('Please upload proof of payment.')
      return
    }

    setSubmitting(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }
    const userId = session.user.id

    const result = await checkoutOrder({
      userId,
      eventId: id,
      tierId,
      quantity,
      file: proofFile,
      referenceNumber,
      paymentMethodId: selectedPmId,
    })

    if (!result.ok) {
      setError(result.error)
      setSubmitting(false)
      return
    }

    router.push('/my-tickets')
  }

  if (loading) return <p>Loading...</p>

  if (notAvailable || !tier) {
    return (
      <div style={{ maxWidth: 480, margin: '40px auto', padding: '0 16px' }}>
        <h1>Checkout</h1>
        <p style={{ marginTop: 16, color: '#555' }}>This ticket is no longer available.</p>
        <Link href={`/events/${id}`} style={{ display: 'inline-block', marginTop: 12, color: '#0066cc' }}>
          Back to event
        </Link>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 480, margin: '40px auto', padding: '0 16px' }}>
      <h1>Checkout</h1>

      <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 24 }}>
        <strong>{tier.name}</strong>
        {tier.description && (
          <p style={{ margin: '4px 0', color: '#555', fontSize: 14 }}>{tier.description}</p>
        )}
        <p style={{ margin: '4px 0' }}>
          {tier.price} ETB × {quantity} = <strong>{totalPrice} ETB</strong>
        </p>
        <p style={{ margin: '4px 0', fontSize: 13, color: '#555' }}>
          {tier.quantity_remaining} remaining
        </p>
        {tier.max_group_size && (
          <p style={{ margin: '4px 0', fontSize: 13, fontStyle: 'italic' }}>
            Each ticket admits up to {tier.max_group_size} people
          </p>
        )}
      </div>

      <label style={{ display: 'block', marginBottom: 16 }}>
        Quantity
        <input
          type="number"
          min={1}
          max={maxQty}
          value={quantity}
          onChange={(e) => {
            const v = Math.max(1, Math.min(maxQty, parseInt(e.target.value) || 1))
            setQuantity(v)
          }}
          style={{ display: 'block', width: '100%', marginTop: 4, padding: 8 }}
          required
        />
        {tier.max_per_order && (
          <span style={{ display: 'block', marginTop: 4, fontSize: 12, color: '#555' }}>
            Limit {tier.max_per_order} per order
          </span>
        )}
      </label>

      <h3 style={{ marginBottom: 12 }}>Payment method</h3>
      {paymentMethods.length === 0 ? (
        <p style={{ color: '#555', fontSize: 14 }}>No payment methods configured for this event yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {paymentMethods.map((pm) => (
            <label
              key={pm.id}
              style={{
                display: 'block',
                border: selectedPmId === pm.id ? '2px solid #171717' : '1px solid #ddd',
                borderRadius: 8,
                padding: 12,
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="radio"
                  name="payment_method"
                  value={pm.id}
                  checked={selectedPmId === pm.id}
                  onChange={() => setSelectedPmId(pm.id)}
                />
                <strong>{pm.method_type.replace(/_/g, ' ')}</strong>
                {pm.provider && <span style={{ color: '#555' }}>— {pm.provider}</span>}
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 14 }}>
                {pm.account_name} · {pm.account_number}
              </p>
              {pm.instructions && (
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#555' }}>{pm.instructions}</p>
              )}
            </label>
          ))}
        </div>
      )}

      <label style={{ display: 'block', marginBottom: 16 }}>
        Proof of payment (image)
        <input
          type="file"
          id="proof-image-input"
          accept="image/*"
          onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
          style={{ display: 'block', width: '100%', marginTop: 4 }}
          required
        />
      </label>

      <label style={{ display: 'block', marginBottom: 16 }}>
        Reference number (optional)
        <input
          type="text"
          id="reference-number-input"
          placeholder="e.g. bank transfer reference"
          value={referenceNumber}
          onChange={(e) => setReferenceNumber(e.target.value)}
          style={{ display: 'block', width: '100%', marginTop: 4, padding: 8 }}
        />
      </label>

      {error && <p style={{ color: 'red', marginBottom: 12 }}>{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        style={{ padding: '10px 24px', width: '100%', cursor: submitting ? 'not-allowed' : 'pointer', background: '#171717', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15 }}
      >
        {submitting ? 'Submitting\u2026' : 'Submit Payment for Verification'}
      </button>
    </div>
  )
}
