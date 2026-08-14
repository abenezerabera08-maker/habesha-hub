import { supabase } from '@/lib/supabase'
import { expectRow, fail, type DbResult } from '@/lib/db'

export async function approveEvent(eventId: string): Promise<DbResult<{ eventId: string }>> {
  const tierCount = await supabase
    .from('ticket_tiers')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
  const pmCount = await supabase
    .from('event_payment_methods')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)

  if (tierCount.error || pmCount.error) {
    return fail('Could not verify the event contents before publishing.')
  }
  if ((tierCount.count ?? 0) === 0) {
    return fail('This event has no ticket types — add at least one before publishing.')
  }
  if ((pmCount.count ?? 0) === 0) {
    return fail('This event has no payment methods — add at least one before publishing.')
  }

  const result = await expectRow(
    await supabase
      .from('events')
      .update({ status: 'published', published_at: new Date().toISOString() })
      .eq('id', eventId)
      .select('id, status')
      .single(),
    'Publishing the event'
  )
  if (!result.ok) return result
  if (result.data.status !== 'published') {
    return fail('Publishing the event: the status change was blocked.')
  }
  return { ok: true, data: { eventId } }
}

export async function rejectEvent(
  eventId: string,
  reason: string
): Promise<DbResult<{ eventId: string }>> {
  const result = await expectRow(
    await supabase
      .from('events')
      .update({ status: 'rejected', rejection_reason: reason.trim() || null })
      .eq('id', eventId)
      .select('id, status')
      .single(),
    'Rejecting the event'
  )
  if (!result.ok) return result
  if (result.data.status !== 'rejected') {
    return fail('Rejecting the event: the status change was blocked.')
  }
  return { ok: true, data: { eventId } }
}
