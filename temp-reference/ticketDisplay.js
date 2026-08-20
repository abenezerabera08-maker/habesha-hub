// components/tickets/ticketDisplay.js
//
// Shared display config for the My Tickets summary card and the Ticket
// Detail visual. Keeping this in one place means both views always agree
// on tier colors and status labels.

import { CheckCircle2, Clock, XCircle, Crown, Star, Users, Ticket as TicketIcon } from 'lucide-react'

// Tier accent config — add a new key here whenever a new ticket tier name
// is introduced (e.g. "Balcony Stand" is already covered; a brand-new tier
// not listed here falls back to the neutral "default" style below rather
// than rendering unstyled).
export const TIER_CONFIG = {
  'general admission': { color: '#2563EB', bg: '#EFF6FF', icon: TicketIcon },
  vip: { color: '#B45309', bg: '#FFFBEB', icon: Crown },
  backstage: { color: '#7C3AED', bg: '#F5F3FF', icon: Star },
  jema: { color: '#16A34A', bg: '#F0FDF4', icon: Users },
  'early bird': { color: '#0D9488', bg: '#F0FDFA', icon: Clock },
  'balcony stand': { color: '#E11D48', bg: '#FFF1F2', icon: TicketIcon },
}

const DEFAULT_TIER = { color: '#475569', bg: '#F8FAFC', icon: TicketIcon }

export function getTierConfig(tierName) {
  const key = (tierName || '').trim().toLowerCase()
  return TIER_CONFIG[key] || DEFAULT_TIER
}

// Group tickets ("Jema") admit multiple people per single ticket.
// If you add another group-style tier later, add its lowercase name here.
const GROUP_TIER_NAMES = ['jema']
export function isGroupTier(tierName) {
  return GROUP_TIER_NAMES.includes((tierName || '').trim().toLowerCase())
}

// A rejected payment is NEVER shown as a usable ticket — checked-in status
// (if present) always takes visual priority over the underlying order status.
export function getDisplayStatus(ticket) {
  if (ticket.checkedInAt) return 'checked_in'
  return ticket.status // expected: 'confirmed' | 'pending' | 'rejected'
}

export const STATUS_CONFIG = {
  confirmed: { label: 'Confirmed', color: '#16A34A', bg: '#F0FDF4', icon: CheckCircle2 },
  checked_in: { label: 'Checked In', color: '#2563EB', bg: '#EFF6FF', icon: CheckCircle2 },
  pending: { label: 'Payment Pending', color: '#B45309', bg: '#FFFBEB', icon: Clock },
  rejected: { label: 'Payment Failed', color: '#DC2626', bg: '#FEF2F2', icon: XCircle },
}

export function formatEventDate(iso) {
  const d = new Date(iso)
  return (
    d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  )
}

export function formatCheckedInAt(iso) {
  const d = new Date(iso)
  return (
    d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  )
}

export function formatOrderedAt(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}
