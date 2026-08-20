'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { requireRole } from '@/lib/auth'
import { useAuth } from '@/lib/AuthContext'
import { createEvent, updateEventDetails, type TierRow, type PaymentMethodRow } from '@/lib/services/events'
import { validateEvent, imageExtensionForMime } from '@/lib/validation'
import TicketAppearanceSelector from '@/components/ticket/TicketAppearanceSelector'
import TicketPreview from '@/components/ticket/TicketPreview'
import type { VisualMode, ImageCropState } from '@/components/ticket/TicketTypeVisualMap'
import { DEFAULT_IMAGE_CROP } from '@/components/ticket/TicketTypeVisualMap'
import {
  Calendar, Hash, Image as ImageIcon, UploadCloud, Ticket, Wallet, Info,
  Plus, Trash2, Sparkles, Lightbulb, Camera, ListChecks, ShieldCheck,
  HelpCircle, ExternalLink, CheckCircle2, AlertCircle, Circle, ArrowUpRight,
  MapPin, Clock, X, Menu, Bell, ChevronDown,
  Bold, Italic, Underline, List, ListOrdered, Link,
} from 'lucide-react'

/* ================================================================
   Types
   ================================================================ */

type PaymentMethod = {
  method_type: string
  provider: string
  account_name: string
  account_number: string
  instructions: string
}

