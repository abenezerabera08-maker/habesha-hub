import type { NextRequest } from 'next/server'
import { ApiFailure, requireUser, runApi } from '@/lib/api'
import { generateTkCode } from '@/lib/tkcode'
import { createNotification } from '@/lib/services/notifications'

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

    // Atomic conditional update: the status filter is part of the WHERE
    // clause itself, not a separate prior read. If two requests race, only
    // one can match status = 'pending' at write time — the other gets a
    // clean 409 instead of silently overwriting the first request's result.
    const { data: paymentRes, error: paymentError } = await db
      .from('payments')
      .update({
        status: targetStatus,
        verified_at: now,
        verified_by: user.id,
      })
      .eq('id', paymentId)
      .eq('status', 'pending')
      .select('id, status')
      .single()

    if (paymentError) {
      if (paymentError.code === 'PGRST116') {
        throw new ApiFailure(
          'This payment was just processed by another request. Refresh to see the latest status.',
          409
        )
      }
      throw new ApiFailure(`Updating the payment: ${paymentError.message}`, 500)
    }
    if (paymentRes?.status !== targetStatus) {
      await rollbackPayment()
      throw new ApiFailure(`Updating the payment: the change was blocked.`, 500)
    }

    let tkCode: string | null = null
    if (decision === 'approved') {
      tkCode = await generateTkCode(db)
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

    // Notification: payment confirmed (only on approval)
    if (decision === 'approved') {
      const { data: eventData } = await db
        .from('events')
        .select('title, organizer_id')
        .eq('id', orderRow.event_id)
        .maybeSingle()

      // Get the buyer from the order
      const { data: orderFull } = await db
        .from('orders')
        .select('user_id, ticket_tier_id, quantity, total_price')
        .eq('id', orderId)
        .maybeSingle()

      if (eventData && orderFull) {
        const { data: tierData } = await db
          .from('ticket_tiers')
          .select('name')
          .eq('id', orderFull.ticket_tier_id)
          .maybeSingle()

        // Fetch buyer name from profiles
        const { data: buyerProfile } = await db
          .from('profiles')
          .select('full_name')
          .eq('id', orderFull.user_id)
          .maybeSingle()

        const eventName = eventData.title
        const buyerName = buyerProfile?.full_name ?? null
        // Attendee notification
        createNotification({
          userId: orderFull.user_id,
          type: 'payment_confirmed',
          title: 'Payment confirmed',
          message: `Your payment for ${eventName} has been confirmed.`,
          data: {
            event_id: orderRow.event_id,
            order_id: orderId,
            tier_id: orderFull.ticket_tier_id,
            event_name: eventName,
            tier_name: tierData?.name ?? null,
            quantity: orderFull.quantity,
            total_price: orderFull.total_price,
          },
        }).catch((err) => console.error('Notification failed (payment_confirmed):', err.message))

        // Organizer notification
        createNotification({
          userId: eventData.organizer_id,
          type: 'payment_received',
          title: 'Payment received',
          message: `A payment for ${eventName} has been confirmed.`,
          data: {
            event_id: orderRow.event_id,
            order_id: orderId,
            event_name: eventName,
            amount: orderFull.total_price,
            buyer_name: buyerName,
          },
        }).catch((err) => console.error('Notification failed (payment_received):', err.message))
      }
    }

    return Response.json({ ok: true, data: { orderId } })
  })
}
