const NAME_RE = /^[\p{L}\p{M}'’ .\-]{1,120}$/u
const ACCOUNT_RE = /^[\p{L}\p{N}'’ .\-]{3,80}$/u
const METHOD_TYPES = new Set(['telebirr', 'cbe_birr', 'bank_transfer', 'other'])

export function sanitizeText(v: string): string {
  return v.replace(/[\u0000-\u001f\u007f]/g, '').trim()
}

export function isValidName(v: string): boolean {
  const s = sanitizeText(v)
  if (!s) return false
  return NAME_RE.test(s)
}

export function isValidAccountNumber(v: string): boolean {
  const s = sanitizeText(v)
  if (!s) return false
  return ACCOUNT_RE.test(s)
}

export function isValidMethodType(v: string): boolean {
  return METHOD_TYPES.has(v)
}

export const MAX_REFERENCE_LENGTH = 120
export const MAX_PROOF_IMAGE_BYTES = 5 * 1024 * 1024

export const VALID_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
])

export function imageExtensionForMime(mime: string): string | null {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg'
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    case 'image/heic':
      return 'heic'
    case 'image/heif':
      return 'heif'
    default:
      return null
  }
}

export function validateReferenceNumber(v: string): string | null {
  const s = sanitizeText(v)
  if (s.length > MAX_REFERENCE_LENGTH) {
    return `The reference number must be ${MAX_REFERENCE_LENGTH} characters or fewer.`
  }
  return null
}

export function validateEventDate(iso: string): string | null {
  if (!iso) return 'Event date is required.'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'Event date is not a valid date.'
  if (d.getTime() <= Date.now()) return 'Event date must be in the future.'
  return null
}

export type PaymentMethodInput = {
  method_type: string
  provider: string
  account_name: string
  account_number: string
  instructions: string
}

export function validatePaymentMethod(pm: PaymentMethodInput, index: number): string[] {
  const errors: string[] = []
  const label = `Payment method ${index + 1}`
  if (!isValidMethodType(pm.method_type)) {
    errors.push(`${label}: choose a valid method type.`)
  }
  if (!isValidName(pm.account_name)) {
    errors.push(`${label}: enter the account holder name.`)
  }
  if (!isValidAccountNumber(pm.account_number)) {
    errors.push(`${label}: enter a valid account or phone number (digits, dashes, and spaces are allowed).`)
  }
  const needsProvider = pm.method_type === 'bank_transfer' || pm.method_type === 'other'
  if (needsProvider && !pm.provider.trim()) {
    errors.push(`${label}: the bank/provider name is required for this method.`)
  }
  return errors
}

export type TicketTierInput = {
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
}

export function validateTicketTier(t: TicketTierInput, index: number, eventDateISO: string | null): string[] {
  const errors: string[] = []
  const label = `Ticket type ${index + 1}`

  if (!t.name.trim()) {
    errors.push(`${label}: name is required.`)
  }

  const price = Number(t.price)
  if (t.price.trim() === '' || Number.isNaN(price) || price < 0) {
    errors.push(`${label}: price must be a number >= 0.`)
  }

  const qty = Number(t.quantity_available)
  if (t.quantity_available.trim() === '' || !Number.isInteger(qty) || qty <= 0) {
    errors.push(`${label}: quantity must be a whole number > 0.`)
  }

  const maxPerOrder = t.max_per_order.trim() === '' ? null : Number(t.max_per_order)
  if (maxPerOrder != null && (!Number.isInteger(maxPerOrder) || maxPerOrder < 1)) {
    errors.push(`${label}: max per order must be a whole number >= 1.`)
  }

  const maxGroupSize = t.max_group_size.trim() === '' ? null : Number(t.max_group_size)
  if (maxGroupSize != null && (!Number.isInteger(maxGroupSize) || maxGroupSize < 2)) {
    errors.push(`${label}: max group size must be a whole number > 1.`)
  }
  if (t.name === 'Jema (Group Ticket)' && (maxGroupSize == null || maxGroupSize < 2)) {
    errors.push(`${label}: Jema group tickets require a group size > 1.`)
  }

  if (t.sale_start && t.sale_end) {
    const start = new Date(t.sale_start).getTime()
    const end = new Date(t.sale_end).getTime()
    if (Number.isNaN(start) || Number.isNaN(end)) {
      errors.push(`${label}: sale start and sale end must be valid dates.`)
    } else if (start >= end) {
      errors.push(`${label}: the sale start must be before the sale end.`)
    }
  }

  if (t.sale_end && eventDateISO) {
    const end = new Date(t.sale_end).getTime()
    const eventDate = new Date(eventDateISO).getTime()
    if (!Number.isNaN(end) && !Number.isNaN(eventDate) && end > eventDate) {
      errors.push(`${label}: the sale end must not be after the event date.`)
    }
  }

  return errors
}

export function validateEvent(input: {
  title: string
  location: string
  eventDate: string
  eventEndDate?: string
  googleMapsUrl: string
  tiers: TicketTierInput[]
  paymentMethods: PaymentMethodInput[]
}): string[] {
  const errors: string[] = []

  if (!sanitizeText(input.title)) errors.push('Event title is required.')
  if (!sanitizeText(input.location)) errors.push('Event location is required.')

  if (!sanitizeText(input.googleMapsUrl)) {
    errors.push('Google Maps link is required.')
  } else {
    const url = input.googleMapsUrl.trim()
    const validGoogleMaps = /^https?:\/\/(maps\.google\.com|www\.google\.com\/maps|maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(url)
    if (!validGoogleMaps) {
      const isUrl = /^https?:\/\//i.test(url)
      if (!isUrl) {
        errors.push('Google Maps link must be a valid URL.')
      } else {
        errors.push('Google Maps link must be a Google Maps URL (e.g. https://maps.google.com/... or https://maps.app.goo.gl/...).')
      }
    }
  }

  const dateError = validateEventDate(input.eventDate)
  if (dateError) errors.push(dateError)

  if (input.eventEndDate) {
    const endDate = new Date(input.eventEndDate).getTime()
    const startDate = new Date(input.eventDate).getTime()
    if (!Number.isNaN(endDate) && !Number.isNaN(startDate) && endDate <= startDate) {
      errors.push('Event ending time must be after the starting time.')
    }
  }

  if (input.tiers.length === 0) errors.push('Add at least one ticket type.')
  for (let i = 0; i < input.tiers.length; i++) {
    errors.push(...validateTicketTier(input.tiers[i], i, input.eventDate))
  }

  if (input.paymentMethods.length === 0) errors.push('Add at least one payment method.')
  for (let i = 0; i < input.paymentMethods.length; i++) {
    errors.push(...validatePaymentMethod(input.paymentMethods[i], i))
  }

  return errors
}
