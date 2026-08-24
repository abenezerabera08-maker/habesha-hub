import type { LucideIcon } from 'lucide-react'
import { Crown, Bird, Star, KeyRound, Armchair, Users } from 'lucide-react'

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
  cardBackground: string
  footerBackground: string
  titleGradient: string | null
  artworkKey: string
  tierIcon: LucideIcon
  footerLabel: string
  footerSubtitle: string | null
  badge: { text: string; bg: string } | null
  artworkImage: string | null
}

export type TicketTierConfig = {
  id: string
  accent: string
  titleGrad: string | null
  cardBg: string
  footerBg: string
  footerLabel: string
  footerSub: string | null
  subtitle: string | null
  badge: { text: string; bg: string } | null
  icon: LucideIcon
  art: string
  defaultImage: string
}

export const TICKET_TYPE_LABELS: Record<string, string> = {
  'Early Bird': 'EARLY BIRD',
  VIP: 'VIP',
  'General Admission': 'GENERAL',
  'Jema (Group Ticket)': 'JEMA',
  'Backstage Pass': 'BACKSTAGE',
  'Balcony/Standing': 'BALCONY',
}

export const TICKET_VISUAL_DEFAULTS: Record<string, TicketVisualDefault> = {
  VIP: {
    primaryColor: '#F2C94C',
    label: 'VIP',
    tier: 'premium',
    automaticArtwork: null,
  },
  'Early Bird': {
    primaryColor: '#FFB25B',
    label: 'EARLY BIRD',
    tier: 'standard',
    automaticArtwork: null,
  },
  'General Admission': {
    primaryColor: '#BFD8FF',
    label: 'GENERAL',
    tier: 'standard',
    automaticArtwork: null,
  },
  'Backstage Pass': {
    primaryColor: '#C5A6F5',
    label: 'BACKSTAGE',
    tier: 'premium',
    automaticArtwork: null,
  },
  'Balcony/Standing': {
    primaryColor: '#7FE9DB',
    label: 'BALCONY',
    tier: 'standard',
    automaticArtwork: null,
  },
  'Jema (Group Ticket)': {
    primaryColor: '#A6E8AD',
    label: 'JEMA',
    tier: 'group',
    automaticArtwork: null,
  },
}

