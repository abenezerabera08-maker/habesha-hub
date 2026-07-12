'use client'

import { use, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

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

      const { data: tierData } = await supabase
        .from('purchasable_ticket_tiers')
        .select('*')
        .eq('id', tierId)
        .eq('event_id', id)
        .single()

      if (!tierData) {
        setNotAvailable(true)
        setLoading(false)
        return
      }

      setTier(tierData as Tier)

      const { data: pmData } = await supabase
        .from('event_payment_methods')
        .select('*')
        .eq('event_id', id)
        .eq('is_active', true)

      setPaymentMethods((pmData ?? []) as PaymentMethod[])
      if (pmData && pmData.length > 0) {
        setSelectedPmId(pmData[0].id)
      }

      setLoading(false)
    }

    init()
  }, [id, tierId, router])

  const totalPrice = tier ? tier.price * quantity : 0
  const maxQty = tier?.max_per_order ?? 999

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
    </div>
  )
}
