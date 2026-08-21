import type { VisualMode, ImageCropState } from '@/components/ticket/TicketTypeVisualMap'

export type PaymentMethod = {
  method_type: string
  provider: string
  account_name: string
  account_number: string
  instructions: string
}

export type TicketTier = {
  name: string
  description: string
  price: string
  quantity_available: string
  sale_start: string
  sale_end: string
  max_per_order: string
  max_group_size: string
  color: string
  benefits: string[]
  visualMode: VisualMode
  customColor: string
  backgroundImageUrl: string
  imageCrop: ImageCropState
}

export type EventEditorMode = 'create' | 'edit'

export type EventInitialData = {
  title: string
  description: string
  location: string
  cityId: string
  eventDate: string
  eventEndDate: string
  googleMapsUrl: string
  interests: string[]
  cities: { id: string; name: string }[]
  allInterests: { id: string; name: string }[]
  tiers: TicketTier[]
  paymentMethods: PaymentMethod[]
}

export type EventEditorProps = {
  mode: EventEditorMode
  userId: string
  role: string | null
  authLoading: boolean
  initialData?: EventInitialData
  eventStatus?: string
  rejectionReason?: string | null
  existingImageUrl?: string | null
  existingTierIds?: string[]
  existingPaymentMethodIds?: string[]
  onSave: (data: SavePayload) => Promise<{ ok: boolean; error?: string; eventId?: string }>
  onSubmitForReview?: () => Promise<{ ok: boolean; error?: string }>
  saving?: boolean
  submitting?: boolean
  saveError?: string
  saveSuccess?: string | null
}

export type SavePayload = {
  title: string
  description: string
  location: string
  cityId: string
  eventDate: string
  eventEndDate: string
  googleMapsUrl: string
  interests: string[]
  tiers: TicketTier[]
  paymentMethods: PaymentMethod[]
  coverImage: File | null
  submitStatus: 'draft' | 'pending_review'
}
