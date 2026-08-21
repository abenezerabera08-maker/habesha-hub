import { DEFAULT_IMAGE_CROP } from '@/components/ticket/TicketTypeVisualMap'
import type { TicketTier, PaymentMethod } from './types'

export function emptyPaymentMethod(): PaymentMethod {
  return { method_type: 'telebirr', provider: '', account_name: '', account_number: '', instructions: '' }
}

export function emptyTicketTier(): TicketTier {
  return {
    name: '', description: '', price: '', quantity_available: '',
    sale_start: new Date().toISOString().slice(0, 16), sale_end: '',
    max_per_order: '', max_group_size: '', color: '', benefits: [],
    visualMode: 'automatic', customColor: '', backgroundImageUrl: '',
    imageCrop: DEFAULT_IMAGE_CROP,
  }
}

export function toUTCISOString(localDateTimeStr: string): string | null {
  if (!localDateTimeStr) return null
  return new Date(localDateTimeStr).toISOString()
}

export function needsProvider(pm: PaymentMethod): boolean {
  return pm.method_type === 'bank_transfer' || pm.method_type === 'other'
}
