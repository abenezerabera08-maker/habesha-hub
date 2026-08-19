import { supabase } from '@/lib/supabase'
import { expectRow, fail, type DbResult } from '@/lib/db'
import { apiPost } from '@/lib/apiClient'

export type TierRow = {
  name: string
  description: string
  price: number
  quantity_available: number
  sale_start: string | null
  sale_end: string | null
  max_per_order: number | null
  max_group_size: number | null
  color: string | null
  benefits: string[] | null
}

export type PaymentMethodRow = {
  method_type: string
  provider: string | null
  account_name: string
  account_number: string
  instructions: string | null
}

export type CreateEventInput = {
  organizerId: string
  title: string
  description: string
  location: string
  cityId: string
  eventDate: string
  status: 'draft' | 'pending_review'
  tiers: TierRow[]
  paymentMethods: PaymentMethodRow[]
  interestIds?: string[]
}

export async function createEvent(input: CreateEventInput): Promise<DbResult<{ eventId: string }>> {
  const event = await expectRow(
    await supabase
      .from('events')
      .insert({
        organizer_id: input.organizerId,
        title: input.title.trim(),
        description: input.description.trim() || null,
        location: input.location.trim(),
        city_id: input.cityId,
        event_date: input.eventDate,
        status: input.status,
      })
      .select('id')
      .single(),
    'Creating the event'
  )
  if (!event.ok) return event
  const eventId = event.data.id

  if (input.interestIds && input.interestIds.length > 0) {
    const { error: interestError } = await supabase.from('event_interests').insert(
      input.interestIds.map((interest_id) => ({ event_id: eventId, interest_id }))
    )
    if (interestError) {
      await supabase.from('events').delete().eq('id', eventId)
      return fail(`Saving interests: ${interestError.message}`)
    }
  }

  const { error: tierError } = await supabase.from('ticket_tiers').insert(
    input.tiers.map((t, i) => ({
      event_id: eventId,
      name: t.name.trim(),
      description: t.description.trim() || null,
      price: t.price,
      quantity_available: t.quantity_available,
      display_order: i,
      sale_start: t.sale_start,
      sale_end: t.sale_end,
      max_per_order: t.max_per_order,
      max_group_size: t.max_group_size,
      color: t.color,
      benefits: t.benefits,
    }))
  )
  if (tierError) {
    await supabase.from('event_interests').delete().eq('event_id', eventId)
    await supabase.from('events').delete().eq('id', eventId)
    return fail(`Saving ticket types: ${tierError.message}`)
  }

  const { error: pmError } = await supabase.from('event_payment_methods').insert(
    input.paymentMethods.map((pm) => ({
      event_id: eventId,
      method_type: pm.method_type,
      provider: pm.provider,
      account_name: pm.account_name.trim(),
      account_number: pm.account_number.trim(),
      instructions: pm.instructions,
    }))
  )
  if (pmError) {
    await supabase.from('event_interests').delete().eq('event_id', eventId)
    await supabase.from('ticket_tiers').delete().eq('event_id', eventId)
    await supabase.from('events').delete().eq('id', eventId)
    return fail(`Saving payment methods: ${pmError.message}`)
  }

  return { ok: true, data: { eventId } }
}

export async function updateEventDetails(
  eventId: string,
  details: {
    title: string
    description: string
    location: string
    cityId: string
    eventDate: string
    interestIds?: string[]
    status?: string
    imageUrl?: string | null
  }
): Promise<DbResult<{ id: string }>> {
  const updatePayload: Record<string, unknown> = {
    title: details.title.trim(),
    description: details.description.trim() || null,
    location: details.location.trim(),
    event_date: details.eventDate,
    city_id: details.cityId || null,
  }
  if (details.status) {
    updatePayload.status = details.status
  }
  if (details.imageUrl !== undefined) {
    updatePayload.image_url = details.imageUrl
  }

  const result = await expectRow(
    await supabase
      .from('events')
      .update(updatePayload)
      .eq('id', eventId)
      .select('id')
      .single(),
    'Saving event details'
  )
  if (!result.ok) return result

  if (details.interestIds) {
    const { error: deleteError } = await supabase
      .from('event_interests')
      .delete()
      .eq('event_id', eventId)
    if (deleteError) return fail(`Saving interests: ${deleteError.message}`)

    if (details.interestIds.length > 0) {
      const { error: insertError } = await supabase.from('event_interests').insert(
        details.interestIds.map((interest_id) => ({ event_id: eventId, interest_id }))
      )
      if (insertError) return fail(`Saving interests: ${insertError.message}`)
    }
  }

  return { ok: true, data: { id: eventId } }
}

