import { supabase } from '@/lib/supabase'
import { expectRow, fail, type DbResult } from '@/lib/db'

export type CheckoutInput = {
  userId: string
  eventId: string
  tierId: string
  quantity: number
  file: File
  referenceNumber: string
}

export async function checkoutOrder(
  input: CheckoutInput
): Promise<DbResult<{ orderId: string }>> {
  let orderId: string | null = null
  let storagePath: string | null = null
  let paymentId: string | null = null
  let proofId: string | null = null

  const cleanup = async () => {
    if (proofId) await supabase.from('payment_proofs').delete().eq('id', proofId)
    if (paymentId) await supabase.from('payments').delete().eq('id', paymentId)
    if (orderId) await supabase.from('orders').delete().eq('id', orderId)
    if (storagePath) await supabase.storage.from('payment-proofs').remove([storagePath])
  }

  const tierLookup = await supabase
    .from('ticket_tiers')
    .select('price')
    .eq('id', input.tierId)
    .maybeSingle()

  if (tierLookup.error || !tierLookup.data) {
    return fail('Creating your order: could not find the selected ticket type.')
  }

  const totalPrice = tierLookup.data.price * input.quantity

  const order = await expectRow(
    await supabase
      .from('orders')
      .insert({
        user_id: input.userId,
        event_id: input.eventId,
        ticket_tier_id: input.tierId,
        quantity: input.quantity,
        total_price: totalPrice,
        status: 'pending_payment',
      })
      .select('id')
      .single(),
    'Creating your order'
  )
  if (!order.ok) return order
  orderId = order.data.id

  storagePath = `${input.userId}/${orderId}-${input.file.name}`
  const { error: uploadError } = await supabase.storage
    .from('payment-proofs')
    .upload(storagePath, input.file, { contentType: input.file.type })
  if (uploadError) {
    await cleanup()
    return fail(`Uploading payment proof: ${uploadError.message}`)
  }

  const payment = await expectRow(
    await supabase
        .from('payments')
        .insert({ order_id: orderId, amount: totalPrice })
        .select('id')
        .single(),
    'Recording your payment'
  )
  if (!payment.ok) {
    await cleanup()
    return payment
  }
  paymentId = payment.data.id

  const proof = await expectRow(
    await supabase
      .from('payment_proofs')
      .insert({
        payment_id: paymentId,
        image_url: storagePath,
        reference_number: input.referenceNumber.trim() || null,
      })
      .select('id')
      .single(),
    'Saving your payment proof'
  )
  if (!proof.ok) {
    await cleanup()
    return proof
  }
  proofId = proof.data.id

  const flip = await expectRow(
    await supabase
      .from('orders')
      .update({ status: 'pending_verification' })
      .eq('id', orderId)
      .select('id, status')
      .single(),
    'Confirming your order'
  )
  if (!flip.ok) {
    await cleanup()
    return flip
  }
  if (flip.data.status !== 'pending_verification') {
    await cleanup()
    return fail('Confirming your order: the status change was blocked.')
  }
  if (!orderId) {
    await cleanup()
    return fail('Creating your order: the order could not be found after checkout.')
  }

  return { ok: true, data: { orderId } }
}

