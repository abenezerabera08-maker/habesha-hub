'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type PendingPayment = {
  orderId: string
  eventTitle: string
  attendeeName: string
  tierName: string
  tierPrice: number
  quantity: number
  totalPrice: number
  submittedAt: string | null
  referenceNumber: string | null
  proofSignedUrl: string | null
  paymentId: string
}

export default function PaymentReviewPage() {
  const [loading, setLoading] = useState(true)
  const [isOrganizer, setIsOrganizer] = useState(false)
  const [error, setError] = useState('')
  const [payments, setPayments] = useState<PendingPayment[]>([])
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (profile?.role !== 'organizer') {
        setError('Only organizers can review payments.')
        setLoading(false)
        return
      }

      setIsOrganizer(true)
      await loadPendingPayments(session.user.id)
      setLoading(false)
    }
    checkAccess()
  }, [router])

  const loadPendingPayments = async (userId: string) => {
    const { data: events } = await supabase
      .from('events')
      .select('id, title')
      .eq('organizer_id', userId)

    const eventIds = (events ?? []).map(e => e.id)
    if (eventIds.length === 0) {
      setPayments([])
      return
    }

    const eventMap = new Map((events ?? []).map(e => [e.id, e.title]))

    const { data: orders } = await supabase
      .from('orders')
      .select('id, event_id, ticket_tier_id, user_id, quantity, total_price')
      .eq('status', 'pending_verification')
      .in('event_id', eventIds)

    if (!orders || orders.length === 0) {
      setPayments([])
      return
    }

    const tierIds = [...new Set(orders.map(o => o.ticket_tier_id))]
    const profileIds = [...new Set(orders.map(o => o.user_id))]

    const [tiersRes, profilesRes, paymentsRes] = await Promise.all([
      supabase.from('ticket_tiers').select('id, name, price').in('id', tierIds),
      supabase.from('profiles').select('id, full_name').in('id', profileIds),
      supabase.from('payments').select('id, order_id, amount, status, submitted_at').in('order_id', orders.map(o => o.id)),
    ])

    const tierMap = new Map((tiersRes.data ?? []).map(t => [t.id, t]))
    const profileMap = new Map((profilesRes.data ?? []).map(p => [p.id, p]))
    const paymentsByOrder = new Map((paymentsRes.data ?? []).map(p => [p.order_id, p]))

    const paymentIds = (paymentsRes.data ?? []).map(p => p.id)
    let proofsByPayment = new Map<string, { image_url: string; reference_number: string | null }>()

    if (paymentIds.length > 0) {
      const { data: proofs } = await supabase
        .from('payment_proofs')
        .select('payment_id, image_url, reference_number')
        .in('payment_id', paymentIds)

      proofsByPayment = new Map((proofs ?? []).map(p => [p.payment_id, p]))
    }

    const result: PendingPayment[] = []

    for (const order of orders) {
      const payment = paymentsByOrder.get(order.id)
      const proof = payment ? proofsByPayment.get(payment.id) : null

      let signedUrl: string | null = null
      if (proof?.image_url) {
        const { data } = await supabase.storage
          .from('payment-proofs')
          .createSignedUrl(proof.image_url, 300)
        signedUrl = data?.signedUrl ?? null
      }

      result.push({
        orderId: order.id,
        eventTitle: eventMap.get(order.event_id) ?? 'Unknown Event',
        attendeeName: profileMap.get(order.user_id)?.full_name ?? 'Unknown',
        tierName: tierMap.get(order.ticket_tier_id)?.name ?? 'Unknown',
        tierPrice: tierMap.get(order.ticket_tier_id)?.price ?? 0,
        quantity: order.quantity,
        totalPrice: order.total_price,
        submittedAt: payment?.submitted_at ?? null,
        referenceNumber: proof?.reference_number ?? null,
        proofSignedUrl: signedUrl,
        paymentId: payment?.id ?? '',
      })
    }

    setPayments(result)
  }

  const handleApprove = async (item: PendingPayment) => {
    if (!item.paymentId) return
    setProcessingId(item.orderId)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }
    const userId = session.user.id

    await supabase
      .from('payments')
      .update({
        status: 'approved',
        verified_at: new Date().toISOString(),
        verified_by: userId,
      })
      .eq('id', item.paymentId)

    await supabase
      .from('orders')
      .update({ status: 'confirmed' })
      .eq('id', item.orderId)

    await supabase
      .from('payment_verifications')
      .insert({
        payment_id: item.paymentId,
        verified_by: userId,
        decision: 'approved',
      })

    setPayments(prev => prev.filter(p => p.orderId !== item.orderId))
    setProcessingId(null)
  }

  const confirmReject = async (item: PendingPayment) => {
    if (!item.paymentId) return
    setProcessingId(item.orderId)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }
    const userId = session.user.id

    await supabase
      .from('payments')
      .update({
        status: 'rejected',
        verified_at: new Date().toISOString(),
        verified_by: userId,
      })
      .eq('id', item.paymentId)

    await supabase
      .from('orders')
      .update({ status: 'pending_payment' })
      .eq('id', item.orderId)

    const insertData: Record<string, unknown> = {
      payment_id: item.paymentId,
      verified_by: userId,
      decision: 'rejected',
    }
    if (rejectReason.trim()) {
      insertData.notes = rejectReason.trim()
    }

    await supabase
      .from('payment_verifications')
      .insert(insertData)

    setPayments(prev => prev.filter(p => p.orderId !== item.orderId))
    setProcessingId(null)
    setRejectingId(null)
    setRejectReason('')
  }

  if (loading) return <p>Loading...</p>
  if (!isOrganizer) return <p>{error}</p>

  return (
    <div style={{ maxWidth: 640, margin: '40px auto', padding: '0 16px' }}>
      <h1>Payment Verification</h1>

      {payments.length === 0 ? (
        <p style={{ marginTop: 24, color: '#555' }}>No payments waiting for review.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 24 }}>
          {payments.map((item) => (
            <div
              key={item.orderId}
              style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}
            >
              <p style={{ fontWeight: 600, fontSize: 18, margin: '0 0 8px' }}>
                {item.eventTitle}
              </p>
              <p style={{ margin: '4px 0', color: '#555' }}>
                Attendee: {item.attendeeName}
              </p>
              <p style={{ margin: '4px 0' }}>
                {item.tierName} &times; {item.quantity} ={' '}
                <strong>{item.totalPrice} ETB</strong>
              </p>
              {item.submittedAt && (
                <p style={{ margin: '4px 0', fontSize: 13, color: '#555' }}>
                  Submitted:{' '}
                  {new Date(item.submittedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </p>
              )}
              {item.referenceNumber && (
                <p style={{ margin: '4px 0', fontSize: 13, color: '#555' }}>
                  Reference: {item.referenceNumber}
                </p>
              )}
              {item.proofSignedUrl && (
                <img
                  src={item.proofSignedUrl}
                  alt="Payment proof"
                  style={{
                    maxWidth: '100%',
                    maxHeight: 300,
                    borderRadius: 8,
                    marginTop: 8,
                    border: '1px solid #ddd',
                  }}
                />
              )}

              {rejectingId === item.orderId ? (
                <div style={{ marginTop: 12 }}>
                  <input
                    type="text"
                    placeholder="Rejection reason (optional)"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: 8,
                      marginBottom: 8,
                      border: '1px solid #ddd',
                      borderRadius: 8,
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => confirmReject(item)}
                      disabled={processingId === item.orderId}
                      style={{
                        padding: '8px 16px',
                        background: '#c00',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: processingId === item.orderId ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {processingId === item.orderId ? 'Processing\u2026' : 'Confirm Reject'}
                    </button>
                    <button
                      onClick={() => { setRejectingId(null); setRejectReason('') }}
                      style={{
                        padding: '8px 16px',
                        background: 'none',
                        border: '1px solid #ddd',
                        borderRadius: 8,
                        fontSize: 14,
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button
                    onClick={() => handleApprove(item)}
                    disabled={processingId === item.orderId}
                    style={{
                      padding: '8px 24px',
                      background: '#171717',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: processingId === item.orderId ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setRejectingId(item.orderId)}
                    disabled={processingId === item.orderId}
                    style={{
                      padding: '8px 24px',
                      background: 'none',
                      border: '1px solid #ddd',
                      borderRadius: 8,
                      fontSize: 14,
                      cursor: processingId === item.orderId ? 'not-allowed' : 'pointer',
                      color: '#c00',
                    }}
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