type TicketTier = {
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

/* ================================================================
   Constants
   ================================================================ */

const STEP_SECTIONS = [
  { label: 'Event Details', href: '#section-event-basics' },
  { label: 'Tickets', href: '#section-tickets' },
  { label: 'Payments', href: '#section-payment-methods' },
  { label: 'Review', href: '#section-review' },
]

const ORGANIZER_TIPS = [
  { icon: Sparkles, bg: '#eef2ff', fg: '#4f46e5', title: 'Be clear & detailed', body: 'Add all the important info so people know what to expect.' },
  { icon: Camera, bg: '#ecfdf5', fg: '#059669', title: 'Great images attract more', body: 'Use high-quality images for better engagement.' },
  { icon: Ticket, bg: '#fef2f2', fg: '#ef4444', title: 'Ticket types', body: 'Create multiple ticket options to suit different audiences.' },
  { icon: ListChecks, bg: '#fffbeb', fg: '#f59e0b', title: 'Review before submitting', body: 'Double-check everything before sending for review.' },
]

const GUIDE_SECTIONS = [
  { icon: Calendar, title: 'Event Basics', points: [
    'Use a specific, searchable name — "Afro Beats Night: Live at Ghion Gardens" outperforms "Music Event."',
    'For Location, include the venue name and neighborhood so attendees can find it without guessing.',
    'Pick the correct City — this is what Discover uses to show your event to people nearby.',
    'In Description, cover what it is, who it\'s for, and any highlights (guests, lineup, dress code).',
  ]},
  { icon: Hash, title: 'Interests', points: [
    'Optional, but pick 2–4 relevant categories — this is what powers Discover recommendations.',
    'Choosing too many unrelated categories can make your event show up for the wrong audience.',
  ]},
  { icon: ImageIcon, title: 'Cover Image', points: [
    'This is the single biggest factor in click-through — events with a real photo get noticed first.',
    'Use a landscape photo close to 1200×630px so it isn\'t cropped awkwardly on cards and previews.',
    'Avoid images with lots of text baked in — titles and dates already render on top of it.',
  ]},
  { icon: Clock, title: 'Event Date & Time', points: [
    'Double-check both before submitting — the main date can\'t be changed after your event goes live.',
    'If doors open before the main event, mention that in the Description rather than the date field.',
  ]},
  { icon: Ticket, title: 'Tickets', points: [
    'Give each ticket type a clear name — "Early Bird" and "General Admission" read better than "Ticket 1."',
    'Set Sale starts / Sale ends if you want to run early-bird pricing or cut off sales before the event.',
    'Use Max per order to limit bulk buying if you\'re worried about reselling.',
    'Quantity should match what you can actually deliver — you can\'t oversell past it later.',
  ]},
  { icon: Wallet, title: 'Payment Methods', points: [
    'Add at least one method your attendees actually use — TeleBirr, CBE Birr, bank transfer, or other.',
    'Triple-check the account number — a typo here means real payments won\'t reach you.',
    'Use Instructions to ask for a transfer reference (e.g. attendee name) if that\'s how you reconcile payments.',
  ]},
  { icon: ListChecks, title: 'Review & Submit', points: [
    'Walk down the Event Review checklist — anything marked "needs attention" is blocking submission.',
    'Recommended items (like Cover Image) won\'t block you, but fixing them before you submit helps turnout.',
    'After you submit, an admin reviews your event before it goes live — you\'ll be notified once it\'s approved.',
  ]},
]

/* ================================================================
   Helpers
   ================================================================ */

function emptyPaymentMethod(): PaymentMethod {
  return { method_type: 'telebirr', provider: '', account_name: '', account_number: '', instructions: '' }
}

function emptyTicketTier(): TicketTier {
  return {
    name: '', description: '', price: '', quantity_available: '',
    sale_start: new Date().toISOString().slice(0, 16), sale_end: '',
    max_per_order: '', max_group_size: '', color: '', benefits: [],
    visualMode: 'automatic', customColor: '', backgroundImageUrl: '',
    imageCrop: DEFAULT_IMAGE_CROP,
  }
}

function toUTCISOString(localDateTimeStr: string): string | null {
  if (!localDateTimeStr) return null
  return new Date(localDateTimeStr).toISOString()
}

function needsProvider(pm: PaymentMethod): boolean {
  return pm.method_type === 'bank_transfer' || pm.method_type === 'other'
}

/* ================================================================
   Shared UI primitives
   ================================================================ */

const cardStyle: React.CSSProperties = {
  background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 20,
}

const inputBase: React.CSSProperties = {
  width: '100%', padding: '10px 14px', fontSize: 14,
  border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none',
  color: '#111827', backgroundColor: '#fff', fontFamily: 'inherit',
}

function SectionCard({ id, icon: Icon, title, subtitle, badge, children }: {
  id?: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  subtitle?: string
  badge?: string
  children: React.ReactNode
}) {
  return (
    <section id={id} style={{ ...cardStyle, scrollMarginTop: 112 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
        <span style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 36, height: 36, borderRadius: 8, background: '#eef2ff', color: '#4f46e5',
          flexShrink: 0, marginTop: 2,
        }}>
          <Icon className="w-[18px] h-[18px]" />
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>{title}</h2>
            {badge && <span style={{ fontSize: 12, color: '#9ca3af' }}>({badge})</span>}
          </div>
          {subtitle && <p style={{ fontSize: 14, color: '#6b7280', marginTop: 2 }}>{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

function Field({ label, required, hint, error, children }: {
  label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 14, fontWeight: 500, color: '#1f2937' }}>
        {label}{required && <span style={{ color: '#e11d48' }}> *</span>}
      </label>
      {children}
      {error
        ? <span style={{ fontSize: 12, color: '#e11d48' }}>{error}</span>
        : hint ? <span style={{ fontSize: 12, color: '#9ca3af' }}>{hint}</span> : null}
    </div>
  )
}

/* ================================================================
   Sidebar components
   ================================================================ */

function EventPreview({ eventName, city, location, date, interests, coverImageUrl }: {
  eventName: string; city: string; location: string; date: string
  interests: string[]; coverImageUrl: string | null
}) {
  const d = date ? new Date(date) : null
  const month = d ? d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase() : '—'
  const day = d ? d.getDate() : '--'

  return (
    <div style={{ overflow: 'hidden', borderRadius: 12, border: '1px solid #e5e7eb', background: '#fff' }}>
      <div style={{ position: 'relative', height: 140, width: '100%', background: '#111827' }}>
        {coverImageUrl ? (
          <img src={coverImageUrl} alt="" style={{ height: '100%', width: '100%', objectFit: 'cover', opacity: 0.8 }} />
        ) : (
          <div style={{ height: '100%', width: '100%', background: 'linear-gradient(135deg, #312e81, #111827, #000)' }} />
        )}
        <div style={{
          position: 'absolute', left: 10, top: 10, width: 40,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          background: 'rgba(255,255,255,0.95)', borderRadius: 6, padding: '4px 0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <span style={{ fontSize: 9, fontWeight: 600, color: '#e11d48' }}>{month}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#111827', lineHeight: 1 }}>{day}</span>
        </div>
      </div>
      <div style={{ padding: 14 }}>
        <h4 style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {eventName || 'Event Name'}
        </h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12, color: '#6b7280' }}>
          <Clock size={13} />
          <span>{date ? new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 12, color: '#6b7280' }}>
          <MapPin size={13} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {location || 'Venue'}{city ? `, ${city}` : ''}
          </span>
        </div>
        {interests.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {interests.slice(0, 2).map(id => (
              <span key={id} style={{ background: '#f3f4f6', borderRadius: 99, padding: '2px 8px', fontSize: 11, fontWeight: 500, color: '#4b5563' }}>
                {id}
              </span>
            ))}
            {interests.length > 2 && (
              <span style={{ background: '#f3f4f6', borderRadius: 99, padding: '2px 8px', fontSize: 11, fontWeight: 500, color: '#4b5563' }}>
                +{interests.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function OrganizerTips() {
  return (
    <div style={{ ...cardStyle, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Lightbulb size={16} color="#4f46e5" />
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>Organizer Tips</h3>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {ORGANIZER_TIPS.map(tip => (
          <div key={tip.title} style={{ display: 'flex', gap: 12 }}>
            <span style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, borderRadius: 8, background: tip.bg, color: tip.fg,
              flexShrink: 0, marginTop: 1,
            }}>
              <tip.icon size={14} />
            </span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#1f2937', margin: 0 }}>{tip.title}</p>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '2px 0 0', lineHeight: 1.4 }}>{tip.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function NeedHelp({ onOpenGuide }: { onOpenGuide: () => void }) {
  return (
    <div style={{ borderRadius: 12, border: '1px solid #c7d2fe', background: 'rgba(238,242,255,0.6)', padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <HelpCircle size={16} color="#4f46e5" />
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>Need Help?</h3>
      </div>
      <p style={{ fontSize: 13, color: '#4b5563', margin: '0 0 12px', lineHeight: 1.5 }}>
        Check our{' '}
        <button type="button" onClick={onOpenGuide} style={{ fontWeight: 600, color: '#4f46e5', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}>
          Organizer Guide
        </button>{' '}
        or contact our{' '}
        <a href="#" style={{ fontWeight: 600, color: '#4f46e5' }}>support team</a>.
      </p>
      <button
        type="button"
        onClick={onOpenGuide}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff',
          padding: '8px 14px', fontSize: 12, fontWeight: 600, color: '#1f2937',
          cursor: 'pointer',
        }}
      >
        View Guide <ExternalLink size={14} />
      </button>
    </div>
  )
}

function ReviewChecklistItem({ status, title, message, href }: {
  status: 'complete' | 'attention' | 'optional'; title: string; message: string; href: string
}) {
  const isComplete = status === 'complete'
  const isOptional = status === 'optional'
  const iconColor = isComplete ? '#059669' : isOptional ? '#d1d5db' : '#f59e0b'

  return (
    <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
      {isComplete
        ? <CheckCircle2 size={18} color={iconColor} style={{ flexShrink: 0, marginTop: 1 }} />
        : isOptional
          ? <Circle size={18} color={iconColor} style={{ flexShrink: 0, marginTop: 1 }} />
          : <AlertCircle size={18} color={iconColor} style={{ flexShrink: 0, marginTop: 1 }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 500, color: '#111827', margin: 0 }}>{title}</p>
        {!isComplete && message && <p style={{ fontSize: 13, color: '#6b7280', margin: '2px 0 0', lineHeight: 1.4 }}>{message}</p>}
      </div>
      {!isComplete && (
        <a href={href} style={{
          display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600,
          color: '#4f46e5', textDecoration: 'none', flexShrink: 0, marginTop: 1,
        }}>
          Fix this <ArrowUpRight size={14} />
        </a>
      )}
    </li>
  )
}

function ReviewSection({ checklist, readyToSubmit }: {
  checklist: { id: string; required: boolean; status: 'complete' | 'attention' | 'optional'; title: string; message: string; href: string }[]
  readyToSubmit: boolean
}) {
  const requiredItems = checklist.filter(i => i.required)
  const optionalItems = checklist.filter(i => !i.required)
  const completeRequired = requiredItems.filter(i => i.status === 'complete').length

  return (
    <section id="section-review" style={{ ...cardStyle, scrollMarginTop: 112 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
        <span style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 36, height: 36, borderRadius: 8, background: '#eef2ff', color: '#4f46e5',
          flexShrink: 0, marginTop: 2,
        }}>
          <ListChecks size={18} />
        </span>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>Event Review</h2>
          <p style={{ fontSize: 14, color: '#6b7280', margin: '2px 0 0' }}>
            Fix anything flagged before you submit.
          </p>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: '#6b7280' }}>
            {completeRequired} of {requiredItems.length} required sections complete
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: readyToSubmit ? '#059669' : '#d97706' }}>
            {readyToSubmit ? 'Ready to submit' : 'Needs attention'}
          </span>
        </div>
        <div style={{ height: 6, width: '100%', background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 99, transition: 'width 0.3s',
            width: `${(completeRequired / requiredItems.length) * 100}%`,
            background: readyToSubmit ? '#059669' : '#4f46e5',
          }} />
        </div>
      </div>

      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {requiredItems.map(item => <ReviewChecklistItem key={item.id} {...item} />)}
      </ul>

      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', margin: '20px 0 8px' }}>
        Recommended
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {optionalItems.map(item => <ReviewChecklistItem key={item.id} {...item} />)}
      </ul>
    </section>
  )
}

function OrganizerGuideModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      role="dialog" aria-modal="true" aria-labelledby="guide-title"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)', padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          display: 'flex', flexDirection: 'column', width: '100%', maxWidth: 520,
          maxHeight: '85vh', borderRadius: 16, background: '#fff', overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '16px 24px', borderBottom: '1px solid #f3f4f6' }}>
          <div>
            <h2 id="guide-title" style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: 0 }}>Organizer Guide</h2>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>What each section is for, and how to fill it in well.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close guide"
            style={{ background: 'none', border: 'none', padding: 6, cursor: 'pointer', color: '#9ca3af', borderRadius: 6 }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {GUIDE_SECTIONS.map(section => (
              <div key={section.title} style={{ display: 'flex', gap: 12 }}>
                <span style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 32, height: 32, borderRadius: 8, background: '#eef2ff', color: '#4f46e5',
                  flexShrink: 0, marginTop: 2,
                }}>
                  <section.icon size={16} />
                </span>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>{section.title}</p>
                  <ul style={{ margin: '6px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {section.points.map(point => (
                      <li key={point} style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>
                        • {point}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: '12px 24px', borderTop: '1px solid #f3f4f6' }}>
          <button type="button" onClick={onClose}
            style={{
              padding: '10px 24px', borderRadius: 8, background: '#111827', color: '#fff',
              border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer',
            }}>
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}

function ProgressSteps({ currentStep }: { currentStep: number }) {
  return (
    <ol style={{ display: 'flex', alignItems: 'center', listStyle: 'none', padding: 0, margin: 0, gap: 0 }}>
      {STEP_SECTIONS.map(({ label, href }, i) => {
        const step = i + 1
        const state = step < currentStep ? 'done' : step === currentStep ? 'active' : 'upcoming'
        return (
          <li key={label} style={{ display: 'flex', alignItems: 'center', flex: step < STEP_SECTIONS.length ? 1 : 'none' }}>
            <a href={href} style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
              <span style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 24, height: 24, borderRadius: 99, fontSize: 12, fontWeight: 600,
                background: state === 'active' ? '#4f46e5' : state === 'done' ? '#e0e7ff' : '#f3f4f6',
                color: state === 'active' ? '#fff' : state === 'done' ? '#4f46e5' : '#9ca3af',
                flexShrink: 0,
              }}>
                {step}
              </span>
              <span className="create-event-progress-labels" style={{
                fontSize: 13, fontWeight: 500,
                color: state === 'active' ? '#4f46e5' : '#9ca3af',
              }}>
                {label}
              </span>
            </a>
            {step < STEP_SECTIONS.length && (
              <span style={{ flex: 1, height: 1, background: '#e5e7eb', margin: '0 12px' }} />
            )}
          </li>
        )
      })}
    </ol>
  )
}

/* ================================================================
   Mobile header
   ================================================================ */

function MobileHeader() {
  return (
    <div className="create-event-mobile-header">
      <button type="button" aria-label="Menu" style={{ background: 'none', border: 'none', padding: 6, cursor: 'pointer', color: '#111827' }}>
        <Menu size={22} />
      </button>
      <span style={{ fontSize: 16, fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ color: '#f59e0b' }}>★</span> Habesha Hub
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button type="button" aria-label="Notifications" style={{ background: 'none', border: 'none', padding: 6, cursor: 'pointer', color: '#111827', position: 'relative' }}>
          <Bell size={22} />
          <span style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: 99, background: '#ef4444' }} />
        </button>
        <div style={{ width: 32, height: 32, borderRadius: 99, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: '#4f46e5' }}>
          O
        </div>
      </div>
    </div>
  )
}

/* ================================================================
   Main page
   ================================================================ */

export default function CreateEventPage() {
  const [loading, setLoading] = useState(true)
  const [isOrganizer, setIsOrganizer] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [cityId, setCityId] = useState('')
  const [cities, setCities] = useState<{ id: string; name: string }[]>([])
  const [allInterests, setAllInterests] = useState<{ id: string; name: string }[]>([])
  const [selectedInterests, setSelectedInterests] = useState<Set<string>>(new Set())
  const [eventDate, setEventDate] = useState('')
  const [tiers, setTiers] = useState<TicketTier[]>([emptyTicketTier()])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([emptyPaymentMethod()])
  const [coverImage, setCoverImage] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [guideOpen, setGuideOpen] = useState(false)
  const [tipsExpanded, setTipsExpanded] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { userId, role, loading: authLoading } = useAuth()

  useEffect(() => {
    const checkAccess = async () => {
      requireRole('organizer', role, authLoading, (href) => router.replace(href))
      if (authLoading || role !== 'organizer') return
      setIsOrganizer(true)

      const { data: citiesData } = await supabase
        .from('cities')
        .select('id, name')
        .eq('is_active', true)
        .order('name', { ascending: true })
      setCities((citiesData ?? []) as { id: string; name: string }[])

      const { data: interestsData } = await supabase
        .from('interests')
        .select('id, name')
        .order('name', { ascending: true })
      setAllInterests((interestsData ?? []) as { id: string; name: string }[])

      setLoading(false)
    }
    checkAccess()
  }, [router, userId, role, authLoading])

  /* ---- Derived / computed ---- */

  const coverImageUrl = useMemo(() => coverImage ? URL.createObjectURL(coverImage) : null, [coverImage])

  const reviewChecklist = useMemo(() => {
    const basicsComplete = Boolean(title.trim() && description.trim() && location.trim() && cityId)
    const dateComplete = Boolean(eventDate)
    const ticketsComplete = tiers.length > 0 && tiers.every(t =>
      t.name && t.price.trim() !== '' && t.quantity_available.trim() !== '' && parseInt(t.quantity_available) > 0)
    const paymentsComplete = paymentMethods.length > 0 && paymentMethods.every(m =>
      m.method_type && m.account_name.trim() && m.account_number.trim())
    const coverImageComplete = Boolean(coverImage)
    const interestsComplete = selectedInterests.size > 0

    return [
      { id: 'basics', required: true, status: basicsComplete ? 'complete' as const : 'attention' as const, title: 'Event Basics', message: 'Add your event name, location, city, and description.', href: '#section-event-basics' },
      { id: 'date', required: true, status: dateComplete ? 'complete' as const : 'attention' as const, title: 'Event Date & Time', message: 'Set the event date.', href: '#section-event-date' },
      { id: 'tickets', required: true, status: ticketsComplete ? 'complete' as const : 'attention' as const, title: 'Tickets', message: 'Every ticket needs a name, price, and quantity.', href: '#section-tickets' },
      { id: 'payments', required: true, status: paymentsComplete ? 'complete' as const : 'attention' as const, title: 'Payment Methods', message: 'Add at least one complete payment method.', href: '#section-payment-methods' },
      { id: 'cover-image', required: false, status: coverImageComplete ? 'complete' as const : 'optional' as const, title: 'Cover Image', message: 'Events with a photo get more clicks.', href: '#section-cover-image' },
      { id: 'interests', required: false, status: interestsComplete ? 'complete' as const : 'optional' as const, title: 'Interests', message: 'Add a few categories to help with discovery.', href: '#section-interests' },
    ]
  }, [title, description, location, cityId, eventDate, tiers, paymentMethods, coverImage, selectedInterests])

  const readyToSubmit = reviewChecklist.filter(i => i.required).every(i => i.status === 'complete')

  const currentStep = useMemo(() => {
    if (!title.trim() || !description.trim() || !location.trim() || !cityId) return 1
    if (tiers.length === 0 || !tiers.every(t => t.name && t.price.trim() !== '' && t.quantity_available.trim() !== '')) return 2
    if (paymentMethods.length === 0 || !paymentMethods.every(m => m.method_type && m.account_name.trim() && m.account_number.trim())) return 3
    return 4
  }, [title, description, location, cityId, tiers, paymentMethods])

  /* ---- Builders ---- */

  const buildTierRows = (): TierRow[] =>
    tiers.map((t) => ({
      name: t.name.trim(),
      description: t.description.trim(),
      price: parseFloat(t.price),
      quantity_available: parseInt(t.quantity_available, 10),
      sale_start: toUTCISOString(t.sale_start),
      sale_end: toUTCISOString(t.sale_end),
      max_per_order: t.max_per_order ? parseInt(t.max_per_order, 10) : null,
      max_group_size: t.max_group_size ? parseInt(t.max_group_size, 10) : null,
      color: t.color.trim() || null,
      benefits: t.benefits.map((b) => b.trim()).filter((b) => b !== ''),
    }))

  const buildPaymentMethodRows = (): PaymentMethodRow[] =>
    paymentMethods.map((pm) => ({
      method_type: pm.method_type,
      provider: pm.provider.trim() || null,
      account_name: pm.account_name.trim(),
      account_number: pm.account_number.trim(),
      instructions: pm.instructions.trim() || null,
    }))

  /* ---- Submit handlers ---- */

  const handleCreateEvent = async (e: React.FormEvent, submitStatus: 'draft' | 'pending_review') => {
    e.preventDefault()
    setError('')

    const validationErrors = validateEvent({
      title, location, eventDate, tiers, paymentMethods,
    })
    if (validationErrors.length > 0) {
      setError(validationErrors.join(' '))
      return
    }

    const result = await createEvent({
      organizerId: userId!,
      title, description, location, cityId,
      eventDate: new Date(eventDate).toISOString(),
      status: submitStatus,
      tiers: buildTierRows(),
      paymentMethods: buildPaymentMethodRows(),
      interestIds: [...selectedInterests],
    })

    if (!result.ok) {
      setError(result.error)
      return
    }

    if (coverImage && result.data?.eventId) {
      const ext = imageExtensionForMime(coverImage.type)
      const path = `${userId}/${result.data.eventId}-cover.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('event-images')
        .upload(path, coverImage, { upsert: true })
      if (uploadErr) {
        setError('Image upload failed: ' + uploadErr.message)
        return
      }
      const { data: urlData } = supabase.storage
        .from('event-images')
        .getPublicUrl(path)
      await updateEventDetails(result.data.eventId, {
        title, description, location, cityId,
        eventDate: new Date(eventDate).toISOString(),
        interestIds: [...selectedInterests],
        imageUrl: urlData.publicUrl,
      })
    }

    router.push('/account')
  }

  /* ---- Early returns ---- */

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#6b7280', fontSize: 14 }}>Loading...</p>
      </div>
    )
  }
  if (!isOrganizer) return null

  /* ---- Render ---- */

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', color: '#111827' }}>
      <MobileHeader />
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 16px' }}>

        {/* Header + actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>Create Event</h1>
            <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Fill in the details to publish an amazing event.</p>
          </div>
          <div className="create-event-actions" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button type="button" onClick={(e) => handleCreateEvent(e, 'draft')}
              style={{
                padding: '10px 20px', borderRadius: 8, background: '#fff', color: '#374151',
                border: '1px solid #e5e7eb', fontWeight: 600, fontSize: 14, cursor: 'pointer',
              }}>
              Save as Draft
            </button>
            <button type="button" onClick={(e) => handleCreateEvent(e, 'pending_review')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 20px', borderRadius: 8, background: '#111827', color: '#fff',
                border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer',
              }}>
              Submit for Review <span aria-hidden>›</span>
            </button>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div style={{
            marginBottom: 24, padding: '12px 16px', borderRadius: 8,
            background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: 13,
          }}>
            {error}
          </div>
        )}

        {/* Progress */}
        <div style={{ ...cardStyle, marginBottom: 24, padding: '16px 20px' }}>
          <ProgressSteps currentStep={currentStep} />
        </div>

        {/* Content grid */}
        <div className="create-event-grid">

          {/* ---- Main column ---- */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Event Basics */}
            <SectionCard id="section-event-basics" icon={Calendar} title="Event Basics" subtitle="Tell people what your event is about.">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                <Field label="Event name" required hint="Keep it short and catchy">
                  <input style={inputBase} placeholder="e.g. Afro Beats Night" value={title} onChange={e => setTitle(e.target.value)} />
                </Field>
                <Field label="Location" required hint="Add the venue or area">
                  <input style={inputBase} placeholder="e.g. Millennium Hall, Addis Ababa" value={location} onChange={e => setLocation(e.target.value)} />
                </Field>
              </div>
              <div style={{ marginTop: 16, maxWidth: 400 }}>
                <Field label="City" required hint="Choose the city where it will take place">
                  <select style={{ ...inputBase, appearance: 'none' }} value={cityId} onChange={e => setCityId(e.target.value)}>
                    <option value="">Select city</option>
                    {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
              </div>
              <div style={{ marginTop: 16 }}>
                <Field label="Description" required hint="Be clear and exciting! People love details.">
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff' }}>
                    <div style={{ display: 'flex', gap: 2, padding: '6px 10px', borderBottom: '1px solid #f3f4f6' }}>
                      {[Bold, Italic, Underline, List, ListOrdered, Link].map((Icon, i) => (
                        <button key={i} type="button" tabIndex={-1}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: 32, height: 32, borderRadius: 6, border: 'none',
                            background: 'transparent', color: '#6b7280', cursor: 'pointer',
                          }}
                          onMouseDown={e => e.preventDefault()}>
                          <Icon size={16} />
                        </button>
                      ))}
                    </div>
                    <textarea
                      style={{ ...inputBase, border: 'none', borderRadius: 0, minHeight: 110, resize: 'vertical', padding: '12px 14px' }}
                      placeholder="Describe your event, what people can expect, highlights, special guests, etc."
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                    />
                  </div>
                </Field>
              </div>
            </SectionCard>

            {/* Interests */}
            <SectionCard id="section-interests" icon={Hash} title="Interests" badge="optional" subtitle="Help people discover your event.">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {allInterests.map(interest => {
                  const active = selectedInterests.has(interest.id)
                  return (
                    <button key={interest.id} type="button"
                      onClick={() => setSelectedInterests(prev => {
                        const next = new Set(prev)
                        if (next.has(interest.id)) next.delete(interest.id)
                        else next.add(interest.id)
                        return next
                      })}
                      style={{
                        padding: '6px 14px', borderRadius: 99, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                        border: `1px solid ${active ? '#818cf8' : '#e5e7eb'}`,
                        background: active ? '#eef2ff' : '#fff',
                        color: active ? '#4338ca' : '#4b5563',
                      }}>
                      {interest.name}
                    </button>
                  )
                })}
              </div>
            </SectionCard>

            {/* Cover Image */}
            <SectionCard id="section-cover-image" icon={ImageIcon} title="Cover Image" badge="optional" subtitle="This will be the main image for your event.">
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const file = e.dataTransfer.files?.[0]; if (file) setCoverImage(file) }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  border: '2px dashed #e5e7eb', borderRadius: 12, background: '#f9fafb',
                  padding: '40px 24px', textAlign: 'center', cursor: 'pointer',
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                {coverImage && coverImageUrl ? (
                  <div style={{ width: '100%', maxWidth: 400 }}>
                    <img src={coverImageUrl} alt="Cover preview" style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 8, marginBottom: 12 }} />
                    <button type="button" onClick={e => { e.stopPropagation(); setCoverImage(null) }}
                      style={{ background: 'none', border: 'none', color: '#e11d48', fontSize: 12, fontWeight: 500, cursor: 'pointer', textDecoration: 'underline' }}>
                      Remove image
                    </button>
                  </div>
                ) : (
                  <>
                    <UploadCloud size={24} color="#9ca3af" style={{ marginBottom: 8 }} />
                    <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 12px' }}>Drag and drop an image here</p>
                    <button type="button"
                      style={{
                        padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb',
                        background: '#fff', color: '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                      }}>
                      Choose File
                    </button>
                    <p style={{ fontSize: 11, color: '#9ca3af', margin: '12px 0 0' }}>
                      Recommended: 1200×630px (JPG, PNG, WebP) • Max 5 MB
                    </p>
                  </>
                )}
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    if (file.size > 5 * 1024 * 1024) { setError('Cover image must be under 5 MB.'); return }
                    const ext = imageExtensionForMime(file.type)
                    if (!ext) { setError('Cover image must be JPG, PNG, WebP, or HEIC.'); return }
                    setCoverImage(file); setError('')
                  }} />
              </div>
            </SectionCard>

            {/* Event Date */}
            <SectionCard id="section-event-date" icon={Calendar} title="Event Date" subtitle="When is your event?">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <Field label="Event Date" required>
                  <input type="datetime-local" style={inputBase} value={eventDate} onChange={e => setEventDate(e.target.value)} />
                </Field>
              </div>
              <div style={{
                marginTop: 16, display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '12px 16px', borderRadius: 8, background: 'rgba(238,242,255,0.7)',
              }}>
                <Info size={16} color="#4f46e5" style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 12, color: '#4338ca', margin: 0, lineHeight: 1.6 }}>
                  Make sure the date and time are correct. The event date you set ({eventDate ? new Date(eventDate).toLocaleString() : 'not set yet'}) is the latest possible sale end date for any ticket type below.
                </p>
              </div>
            </SectionCard>

            {/* Tickets */}
            <div id="section-tickets" style={{ scrollMarginTop: 112 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: 99, background: '#111827' }} />
                <h2 style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#111827', margin: 0 }}>Tickets</h2>
              </div>
              <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 16px' }}>Create ticket types for your event.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {tiers.map((tier, index) => (
                  <div key={index} style={{ ...cardStyle, padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>Ticket Type {index + 1}</h3>
                      {tiers.length > 1 && (
                        <button type="button" onClick={() => setTiers(prev => prev.filter((_, i) => i !== index))}
                          style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: 4 }}>
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                      <Field label="Ticket name" required hint="Choose or create a ticket type">
                        <select style={{ ...inputBase, appearance: 'none' }} value={tier.name}
                          onChange={e => {
                            const updated = [...tiers]; updated[index].name = e.target.value
                            if (e.target.value !== 'Jema (Group Ticket)') updated[index].max_group_size = ''
                            setTiers(updated)
                          }}>
                          <option value="" disabled>Select ticket type</option>
                          <option value="Early Bird">Early Bird</option>
                          <option value="VIP">VIP</option>
                          <option value="General Admission">General Admission</option>
                          <option value="Jema (Group Ticket)">Jema (Group Ticket)</option>
                          <option value="Backstage Pass">Backstage Pass</option>
                          <option value="Balcony/Standing">Balcony/Standing</option>
                        </select>
                      </Field>
                      <Field label="Price" required hint="Set the price in ETB">
                        <div style={{ display: 'flex', overflow: 'hidden', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                          <input type="number" step="0.01" min="0" placeholder="0.00" value={tier.price}
                            onChange={e => { const u = [...tiers]; u[index].price = e.target.value; setTiers(u) }}
                            style={{ ...inputBase, border: 'none', borderRadius: 0 }} />
                          <span style={{ display: 'flex', alignItems: 'center', padding: '0 12px', background: '#f9fafb', fontSize: 13, fontWeight: 500, color: '#6b7280' }}>ETB</span>
                        </div>
                      </Field>
                    </div>

                    <div style={{ marginTop: 16 }}>
                      <Field label="Description" hint="e.g. Includes front-row seating and complimentary drinks">
                        <textarea rows={2} placeholder="e.g. Includes front-row seating and complimentary drinks"
                          value={tier.description}
                          onChange={e => { const u = [...tiers]; u[index].description = e.target.value; setTiers(u) }}
                          style={{ ...inputBase, minHeight: 64, resize: 'vertical' }} />
                      </Field>
                    </div>

                    <div style={{ marginTop: 16 }}>
                      <Field label="Quantity" required hint="Number of tickets available">
                        <input type="number" min="1" placeholder="e.g. 100" value={tier.quantity_available}
                          onChange={e => { const u = [...tiers]; u[index].quantity_available = e.target.value; setTiers(u) }}
                          style={inputBase} />
                      </Field>
                    </div>

                    <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                      <Field label="Sale starts" hint="(optional)">
                        <input type="datetime-local" value={tier.sale_start}
                          onChange={e => { const u = [...tiers]; u[index].sale_start = e.target.value; setTiers(u) }}
                          style={inputBase} />
                      </Field>
                      <Field label="Sale ends" hint="(optional)">
                        <input type="datetime-local" value={tier.sale_end} max={eventDate || undefined}
                          onChange={e => { const u = [...tiers]; u[index].sale_end = e.target.value; setTiers(u) }}
                          style={inputBase} />
                      </Field>
                    </div>

                    <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                      <Field label="Max per order" hint="Maximum tickets per person (optional)">
                        <input type="number" min="1" placeholder="e.g. 4" value={tier.max_per_order}
                          onChange={e => { const u = [...tiers]; u[index].max_per_order = e.target.value; setTiers(u) }}
                          style={{ ...inputBase, maxWidth: 200 }} />
                      </Field>
                      {tier.name === 'Jema (Group Ticket)' && (
                        <Field label="Max group size" required hint="e.g. 10">
                          <input type="number" min="2" placeholder="e.g. 10" value={tier.max_group_size}
                            onChange={e => { const u = [...tiers]; u[index].max_group_size = e.target.value; setTiers(u) }}
                            style={inputBase} />
                        </Field>
                      )}
                    </div>

                    <div style={{ marginTop: 20 }}>
                      <TicketAppearanceSelector
                        tierName={tier.name} visualMode={tier.visualMode} customColor={tier.customColor}
                        backgroundImageUrl={tier.backgroundImageUrl} imageCrop={tier.imageCrop}
                        onModeChange={mode => { const u = [...tiers]; u[index].visualMode = mode; setTiers(u) }}
                        onCustomColorChange={color => { const u = [...tiers]; u[index].customColor = color; setTiers(u) }}
                        onBackgroundImageChange={url => { const u = [...tiers]; u[index].backgroundImageUrl = url; setTiers(u) }}
                        onImageCropChange={crop => { const u = [...tiers]; u[index].imageCrop = crop; setTiers(u) }}
                      />
                    </div>

                    <div style={{ marginTop: 16 }}>
                      <TicketPreview
                        tierName={tier.name} visualMode={tier.visualMode} customColor={tier.customColor}
                        backgroundImageUrl={tier.backgroundImageUrl} imageCrop={tier.imageCrop}
                        eventName={title} eventDate={eventDate} eventLocation={location}
                        quantity={tier.quantity_available ? parseInt(tier.quantity_available, 10) || undefined : undefined}
                        admissionCount={tier.name === 'Jema (Group Ticket)' ? (parseInt(tier.max_group_size, 10) || 1) : 1}
                        price={tier.price ? `ETB ${parseFloat(tier.price).toFixed(2)}` : undefined}
                      />
                    </div>

                    <div style={{ marginTop: 16 }}>
                      <span style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 500, color: '#374151' }}>Benefits (optional)</span>
                      {tier.benefits.map((benefit, bIndex) => (
                        <div key={bIndex} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                          <input type="text" placeholder="e.g. Front-row seating" value={benefit}
                            onChange={e => { const u = [...tiers]; u[index].benefits[bIndex] = e.target.value; setTiers(u) }}
                            style={{ ...inputBase, flex: 1 }} />
                          <button type="button" onClick={() => { const u = [...tiers]; u[index].benefits = u[index].benefits.filter((_, i) => i !== bIndex); setTiers(u) }}
                            style={{ background: 'none', border: 'none', color: '#e11d48', cursor: 'pointer', fontSize: 12, flexShrink: 0 }}>
                            Remove
                          </button>
                        </div>
                      ))}
                      <button type="button" onClick={() => { const u = [...tiers]; u[index].benefits = [...u[index].benefits, '']; setTiers(u) }}
                        style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: 13, fontWeight: 500, padding: 0, marginTop: 4 }}>
                        + Add benefit
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button type="button" onClick={() => setTiers(prev => [...prev, emptyTicketTier()])}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, marginTop: 16,
                  background: 'none', border: 'none', color: '#4f46e5', fontWeight: 600, fontSize: 13,
                  cursor: 'pointer', padding: 0,
                }}>
                <Plus size={16} /> Add another ticket type
              </button>
            </div>

            {/* Payment Methods */}
            <div id="section-payment-methods" style={{ scrollMarginTop: 112 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: 99, background: '#111827' }} />
                <h2 style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#111827', margin: 0 }}>Payment Methods</h2>
              </div>
              <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 16px' }}>Add payment options for attendees.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {paymentMethods.map((pm, index) => (
                  <div key={index} style={{ ...cardStyle, padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>Payment Method {index + 1}</h3>
                      {index > 0 && (
                        <button type="button" onClick={() => setPaymentMethods(prev => prev.filter((_, i) => i !== index))}
                          style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: 4 }}>
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                      <Field label="Method type" required>
                        <select style={{ ...inputBase, appearance: 'none' }} value={pm.method_type}
                          onChange={e => { const u = [...paymentMethods]; u[index].method_type = e.target.value; setPaymentMethods(u) }}>
                          <option value="telebirr">TeleBirr</option>
                          <option value="cbe_birr">CBE Birr</option>
                          <option value="bank_transfer">Bank Transfer</option>
                          <option value="other">Other</option>
                        </select>
                      </Field>
                      <Field label="Provider / Bank name" hint={needsProvider(pm) ? undefined : '(optional)'} error={needsProvider(pm) && pm.provider.trim() === '' ? 'Required for this payment method' : undefined}>
                        <input type="text" placeholder="e.g. Dashen Bank" value={pm.provider}
                          onChange={e => { const u = [...paymentMethods]; u[index].provider = e.target.value; setPaymentMethods(u) }}
                          style={inputBase} />
                      </Field>
                      <Field label="Account name" required>
                        <input type="text" placeholder="Account holder name" value={pm.account_name}
                          onChange={e => { const u = [...paymentMethods]; u[index].account_name = e.target.value; setPaymentMethods(u) }}
                          style={inputBase} />
                      </Field>
                      <Field label="Account number" required>
                        <input type="text" placeholder="Account or phone number" value={pm.account_number}
                          onChange={e => { const u = [...paymentMethods]; u[index].account_number = e.target.value; setPaymentMethods(u) }}
                          style={inputBase} />
                      </Field>
                    </div>

                    <div style={{ marginTop: 16 }}>
                      <Field label="Instructions" hint="(optional)">
                        <input type="text" placeholder="e.g. Please include your name in the transfer reference" value={pm.instructions}
                          onChange={e => { const u = [...paymentMethods]; u[index].instructions = e.target.value; setPaymentMethods(u) }}
                          style={inputBase} />
                      </Field>
                    </div>
                  </div>
                ))}
              </div>

              <button type="button" onClick={() => setPaymentMethods(prev => [...prev, emptyPaymentMethod()])}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, marginTop: 16,
                  background: 'none', border: 'none', color: '#4f46e5', fontWeight: 600, fontSize: 13,
                  cursor: 'pointer', padding: 0,
                }}>
                <Plus size={16} /> Add another payment method
              </button>
            </div>

          </div>

          {/* ---- Sidebar ---- */}
          <aside className="create-event-sidebar">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <ShieldCheck size={16} color="#4f46e5" />
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>Event Preview</h3>
                  <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>This is how your event will appear to others.</p>
                </div>
              </div>
              <EventPreview
                eventName={title} city={cities.find(c => c.id === cityId)?.name ?? ''}
                location={location} date={eventDate}
                interests={[...selectedInterests].map(id => allInterests.find(i => i.id === id)?.name ?? id)}
                coverImageUrl={coverImageUrl}
              />
            </div>

            <div>
              <button type="button" className="create-event-tip-toggle"
                onClick={() => setTipsExpanded(prev => !prev)}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Lightbulb size={16} color="#4f46e5" />
                  Organizer Tips
                </span>
                <ChevronDown size={18} style={{ color: '#9ca3af', transform: tipsExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
              </button>
              <div className={`create-event-tips-wrapper${tipsExpanded ? ' expanded' : ''}`}>
                <OrganizerTips />
              </div>
            </div>
            <ReviewSection checklist={reviewChecklist} readyToSubmit={readyToSubmit} />
            <NeedHelp onOpenGuide={() => setGuideOpen(true)} />
          </aside>

        </div>
      </main>

      <OrganizerGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
    </div>
  )
}
