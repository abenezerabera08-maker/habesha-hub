import { CheckCircle2, Clock, XCircle, Crown, Star, Users, Ticket as TicketIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type TierDisplayConfig = { color: string; bg: string; icon: LucideIcon }

const TIER_CONFIG: Record<string, TierDisplayConfig> = {
  'general admission': { color: '#2563EB', bg: '#EFF6FF', icon: TicketIcon },
  vip: { color: '#B45309', bg: '#FFFBEB', icon: Crown },
  backstage: { color: '#7C3AED', bg: '#F5F3FF', icon: Star },
  jema: { color: '#16A34A', bg: '#F0FDF4', icon: Users },
  'early bird': { color: '#0D9488', bg: '#F0FDFA', icon: Clock },
  'balcony/standing': { color: '#E11D48', bg: '#FFF1F2', icon: TicketIcon },
}

const DEFAULT_TIER: TierDisplayConfig = { color: '#475569', bg: '#F8FAFC', icon: TicketIcon }

export function getTierConfig(tierName: string | null | undefined): TierDisplayConfig {
  const key = (tierName || '').trim().toLowerCase()
  return TIER_CONFIG[key] || DEFAULT_TIER
}

const GROUP_TIER_NAMES = ['jema']
export function isGroupTier(tierName: string | null | undefined): boolean {
  return GROUP_TIER_NAMES.includes((tierName || '').trim().toLowerCase())
}

export type DisplayStatus = 'confirmed' | 'checked_in' | 'pending' | 'rejected'

type TicketStatusSource = {
  status: string
  checked_in_at: string | null
}

export function getDisplayStatus(ticket: TicketStatusSource): DisplayStatus {
  if (ticket.checked_in_at) return 'checked_in'
  if (ticket.status === 'confirmed') return 'confirmed'
  if (ticket.status === 'pending_verification') return 'pending'
  return 'rejected'
}

type StatusDisplayConfig = {
  label: string
  color: string
  bg: string
  icon: LucideIcon
}

export const STATUS_CONFIG: Record<DisplayStatus, StatusDisplayConfig> = {
  confirmed: { label: 'Confirmed', color: '#16A34A', bg: '#F0FDF4', icon: CheckCircle2 },
  checked_in: { label: 'Checked In', color: '#2563EB', bg: '#EFF6FF', icon: CheckCircle2 },
  pending: { label: 'Payment Pending', color: '#B45309', bg: '#FFFBEB', icon: Clock },
  rejected: { label: 'Payment Failed', color: '#DC2626', bg: '#FEF2F2', icon: XCircle },
}

export function formatEventDate(iso: string): string {
  const d = new Date(iso)
  return (
    d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  )
}

export function formatCheckedInAt(iso: string): string {
  const d = new Date(iso)
  return (
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  )
}

export function formatOrderedAt(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
