import type { NextRequest } from 'next/server'
import { ApiFailure, requireUser, runApi } from '@/lib/api'
import {
  MAX_PROOF_IMAGE_BYTES,
  MAX_REFERENCE_LENGTH,
  sanitizeText,
  VALID_IMAGE_MIME_TYPES,
} from '@/lib/validation'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  return runApi(async () => {
    const { user, db } = await requireUser(request)

    const body = await request.json().catch(() => null)
    const orderId = body?.orderId
    const storagePath = body?.storagePath
    const referenceNumber = body?.referenceNumber
    const paymentMethodId = body?.paymentMethodId

    if (typeof orderId !== 'string' || !orderId) {
      throw new ApiFailure('Missing order id.', 400)
    }
    if (typeof storagePath !== 'string' || !storagePath) {
      throw new ApiFailure('Missing proof path.', 400)
    }
    if (typeof paymentMethodId !== 'string' || !paymentMethodId) {
      throw new ApiFailure('Missing payment method id.', 400)
    }
    if (typeof referenceNumber !== 'string') {
      throw new ApiFailure('Invalid reference number.', 400)
    }
    const reference = sanitizeText(referenceNumber)
    if (reference.length > MAX_REFERENCE_LENGTH) {
      throw new ApiFailure(
        `The reference number must be ${MAX_REFERENCE_LENGTH} characters or fewer.`,
        400
      )
    }
    if (!storagePath.startsWith(`${user.id}/${orderId}-`)) {
      throw new ApiFailure('The proof file was not uploaded to the expected location.', 400)
    }

    const { data: order } = await db
      .from('orders')
      .select('id, event_id, total_price, status')
      .eq('id', orderId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!order) {
      throw new ApiFailure('Order not found.', 404)
    }
    if (order.status !== 'pending_payment') {
      throw new ApiFailure('This order is no longer awaiting payment proof.', 400)
    }

    const { data: uploaded } = await db.storage
      .from('payment-proofs')
      .info(storagePath)
    if (!uploaded) {
      throw new ApiFailure('The payment proof could not be found in storage.', 400)
    }
    const storedMime = uploaded.contentType
    const storedSize = uploaded.size
    if (typeof storedMime !== 'string' || !VALID_IMAGE_MIME_TYPES.has(storedMime)) {
      await db.storage.from('payment-proofs').remove([storagePath])
      await db.from('orders').delete().eq('id', orderId)
      throw new ApiFailure('The uploaded proof is not a supported image type.', 400)
    }
    if (typeof storedSize !== 'number' || storedSize > MAX_PROOF_IMAGE_BYTES) {
      await db.storage.from('payment-proofs').remove([storagePath])
      await db.from('orders').delete().eq('id', orderId)
      throw new ApiFailure(
        `The proof image must be ${Math.floor(MAX_PROOF_IMAGE_BYTES / (1024 * 1024))} MB or smaller.`,
        400
      )
    }

    const { data: paymentMethod } = await db
      .from('event_payment_methods')
      .select('id')
      .eq('id', paymentMethodId)
      .eq('event_id', order.event_id)
      .eq('is_active', true)
      .maybeSingle()
    if (!paymentMethod) {
      throw new ApiFailure('That payment method is not available for this event.', 400)
    }

    let paymentId: string | null = null
    let proofId: string | null = null

    const cleanup = async () => {
      if (proofId) await db.from('payment_proofs').delete().eq('id', proofId)
      if (paymentId) await db.from('payments').delete().eq('id', paymentId)
      await db.from('orders').delete().eq('id', orderId)
    }

    const { data: payment, error: paymentError } = await db
      .from('payments')
      .insert({
        order_id: orderId,
        amount: order.total_price,
        payment_method_id: paymentMethodId,
      })
      .select('id')
      .single()

    if (paymentError) {
      await cleanup()
      throw new ApiFailure(`Recording your payment: ${paymentError.message}`, 500)
    }
    paymentId = payment.id

    const { data: proof, error: proofError } = await db
      .from('payment_proofs')
      .insert({
        payment_id: paymentId,
        image_url: storagePath,
        reference_number: reference || null,
      })
      .select('id')
      .single()

    if (proofError) {
      await cleanup()
      throw new ApiFailure(`Saving your payment proof: ${proofError.message}`, 500)
    }
    proofId = proof.id

    const { data: flipped, error: flipError } = await db
      .from('orders')
      .update({ status: 'pending_verification' })
      .eq('id', orderId)
      .select('id, status')
      .single()

    if (flipError || flipped?.status !== 'pending_verification') {
      await cleanup()
      throw new ApiFailure(
        flipError
          ? `Confirming your order: ${flipError.message}`
          : 'Confirming your order: the status change was blocked.',
        500
      )
    }

    return Response.json({ ok: true, data: { orderId: flipped.id } })
  })
}