export const TIER_CONFIGS: Record<string, TicketTierConfig> = {
  vip: {
    id: 'vip',
    accent: '#F2C94C',
    titleGrad: 'linear-gradient(180deg,#FCE18A 0%,#C9971C 100%)',
    cardBg: 'linear-gradient(180deg,#0a0a0a 0%,#171009 55%,#221a08 100%)',
    footerBg: 'linear-gradient(135deg,#E4B94F 0%,#8C6512 100%)',
    footerLabel: 'VIP',
    footerSub: 'PREMIUM ACCESS',
    subtitle: 'LIVE ON STAGE',
    badge: null,
    icon: Crown,
    art: 'vip',
    defaultImage: '/ticket-defaults/vip.jpg',
  },
  earlybird: {
    id: 'earlybird',
    accent: '#FFB25B',
    titleGrad: 'linear-gradient(180deg,#FFD79A 0%,#F08A2E 100%)',
    cardBg: 'linear-gradient(180deg,#180b02 0%,#3d1904 50%,#7a3405 100%)',
    footerBg: 'linear-gradient(135deg,#F2830F 0%,#C8500A 100%)',
    footerLabel: 'EARLY BIRD',
    footerSub: null,
    subtitle: null,
    badge: { text: 'EARLY ACCESS. BEST PRICE.', bg: '#E8720B' },
    icon: Bird,
    art: 'earlybird',
    defaultImage: '/ticket-defaults/earlybird.jpg',
  },
  ga: {
    id: 'ga',
    accent: '#BFD8FF',
    titleGrad: null,
    cardBg: 'linear-gradient(180deg,#050a16 0%,#0c1c3a 55%,#123769 100%)',
    footerBg: 'linear-gradient(135deg,#2266C9 0%,#123A79 100%)',
    footerLabel: 'GENERAL ADMISSION',
    footerSub: null,
    subtitle: null,
    badge: null,
    icon: Star,
    art: 'ga',
    defaultImage: '/ticket-defaults/ga.jpg',
  },
  backstage: {
    id: 'backstage',
    accent: '#C5A6F5',
    titleGrad: null,
    cardBg: 'linear-gradient(180deg,#0c0613 0%,#1c0d33 55%,#2c1550 100%)',
    footerBg: 'linear-gradient(135deg,#7C4CD6 0%,#3E1C7A 100%)',
    footerLabel: 'BACKSTAGE',
    footerSub: 'ACCESS ALL AREAS',
    subtitle: null,
    badge: { text: 'BEHIND THE SCENES', bg: '#6E3FBF' },
    icon: KeyRound,
    art: 'backstage',
    defaultImage: '/ticket-defaults/backstage.jpg',
  },
  balcony: {
    id: 'balcony',
    accent: '#7FE9DB',
    titleGrad: null,
    cardBg: 'linear-gradient(180deg,#01141a 0%,#063038 55%,#0a4750 100%)',
    footerBg: 'linear-gradient(135deg,#159C93 0%,#0A5652 100%)',
    footerLabel: 'BALCONY',
    footerSub: 'STAND',
    subtitle: null,
    badge: { text: 'BEST VIEW. BEST EXPERIENCE.', bg: '#10807A' },
    icon: Armchair,
    art: 'balcony',
    defaultImage: '/ticket-defaults/balcony.jpg',
  },
  group: {
    id: 'group',
    accent: '#A6E8AD',
    titleGrad: null,
    cardBg: 'linear-gradient(180deg,#040f06 0%,#0d2b12 55%,#163f1c 100%)',
    footerBg: 'linear-gradient(135deg,#49A155 0%,#1F5426 100%)',
    footerLabel: 'JEMA',
    footerSub: 'GROUP TICKET',
    subtitle: null,
    badge: { text: 'TOGETHER IS BETTER', bg: '#2E7D3B' },
    icon: Users,
    art: 'group',
    defaultImage: '/ticket-defaults/group.jpg',
  },
}

const TIER_NAME_TO_CONFIG: Record<string, string> = {
  VIP: 'vip',
  'Early Bird': 'earlybird',
  'General Admission': 'ga',
  'Backstage Pass': 'backstage',
  'Balcony/Standing': 'balcony',
  'Jema (Group Ticket)': 'group',
}

export const ARTWORK_WIDTH = 320
export const ARTWORK_HEIGHT = 190
export const ARTWORK_ASPECT_RATIO = ARTWORK_WIDTH / ARTWORK_HEIGHT
export const TICKET_ARTWORK_ASPECT_RATIO = { width: ARTWORK_WIDTH, height: ARTWORK_HEIGHT }

/* ===========================================================
   GEOMETRY — smooth ticket outline with side notches only
   =========================================================== */

function ticketPath(
  W: number,
  H: number,
  { cornerR = 20, notchY, notchR = 16 }: { cornerR?: number; notchY: number; notchR?: number },
): string {
  let d = `M ${cornerR},0`
  d += ` L ${W - cornerR},0`
  d += ` A ${cornerR},${cornerR} 0 0 1 ${W},${cornerR}`
  d += ` L ${W},${notchY - notchR}`
  d += ` A ${notchR},${notchR} 0 0 1 ${W},${notchY + notchR}`
  d += ` L ${W},${H - cornerR}`
  d += ` A ${cornerR},${cornerR} 0 0 1 ${W - cornerR},${H}`
  d += ` L ${cornerR},${H}`
  d += ` A ${cornerR},${cornerR} 0 0 1 0,${H - cornerR}`
  d += ` L 0,${notchY + notchR}`
  d += ` A ${notchR},${notchR} 0 0 1 0,${notchY - notchR}`
  d += ` L 0,${cornerR}`
  d += ` A ${cornerR},${cornerR} 0 0 1 ${cornerR},0`
  d += ' Z'
  return d
}

export function computeTicketPath(width: number, height: number, notchY?: number): string {
  const ny = notchY ?? height * 0.7814
  return ticketPath(width, height, { cornerR: 20, notchY: ny, notchR: 16 })
}

