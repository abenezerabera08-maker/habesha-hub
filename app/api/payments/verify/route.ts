import type { NextRequest } from 'next/server'
import { ApiFailure, requireUser, runApi } from '@/lib/api'
import { generateTkCode } from '@/lib/tkcode'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  return runApi(async () => {
    const { user, db } = await requireUser(request)

    const body = await request.json().catch(() => null)
    const paymentId = body?.paymentId
    const orderId = body?.orderId
    const decision = body?.decision
    const reason = body?.reason

    if (typeof paymentId !== 'string' || !paymentId) {
      throw new ApiFailure('Missing payment id.', 400)
    }
    if (typeof orderId !== 'string' || !orderId) {
      throw new ApiFailure('Missing order id.', 400)
    }
    if (decision !== 'approved' && decision !== 'rejected') {
      throw new ApiFailure('Invalid decision.', 400)
    }
    if (decision === 'rejected' && typeof reason !== 'string') {
      throw new ApiFailure('Invalid rejection reason.', 400)
    }

    const { data: existingPayment } = await db
      .from('payments')
      .select('status, verified_at, verified_by, order_id')
      .eq('id', paymentId)
      .maybeSingle()
    if (!existingPayment) {
      throw new ApiFailure('Payment not found.', 404)
    }
    if (existingPayment.order_id !== orderId) {
      throw new ApiFailure('Payment and order do not match.', 400)
    }
    if (existingPayment.status !== 'pending') {
      throw new ApiFailure('This payment has already been reviewed.', 400)
    }

    const { data: orderRow } = await db
      .from('orders')
      .select('event_id, status')
      .eq('id', orderId)
      .maybeSingle()
    if (!orderRow) {
      throw new ApiFailure('Order not found.', 404)
    }

    const { data: eventRow } = await db
      .from('events')
      .select('organizer_id')
      .eq('id', orderRow.event_id)
      .maybeSingle()
    if (!eventRow) {
      throw new ApiFailure('Event not found.', 404)
    }
    if (eventRow.organizer_id !== user.id) {
      const { data: profile } = await db
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      if (profile?.role !== 'admin') {
        throw new ApiFailure('Forbidden.', 403)
      }
    }

    const previous = {
      status: existingPayment.status,
      verified_at: existingPayment.verified_at,
      verified_by: existingPayment.verified_by,
    }

    const now = new Date().toISOString()
    const targetStatus = decision === 'approved' ? 'approved' : 'rejected'
    const orderTarget = decision === 'approved' ? 'confirmed' : 'pending_payment'

    let tkCode: string | null = null
    if (decision === 'approved') {
      tkCode = await generateTkCode(db)
    }

    const rollbackPayment = async () => {
      await db
        .from('payments')
        .update({
          status: previous.status,
          verified_at: previous.verified_at,
          verified_by: previous.verified_by,
        })
        .eq('id', paymentId)
    }

    const { data: paymentRes, error: paymentError } = await db
      .from('payments')
      .update({
        status: targetStatus,
        verified_at: now,
        verified_by: user.id,
      })
      .eq('id', paymentId)
      .select('id, status')
      .single()

    if (paymentError) {
      throw new ApiFailure(`Updating the payment: ${paymentError.message}`, 500)
    }
    if (paymentRes?.status !== targetStatus) {
      await rollbackPayment()
      throw new ApiFailure(`Updating the payment: the change was blocked.`, 500)
    }

    const { data: orderRes, error: orderError } = await db
      .from('orders')
      .update({ status: orderTarget, ...(tkCode ? { tk_code: tkCode } : {}) })
      .eq('id', orderId)
      .select('id, status')
      .single()

    if (orderError || orderRes?.status !== orderTarget) {
      await rollbackPayment()
      throw new ApiFailure(
        orderError ? `Updating the order: ${orderError.message}` : `Updating the order: the change was blocked.`,
        500
      )
    }

    const verificationRow: Record<string, unknown> = {
      payment_id: paymentId,
      verified_by: user.id,
      decision,
    }
    if (decision === 'rejected' && typeof reason === 'string' && reason.trim()) {
      verificationRow.notes = reason.trim()
    }

    const { error: verificationError } = await db
      .from('payment_verifications')
      .insert(verificationRow)

    if (verificationError) {
      await db.from('orders').update({ status: orderRow.status }).eq('id', orderId)
      await rollbackPayment()
      throw new ApiFailure(`Recording the verification: ${verificationError.message}`, 500)
    }

    return Response.json({ ok: true, data: { orderId } })
  })
}
