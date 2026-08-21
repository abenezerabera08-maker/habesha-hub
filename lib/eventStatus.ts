/**
 * Shared event status calculation.
 * Used by Discovery, Event Details, and any other component displaying event timing.
 *
 * States:
 *  - upcoming: currentTime < startAt → "Starts in X"
 *  - happening: startAt <= currentTime < endAt (or no endAt after start) → "Happening now"
 *  - ended: currentTime >= endAt (or no endAt but past event_date by >1 day) → "Ended"
 *
 * Discovery retention: events remain visible until end of the calendar day following
 * their end date (or event_date if no end_at).
 */

export type EventTimingStatus = 'upcoming' | 'happening' | 'ended'

export type EventStatusResult = {
  status: EventTimingStatus
  label: string
}

function diffToLabel(diffMs: number): string {
  const totalMin = Math.round(diffMs / (1000 * 60))
  if (totalMin < 1) return 'Starts in <1min'
  const hours = Math.floor(totalMin / 60)
  const min = totalMin % 60
  if (hours >= 24) {
    const days = Math.floor(hours / 24)
    return `Starts in ${days} ${days === 1 ? 'day' : 'days'}`
  }
  if (hours > 0 && min > 0) return `Starts in ${hours}hr ${min}min`
  if (hours > 0) return `Starts in ${hours}hr`
  return `Starts in ${min}min`
}

/**
 * Calculate the current display status of an event.
 * @param eventDateISO - The event start time (ISO string or Date)
 * @param endAtISO - The event end time (ISO string, Date, or null)
 * @param now - Current time (defaults to new Date())
 */
export function getEventStatus(
  eventDateISO: string | Date,
  endAtISO: string | Date | null | undefined,
  now: Date = new Date()
): EventStatusResult {
  const startMs = new Date(eventDateISO).getTime()
  const nowMs = now.getTime()

  if (nowMs < startMs) {
    const diffMs = startMs - nowMs
    return { status: 'upcoming', label: diffToLabel(diffMs) }
  }

  if (endAtISO) {
    const endMs = new Date(endAtISO).getTime()
    if (nowMs < endMs) {
      return { status: 'happening', label: 'Happening now' }
    }
    return { status: 'ended', label: 'Ended' }
  }

  // No end time: once started, treat as happening (no automatic "ended")
  return { status: 'happening', label: 'Happening now' }
}

/**
 * Whether an event should still appear on Discovery.
 * Events stay visible until the end of the calendar day following their end date
 * (or event_date + 1 day if no end_at).
 */
export function isEventDiscoverable(
  eventDateISO: string | Date,
  endAtISO: string | Date | null | undefined,
  now: Date = new Date()
): boolean {
  const referenceDate = endAtISO ? new Date(endAtISO) : new Date(eventDateISO)
  // End of the calendar day following the reference date
  const cutoff = new Date(referenceDate)
  cutoff.setDate(cutoff.getDate() + 1)
  cutoff.setHours(23, 59, 59, 999)

  return now.getTime() <= cutoff.getTime()
}
