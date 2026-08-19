export type VisualMode = 'automatic' | 'custom_color' | 'image'

export type VisualTier = 'premium' | 'standard' | 'group'

export type ImageCropState = {
  positionX: number
  positionY: number
  zoom: number
}

export const DEFAULT_IMAGE_CROP: ImageCropState = {
  positionX: 50,
  positionY: 50,
  zoom: 1,
}

export type TicketVisualDefault = {
  primaryColor: string
  label: string
  tier: VisualTier
  automaticArtwork: string | null
}

export type ResolvedVisual = {
  primaryColor: string
  accentColor: string
  darkAccent: string
  textColor: string
  backgroundColor: string
  label: string
  backgroundImage: string | null
  visualTier: VisualTier
  automaticArtwork: string | null
}

export const TICKET_TYPE_LABELS: Record<string, string> = {
  'Early Bird': 'EARLY BIRD',
  'VIP': 'VIP',
  'General Admission': 'GENERAL',
  'Jema (Group Ticket)': 'JEMA',
  'Backstage Pass': 'BACKSTAGE',
  'Balcony/Standing': 'BALCONY',
}

export const TICKET_VISUAL_DEFAULTS: Record<string, TicketVisualDefault> = {
  'VIP': {
    primaryColor: '#C9981A',
    label: 'VIP',
    tier: 'premium',
    automaticArtwork: null,
  },
  'Early Bird': {
    primaryColor: '#2563EB',
    label: 'EARLY BIRD',
    tier: 'standard',
    automaticArtwork: null,
  },
  'General Admission': {
    primaryColor: '#16A34A',
    label: 'GENERAL',
    tier: 'standard',
    automaticArtwork: null,
  },
  'Backstage Pass': {
    primaryColor: '#7C3AED',
    label: 'BACKSTAGE',
    tier: 'premium',
    automaticArtwork: null,
  },
  'Balcony/Standing': {
    primaryColor: '#64748B',
    label: 'BALCONY',
    tier: 'standard',
    automaticArtwork: null,
  },
  'Jema (Group Ticket)': {
    primaryColor: '#B8860B',
    label: 'JEMA',
    tier: 'group',
    automaticArtwork: null,
  },
}

export const TICKET_ARTWORK_ASPECT_RATIO = { width: 400, height: 280 }

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
      .join('')
  )
}

export function lighten(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex)
  return rgbToHex(
    r + (255 - r) * amount,
    g + (255 - g) * amount,
    b + (255 - b) * amount,
  )
}

export function darken(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex)
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount))
}

export function saturate(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const gray = (max + min) / 2
  return rgbToHex(
    gray + (r - gray) * (1 + amount),
    gray + (g - gray) * (1 + amount),
    gray + (b - gray) * (1 + amount),
  )
}

function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

export function contrastTextColor(hex: string): string {
  return luminance(hex) > 0.4 ? '#1A1A2E' : '#FFFFFF'
}

export function derivePalette(baseColor: string): {
  primary: string
  accent: string
  dark: string
  text: string
  background: string
} {
  return {
    primary: baseColor,
    accent: lighten(baseColor, 0.25),
    dark: darken(baseColor, 0.3),
    text: contrastTextColor(baseColor),
    background: lighten(baseColor, 0.9),
  }
}

export function resolveVisual(
  tierName: string,
  mode: VisualMode,
  customColor: string | null,
  backgroundImage: string | null,
): ResolvedVisual {
  const defaultVisual = TICKET_VISUAL_DEFAULTS[tierName]

  if (mode === 'custom_color' && customColor) {
    const palette = derivePalette(customColor)
    return {
      primaryColor: palette.primary,
      accentColor: palette.accent,
      darkAccent: palette.dark,
      textColor: palette.text,
      backgroundColor: palette.background,
      label: TICKET_TYPE_LABELS[tierName] ?? tierName.toUpperCase(),
      backgroundImage: null,
      visualTier: defaultVisual?.tier ?? 'standard',
      automaticArtwork: defaultVisual?.automaticArtwork ?? null,
    }
  }

  if (mode === 'image') {
    const palette = derivePalette(defaultVisual?.primaryColor ?? '#6B7280')
    return {
      primaryColor: palette.primary,
      accentColor: palette.accent,
      darkAccent: palette.dark,
      textColor: '#FFFFFF',
      backgroundColor: '#1A1A2E',
      label: TICKET_TYPE_LABELS[tierName] ?? tierName.toUpperCase(),
      backgroundImage: backgroundImage,
      visualTier: defaultVisual?.tier ?? 'standard',
      automaticArtwork: null,
    }
  }

  const palette = derivePalette(defaultVisual?.primaryColor ?? '#6B7280')
  return {
    primaryColor: palette.primary,
    accentColor: palette.accent,
    darkAccent: palette.dark,
    textColor: palette.text,
    backgroundColor: palette.background,
    label: TICKET_TYPE_LABELS[tierName] ?? tierName.toUpperCase(),
    backgroundImage: null,
    visualTier: defaultVisual?.tier ?? 'standard',
    automaticArtwork: defaultVisual?.automaticArtwork ?? null,
  }
}
