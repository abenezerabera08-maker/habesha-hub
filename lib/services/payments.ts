import { supabase } from '@/lib/supabase'
import { fail, type DbResult } from '@/lib/db'
import { apiPost } from '@/lib/apiClient'
import {
  imageExtensionForMime,
  MAX_PROOF_IMAGE_BYTES,
  MAX_REFERENCE_LENGTH,
  sanitizeText,
} from '@/lib/validation'

export type CheckoutInput = {
  userId: string
  eventId: string
  tierId: string
  quantity: number
  file?: File
  referenceNumber?: string
  paymentMethodId?: string
}

export async function checkoutOrder(
  input: CheckoutInput
): Promise<DbResult<{ orderId: string }>> {
  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    return fail('Quantity must be a whole number of at least 1.')
  }

  const referenceNumber = sanitizeText(input.referenceNumber ?? '')
  if (referenceNumber.length > MAX_REFERENCE_LENGTH) {
    return fail(`The reference number must be ${MAX_REFERENCE_LENGTH} characters or fewer.`)
  }

  // Free ticket: no payment method or proof required
  if (!input.paymentMethodId && !input.file) {
    const start = await apiPost<{ orderId: string }>('/api/checkout', {
      eventId: input.eventId,
      tierId: input.tierId,
      quantity: input.quantity,
      free: true,
    })
    return start
  }

  // Paid ticket: full flow
  if (!input.file) {
    return fail('Please upload proof of payment.')
  }
  if (!input.paymentMethodId) {
    return fail('Please select a payment method.')
  }

  const proofExt = imageExtensionForMime(input.file.type)
  if (!proofExt) {
    return fail('Please upload a JPG, PNG, WebP, or HEIC image as proof of payment.')
  }
  if (input.file.size > MAX_PROOF_IMAGE_BYTES) {
    return fail(
      `The proof image must be ${Math.floor(MAX_PROOF_IMAGE_BYTES / (1024 * 1024))} MB or smaller.`
    )
  }

  const start = await apiPost<{ orderId: string }>('/api/checkout', {
    eventId: input.eventId,
    tierId: input.tierId,
    quantity: input.quantity,
    paymentMethodId: input.paymentMethodId,
  })
  if (!start.ok) return start
  const orderId = start.data.orderId

  const storagePath = `${input.userId}/${orderId}-${crypto.randomUUID()}.${proofExt}`
  const { error: uploadError } = await supabase.storage
    .from('payment-proofs')
    .upload(storagePath, input.file, { contentType: input.file.type })
  if (uploadError) {
    await supabase.from('orders').delete().eq('id', orderId)
    return fail(`Uploading payment proof: ${uploadError.message}`)
  }

  const confirm = await apiPost<{ orderId: string }>('/api/checkout/confirm', {
    orderId,
    storagePath,
    referenceNumber,
    paymentMethodId: input.paymentMethodId,
  })
  if (!confirm.ok) {
    await supabase.storage.from('payment-proofs').remove([storagePath])
    return confirm
  }

  return confirm
}

export async function approvePayment(input: {
  organizerId: string
  paymentId: string
  orderId: string
}): Promise<DbResult<{ orderId: string }>> {
  return apiPost<{ orderId: string }>('/api/payments/verify', {
    paymentId: input.paymentId,
    orderId: input.orderId,
    decision: 'approved',
  })
}

export async function rejectPayment(input: {
  organizerId: string
  paymentId: string
  orderId: string
  reason: string
}): Promise<DbResult<{ orderId: string }>> {
  return apiPost<{ orderId: string }>('/api/payments/verify', {
    paymentId: input.paymentId,
    orderId: input.orderId,
    decision: 'rejected',
    reason: input.reason,
  })
}