/* ===========================================================
   QR PLACEHOLDER — deterministic noise with finder squares
   =========================================================== */

const QR_SIZE = 21

function isInFinder(r: number, c: number, or: number, oc: number): boolean {
  const rr = r - or
  const cc = c - oc
  return rr >= 0 && rr <= 6 && cc >= 0 && cc <= 6
}

function finderOn(r: number, c: number, or: number, oc: number): boolean {
  const rr = r - or
  const cc = c - oc
  if (rr === 0 || rr === 6 || cc === 0 || cc === 6) return true
  if (rr >= 2 && rr <= 4 && cc >= 2 && cc <= 4) return true
  return false
}

export function QRPlaceholder() {
  const corners: [number, number][] = [
    [0, 0],
    [0, QR_SIZE - 7],
    [QR_SIZE - 7, 0],
  ]
  const modules = []
  for (let r = 0; r < QR_SIZE; r++) {
    for (let c = 0; c < QR_SIZE; c++) {
      const corner = corners.find(([or, oc]) => isInFinder(r, c, or, oc))
      const on = corner
        ? finderOn(r, c, corner[0], corner[1])
        : (r * 31 + c * 17 + r * c * 7) % 5 < 2
      if (on) {
        modules.push(<rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#111" />)
      }
    }
  }
  return (
    <svg viewBox={`0 0 ${QR_SIZE} ${QR_SIZE}`} width="100%" height="100%" shapeRendering="crispEdges">
      <rect width={QR_SIZE} height={QR_SIZE} fill="#fff" />
      {modules}
    </svg>
  )
}

/* ===========================================================
   ARTWORK — SVG stand-ins for photography, one per tier
   =========================================================== */

const ART_VB = '0 0 320 190'

export function TicketArtwork({ kind }: { kind: string }) {
  if (kind === 'vip') {
    return (
      <svg viewBox={ART_VB} width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="vipGlow" cx="50%" cy="10%" r="70%">
            <stop offset="0%" stopColor="#FCE18A" stopOpacity={0.55} />
            <stop offset="100%" stopColor="#FCE18A" stopOpacity={0} />
          </radialGradient>
        </defs>
        <rect width="320" height="190" fill="#000" />
        <rect width="320" height="190" fill="url(#vipGlow)" />
        {[40, 110, 160, 210, 280].map((x, i) => (
          <polygon key={i} points={`${x},0 ${x + 26},0 190,190 140,190`} fill="#F2C94C" opacity={0.07} />
        ))}
        <rect x="60" y="150" width="200" height="4" fill="#F2C94C" opacity={0.6} />
        <rect x="55" y="120" width="6" height="34" fill="#8C6512" />
        <rect x="259" y="120" width="6" height="34" fill="#8C6512" />
        <rect x="55" y="120" width="210" height="4" fill="#F2C94C" opacity={0.4} />
        {Array.from({ length: 14 }).map((_, i) => (
          <path key={i} d={`M${20 + i * 21},190 q4,-16 8,0 z`} fill="#000" opacity={0.7} />
        ))}
      </svg>
    )
  }

  if (kind === 'earlybird') {
    return (
      <svg viewBox={ART_VB} width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="ebSun" cx="50%" cy="85%" r="60%">
            <stop offset="0%" stopColor="#FFD79A" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#FFD79A" stopOpacity={0} />
          </radialGradient>
        </defs>
        <rect width="320" height="190" fill="#5A2708" />
        <circle cx="160" cy="190" r="90" fill="url(#ebSun)" />
        <circle cx="160" cy="185" r="46" fill="#FFC469" opacity={0.85} />
        <path d="M40,26 q10,-14 20,0 q10,-10 18,2" stroke="#2a1204" strokeWidth="3" fill="none" opacity={0.8} />
        {Array.from({ length: 9 }).map((_, i) => {
          const x = 18 + i * 34
          return (
            <g key={i} opacity={0.85}>
              <path d={`M${x},190 L${x + 8},150 L${x + 16},190 Z`} fill="#1E0D02" />
              <line x1={x + 8} y1={150} x2={x + 8} y2={132} stroke="#1E0D02" strokeWidth="4" />
            </g>
          )
        })}
      </svg>
    )
  }

  if (kind === 'ga') {
    return (
      <svg viewBox={ART_VB} width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
        <rect width="320" height="190" fill="#050a16" />
        {[50, 100, 160, 220, 270].map((x, i) => (
          <polygon key={i} points={`${x},0 ${x + 22},0 200,190 150,190`} fill="#4C8CE0" opacity={0.14} />
        ))}
        <circle cx="160" cy="40" r="70" fill="#2266C9" opacity={0.25} />
        {Array.from({ length: 11 }).map((_, i) => {
          const x = 10 + i * 29
          const h = 30 + (i % 3) * 14
          return (
            <g key={i}>
              <path d={`M${x},190 L${x + 9},${190 - h} L${x + 18},190 Z`} fill="#020509" />
              <line x1={x + 9} y1={190 - h} x2={x + 9} y2={190 - h - 16} stroke="#020509" strokeWidth="4" />
            </g>
          )
        })}
      </svg>
    )
  }

  if (kind === 'backstage') {
    return (
      <svg viewBox={ART_VB} width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="bsHaze" cx="30%" cy="20%" r="70%">
            <stop offset="0%" stopColor="#B58CF2" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#B58CF2" stopOpacity={0} />
          </radialGradient>
        </defs>
        <rect width="320" height="190" fill="#0c0613" />
        <rect width="320" height="190" fill="url(#bsHaze)" />
        <rect x="20" y="120" width="60" height="50" rx="3" fill="#1c0d33" stroke="#6E3FBF" strokeWidth="1.5" opacity={0.9} />
        <rect x="90" y="100" width="50" height="70" rx="3" fill="#1c0d33" stroke="#6E3FBF" strokeWidth="1.5" opacity={0.9} />
        <line x1="240" y1="190" x2="240" y2="70" stroke="#6E3FBF" strokeWidth="4" opacity={0.7} />
        {[85, 100, 115, 130, 145, 160, 175].map((y, i) => (
          <line key={i} x1="225" y1={y} x2="255" y2={y} stroke="#6E3FBF" strokeWidth="3" opacity={0.6} />
        ))}
        {[[60, 30, 3], [200, 50, 2], [270, 25, 4], [150, 15, 2]].map((c, i) => (
          <circle key={i} cx={c[0]} cy={c[1]} r={c[2]} fill="#E7D6FF" opacity={0.7} />
        ))}
      </svg>
    )
  }

  if (kind === 'balcony') {
    return (
      <svg viewBox={ART_VB} width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="balGlow" cx="50%" cy="0%" r="70%">
            <stop offset="0%" stopColor="#7FE9DB" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#7FE9DB" stopOpacity={0} />
          </radialGradient>
        </defs>
        <rect width="320" height="190" fill="#04191c" />
        <rect width="320" height="190" fill="url(#balGlow)" />
        {[0, 1, 2, 3].map((row) => {
          const y = 60 + row * 32
          const scale = 1 - row * 0.06
          const n = 8 + row
          const totalW = n * 26 * scale
          const startX = 160 - totalW / 2
          return (
            <g key={row} opacity={0.9 - row * 0.12}>
              {Array.from({ length: n }).map((_, i) => (
                <rect
                  key={i}
                  x={startX + i * 26 * scale}
                  y={y}
                  width={18 * scale}
                  height={22 * scale}
                  rx="3"
                  fill="#03282c"
                  stroke="#0F8C86"
                  strokeWidth="1"
                />
              ))}
            </g>
          )
        })}
      </svg>
    )
  }

  if (kind === 'group') {
    return (
      <svg viewBox={ART_VB} width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="grpGlow" cx="50%" cy="15%" r="70%">
            <stop offset="0%" stopColor="#A6E8AD" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#A6E8AD" stopOpacity={0} />
          </radialGradient>
        </defs>
        <rect width="320" height="190" fill="#040f06" />
        <rect width="320" height="190" fill="url(#grpGlow)" />
        {[70, 115, 160, 205, 250].map((x, i) => {
          const raise = i % 2 === 0
          return (
            <g key={i}>
              <circle cx={x} cy="120" r="14" fill="#08210c" stroke="#2E7D3B" strokeWidth="1.5" />
              <path d={`M${x - 16},190 Q${x},150 ${x + 16},190 Z`} fill="#08210c" stroke="#2E7D3B" strokeWidth="1.5" />
              {raise && (
                <line x1={x + 12} y1="128" x2={x + 24} y2="98" stroke="#08210c" strokeWidth="7" strokeLinecap="round" />
              )}
              {!raise && (
                <line x1={x - 12} y1="128" x2={x - 24} y2="98" stroke="#08210c" strokeWidth="7" strokeLinecap="round" />
              )}
            </g>
          )
        })}
      </svg>
    )
  }

  return null
}

/* ===========================================================
   COLOR UTILITIES
   =========================================================== */

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
  return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount)
}

