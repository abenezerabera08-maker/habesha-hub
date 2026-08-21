import { useEffect } from 'react'
import {
  Lightbulb, HelpCircle, ExternalLink, CheckCircle2, AlertCircle, Circle,
  ArrowUpRight, ListChecks, Clock, MapPin,
  Sparkles, Camera, Ticket, Wallet, Calendar,
} from 'lucide-react'

const cardStyle = {
  background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 20,
}

const ORGANIZER_TIPS = [
  { icon: Sparkles, bg: '#eef2ff', fg: '#4f46e5', title: 'Be clear & detailed', body: 'Add all the important info so people know what to expect.' },
  { icon: Camera, bg: '#ecfdf5', fg: '#059669', title: 'Great images attract more', body: 'Use high-quality images for better engagement.' },
  { icon: Ticket, bg: '#fef2f2', fg: '#ef4444', title: 'Ticket types', body: 'Create multiple ticket options to suit different audiences.' },
  { icon: ListChecks, bg: '#fffbeb', fg: '#f59e0b', title: 'Review before submitting', body: 'Double-check everything before sending for review.' },
]

export function EventPreviewCard({ eventName, city, location, date, interests, coverImageUrl }: {
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

export function OrganizerTips() {
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

export function NeedHelp({ onOpenGuide }: { onOpenGuide: () => void }) {
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

type ChecklistItem = {
  id: string; required: boolean
  status: 'complete' | 'attention' | 'optional'
  title: string; message: string; href: string
}

export function ReviewSection({ checklist, readyToSubmit }: {
  checklist: ChecklistItem[]
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

const GUIDE_SECTIONS = [
  { icon: Calendar, title: 'Event Basics', points: [
    'Use a specific, searchable name — "Afro Beats Night: Live at Ghion Gardens" outperforms "Music Event."',
    'For Location, include the venue name and neighborhood so attendees can find it without guessing.',
    'Pick the correct City — this is what Discover uses to show your event to people nearby.',
    'In Description, cover what it is, who it\'s for, and any highlights (guests, lineup, dress code).',
  ]},
  { icon: Ticket, title: 'Interests', points: [
    'Optional, but pick 2–4 relevant categories — this is what powers Discover recommendations.',
    'Choosing too many unrelated categories can make your event show up for the wrong audience.',
  ]},
  { icon: Camera, title: 'Cover Image', points: [
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

export function OrganizerGuideModal({ open, onClose }: { open: boolean; onClose: () => void }) {
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
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