export async function approvePayment(input: {
  organizerId: string
  paymentId: string
  orderId: string
}): Promise<DbResult<{ orderId: string }>> {
  const { data: existingPayment } = await supabase
    .from('payments')
    .select('status, verified_at, verified_by')
    .eq('id', input.paymentId)
    .maybeSingle()
  const previous = {
    status: existingPayment?.status ?? null,
    verified_at: existingPayment?.verified_at ?? null,
    verified_by: existingPayment?.verified_by ?? null,
  }

  const payment = await expectRow(
    await supabase
      .from('payments')
      .update({
        status: 'approved',
        verified_at: new Date().toISOString(),
        verified_by: input.organizerId,
      })
      .eq('id', input.paymentId)
      .select('id, status')
      .single(),
    'Approving the payment'
  )
  if (!payment.ok) return payment
  if (payment.data.status !== 'approved') {
    return fail('Approving the payment: the change was blocked.')
  }

  const order = await expectRow(
    await supabase
      .from('orders')
      .update({ status: 'confirmed' })
      .eq('id', input.orderId)
      .select('id, status')
      .single(),
    'Confirming the order'
  )
  if (!order.ok) {
    await supabase
      .from('payments')
      .update({
        status: previous.status,
        verified_at: previous.verified_at,
        verified_by: previous.verified_by,
      })
      .eq('id', input.paymentId)
    return order
  }
  if (order.data.status !== 'confirmed') {
    await supabase
      .from('payments')
      .update({
        status: previous.status,
        verified_at: previous.verified_at,
        verified_by: previous.verified_by,
      })
      .eq('id', input.paymentId)
    return fail('Confirming the order: the status change was blocked.')
  }

  const { error: verificationError } = await supabase
    .from('payment_verifications')
    .insert({
      payment_id: input.paymentId,
      verified_by: input.organizerId,
      decision: 'approved',
    })
  if (verificationError) {
    await supabase.from('orders').update({ status: 'pending_verification' }).eq('id', input.orderId)
    await supabase
      .from('payments')
      .update({
        status: previous.status,
        verified_at: previous.verified_at,
        verified_by: previous.verified_by,
      })
      .eq('id', input.paymentId)
    return fail(`Recording the verification: ${verificationError.message}`)
  }

  return { ok: true, data: { orderId: input.orderId } }
}

export async function rejectPayment(input: {
  organizerId: string
  paymentId: string
  orderId: string
  reason: string
}): Promise<DbResult<{ orderId: string }>> {
  const { data: existingPayment } = await supabase
    .from('payments')
    .select('status, verified_at, verified_by')
    .eq('id', input.paymentId)
    .maybeSingle()
  const previous = {
    status: existingPayment?.status ?? null,
    verified_at: existingPayment?.verified_at ?? null,
    verified_by: existingPayment?.verified_by ?? null,
  }

  const payment = await expectRow(
    await supabase
      .from('payments')
      .update({
        status: 'rejected',
        verified_at: new Date().toISOString(),
        verified_by: input.organizerId,
      })
      .eq('id', input.paymentId)
      .select('id, status')
      .single(),
    'Rejecting the payment'
  )
  if (!payment.ok) return payment
  if (payment.data.status !== 'rejected') {
    return fail('Rejecting the payment: the change was blocked.')
  }

  const order = await expectRow(
    await supabase
      .from('orders')
      .update({ status: 'pending_payment' })
      .eq('id', input.orderId)
      .select('id, status')
      .single(),
    'Reopening the order'
  )
  if (!order.ok) {
    await supabase
      .from('payments')
      .update({
        status: previous.status,
        verified_at: previous.verified_at,
        verified_by: previous.verified_by,
      })
      .eq('id', input.paymentId)
    return order
  }
  if (order.data.status !== 'pending_payment') {
    await supabase
      .from('payments')
      .update({
        status: previous.status,
        verified_at: previous.verified_at,
        verified_by: previous.verified_by,
      })
      .eq('id', input.paymentId)
    return fail('Reopening the order: the status change was blocked.')
  }

  const insertData: Record<string, unknown> = {
    payment_id: input.paymentId,
    verified_by: input.organizerId,
    decision: 'rejected',
  }
  if (input.reason.trim()) {
    insertData.notes = input.reason.trim()
  }

  const { error: verificationError } = await supabase
    .from('payment_verifications')
    .insert(insertData)
  if (verificationError) {
    await supabase.from('orders').update({ status: 'pending_verification' }).eq('id', input.orderId)
    await supabase
      .from('payments')
      .update({
        status: previous.status,
        verified_at: previous.verified_at,
        verified_by: previous.verified_by,
      })
      .eq('id', input.paymentId)
    return fail(`Recording the verification: ${verificationError.message}`)
  }

  return { ok: true, data: { orderId: input.orderId } }
}