export function darken(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex)
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount))
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

export function derivePalette(baseColor: string) {
  return {
    primary: baseColor,
    accent: lighten(baseColor, 0.25),
    dark: darken(baseColor, 0.3),
    text: contrastTextColor(baseColor),
    background: lighten(baseColor, 0.9),
  }
}

/* ===========================================================
   RESOLVE VISUAL — builds the complete visual config
   =========================================================== */

export function resolveVisual(
  tierName: string,
  mode: VisualMode,
  customColor: string | null,
  backgroundImage: string | null,
  artworkImage: string | null = null,
): ResolvedVisual {
  const defaultVisual = TICKET_VISUAL_DEFAULTS[tierName]
  const configId = TIER_NAME_TO_CONFIG[tierName] ?? 'ga'
  const config = TIER_CONFIGS[configId]
  const accent = mode === 'custom_color' && customColor ? customColor : config.accent

  if (mode === 'custom_color' && customColor) {
    const palette = derivePalette(customColor)
    return {
      primaryColor: palette.primary,
      accentColor: palette.accent,
      darkAccent: palette.dark,
      textColor: '#FFFFFF',
      backgroundColor: '#000000',
      label: TICKET_TYPE_LABELS[tierName] ?? tierName.toUpperCase(),
      backgroundImage: null,
      visualTier: defaultVisual?.tier ?? 'standard',
      automaticArtwork: null,
      cardBackground: config.cardBg,
      footerBackground: `linear-gradient(135deg, ${lighten(customColor, 0.1)} 0%, ${darken(customColor, 0.35)} 100%)`,
      titleGradient: null,
      artworkKey: config.art,
      tierIcon: config.icon,
      footerLabel: config.footerLabel,
      footerSubtitle: config.footerSub,
      badge: config.badge,
      artworkImage: null,
    }
  }

  if (mode === 'image') {
    const palette = derivePalette(config.accent)
    return {
      primaryColor: palette.primary,
      accentColor: palette.accent,
      darkAccent: palette.dark,
      textColor: '#FFFFFF',
      backgroundColor: '#000000',
      label: TICKET_TYPE_LABELS[tierName] ?? tierName.toUpperCase(),
      backgroundImage: backgroundImage,
      visualTier: defaultVisual?.tier ?? 'standard',
      automaticArtwork: null,
      cardBackground: config.cardBg,
      footerBackground: config.footerBg,
      titleGradient: config.titleGrad,
      artworkKey: config.art,
      tierIcon: config.icon,
      footerLabel: config.footerLabel,
      footerSubtitle: config.footerSub,
      badge: config.badge,
      artworkImage: artworkImage ?? config.defaultImage,
    }
  }

  return {
    primaryColor: accent,
    accentColor: accent,
    darkAccent: darken(accent, 0.3),
    textColor: '#FFFFFF',
    backgroundColor: '#000000',
    label: TICKET_TYPE_LABELS[tierName] ?? tierName.toUpperCase(),
    backgroundImage: null,
    visualTier: defaultVisual?.tier ?? 'standard',
    automaticArtwork: null,
    cardBackground: config.cardBg,
    footerBackground: config.footerBg,
    titleGradient: config.titleGrad,
    artworkKey: config.art,
    tierIcon: config.icon,
    footerLabel: config.footerLabel,
    footerSubtitle: config.footerSub,
    badge: config.badge,
    artworkImage: config.defaultImage,
  }
}