export async function submitEventForReview(eventId: string): Promise<DbResult<{ id: string }>> {
  return apiPost<{ id: string }>('/api/events/submit', { eventId })
}

export async function replaceTiers(
  eventId: string,
  tiers: TierRow[],
  tierIds: string[]
): Promise<DbResult<null>> {
  const { data: existing } = await supabase
    .from('ticket_tiers')
    .select('id')
    .eq('event_id', eventId)

  const existingIds = new Set((existing ?? []).map((r) => r.id))
  const keptIds = new Set<string>()

  for (let i = 0; i < tiers.length; i++) {
    const row = {
      name: tiers[i].name.trim(),
      description: tiers[i].description.trim() || null,
      price: tiers[i].price,
      quantity_available: tiers[i].quantity_available,
      display_order: i,
      sale_start: tiers[i].sale_start,
      sale_end: tiers[i].sale_end,
      max_per_order: tiers[i].max_per_order,
      max_group_size: tiers[i].max_group_size,
      color: tiers[i].color,
      benefits: tiers[i].benefits,
    }
    const existingId = tierIds[i]
    if (existingId) {
      const { error } = await supabase.from('ticket_tiers').update(row).eq('id', existingId)
      if (error) return fail(`Ticket type ${i + 1}: ${error.message}`)
      keptIds.add(existingId)
    } else {
      const inserted = await expectRow(
        await supabase
          .from('ticket_tiers')
          .insert({ ...row, event_id: eventId })
          .select('id')
          .single(),
        `Ticket type ${i + 1}`
      )
      if (!inserted.ok) return inserted
      keptIds.add(inserted.data.id)
      tierIds[i] = inserted.data.id
    }
  }

  const toDelete = [...existingIds].filter((id) => !keptIds.has(id))
  if (toDelete.length > 0) {
    const { error } = await supabase.from('ticket_tiers').delete().in('id', toDelete)
    if (error) return fail(`Removing ticket types: ${error.message}`)
  }

  return { ok: true, data: null }
}

export async function replacePaymentMethods(
  eventId: string,
  methods: PaymentMethodRow[],
  methodIds: string[]
): Promise<DbResult<null>> {
  const { data: existing } = await supabase
    .from('event_payment_methods')
    .select('id')
    .eq('event_id', eventId)

  const existingIds = new Set((existing ?? []).map((r) => r.id))
  const keptIds = new Set<string>()

  for (let i = 0; i < methods.length; i++) {
    const row = {
      method_type: methods[i].method_type,
      provider: methods[i].provider,
      account_name: methods[i].account_name.trim(),
      account_number: methods[i].account_number.trim(),
      instructions: methods[i].instructions,
    }
    const existingId = methodIds[i]
    if (existingId) {
      const { error } = await supabase
        .from('event_payment_methods')
        .update(row)
        .eq('id', existingId)
      if (error) return fail(`Payment method ${i + 1}: ${error.message}`)
      keptIds.add(existingId)
    } else {
      const inserted = await expectRow(
        await supabase
          .from('event_payment_methods')
          .insert({ ...row, event_id: eventId })
          .select('id')
          .single(),
        `Payment method ${i + 1}`
      )
      if (!inserted.ok) return inserted
      keptIds.add(inserted.data.id)
      methodIds[i] = inserted.data.id
    }
  }

  const toDelete = [...existingIds].filter((id) => !keptIds.has(id))
  if (toDelete.length > 0) {
    const { error } = await supabase.from('event_payment_methods').delete().in('id', toDelete)
    if (error) return fail(`Removing payment methods: ${error.message}`)
  }

  return { ok: true, data: null }
}
