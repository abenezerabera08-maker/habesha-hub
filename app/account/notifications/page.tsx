'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  NOTIFICATION_CATEGORIES,
  CATEGORY_META,
  EMAIL_CATEGORY_META,
  type NotificationCategory,
} from '@/lib/types/notifications'

type ChannelState = { inApp: boolean; email: boolean }
type PreferenceState = Record<NotificationCategory, ChannelState>

const INITIAL_STATE: PreferenceState = {
  event_reminder: { inApp: true, email: true },
  ticket_activity: { inApp: true, email: false },
  payments: { inApp: true, email: true },
  event_changes: { inApp: true, email: true },
  organizer_activity: { inApp: true, email: true },
}

function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean
  onChange: () => void
  disabled?: boolean
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      disabled={disabled}
      style={{
        width: 40,
        height: 22,
        borderRadius: 11,
        border: 'none',
        padding: 2,
        cursor: disabled ? 'not-allowed' : 'pointer',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: checked ? 'flex-end' : 'flex-start',
        background: checked ? '#22C55E' : '#D6D3D1',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 0.2s',
      }}
    >
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
          display: 'block',
        }}
      />
    </button>
  )
}

export default function NotificationPreferencesPage() {
  const router = useRouter()
  const [prefs, setPrefs] = useState<PreferenceState>(INITIAL_STATE)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const res = await fetch('/api/notifications/preferences')
      const json = await res.json()

      if (json.ok && Array.isArray(json.data)) {
        const loaded = { ...INITIAL_STATE }
        for (const row of json.data) {
          if (row.category in loaded) {
            loaded[row.category as NotificationCategory] = {
              inApp: row.in_app_enabled ?? row.enabled ?? true,
              email: row.email_enabled ?? true,
            }
          }
        }
        setPrefs(loaded)
      }

      setLoading(false)
    }

    load()
  }, [router])

  const toggleInApp = useCallback((category: NotificationCategory) => {
    setSaved(false)
    setPrefs((prev) => ({
      ...prev,
      [category]: { ...prev[category], inApp: !prev[category].inApp },
    }))
  }, [])

  const toggleEmail = useCallback((category: NotificationCategory) => {
    setSaved(false)
    setPrefs((prev) => ({
      ...prev,
      [category]: { ...prev[category], email: !prev[category].email },
    }))
  }, [])

  const handleSave = async () => {
    setError('')
    setSaving(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const preferences = NOTIFICATION_CATEGORIES.map((cat) => ({
      category: cat,
      inAppEnabled: prefs[cat].inApp,
      emailEnabled: prefs[cat].email,
    }))

    const res = await fetch('/api/notifications/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferences }),
    })

    const json = await res.json()

    if (!json.ok) {
      setError(json.error || 'Failed to save preferences.')
      setSaving(false)
      return
    }

    setSaving(false)
    setSaved(true)
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 500, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
          <Link
            href="/account"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', color: '#555', fontSize: 14 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back
          </Link>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} style={{ height: 96, borderRadius: 12, background: '#F5F5F4' }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', padding: '24px 16px' }}>
      {/* Back link */}
      <div style={{ marginBottom: 24 }}>
        <Link
          href="/account"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', color: '#555', fontSize: 14 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back
        </Link>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C1917', margin: '0 0 4px' }}>
        Notifications
      </h1>
      <p style={{ fontSize: 14, color: '#78716C', margin: '0 0 24px' }}>
        Choose which updates you want to receive, and how.
      </p>

      {error && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 10,
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          marginBottom: 16,
        }}>
          <p style={{ fontSize: 13, color: '#DC2626', margin: 0 }}>{error}</p>
        </div>
      )}

      {/* Channel legend */}
      <div style={{
        display: 'flex',
        gap: 16,
        marginBottom: 16,
        padding: '8px 0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#78716C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span style={{ fontSize: 12, color: '#78716C' }}>In-app</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#78716C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
          <span style={{ fontSize: 12, color: '#78716C' }}>Email</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {NOTIFICATION_CATEGORIES.map((category) => {
          const meta = CATEGORY_META[category]
          const emailMeta = EMAIL_CATEGORY_META[category]
          const channel = prefs[category]

          return (
            <div
              key={category}
              style={{
                borderRadius: 14,
                border: '1px solid #F5F5F4',
                background: '#fff',
                padding: '16px',
              }}
            >
              {/* Category header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#1C1917', margin: 0 }}>
                    {meta.label}
                  </p>
                  <p style={{ fontSize: 12, color: '#78716C', margin: '2px 0 0', lineHeight: 1.4 }}>
                    {meta.description}
                  </p>
                </div>
              </div>

              {/* Channel toggles */}
              <div style={{ display: 'flex', gap: 16, paddingLeft: 50 }}>
                {/* In-app toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Toggle
                    checked={channel.inApp}
                    onChange={() => toggleInApp(category)}
                    label={`${meta.label} in-app: ${channel.inApp ? 'enabled' : 'disabled'}`}
                  />
                  <span style={{ fontSize: 12, color: '#78716C' }}>In-app</span>
                </div>

                {/* Email toggle */}
                {emailMeta.emailSupported ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Toggle
                      checked={channel.email}
                      onChange={() => toggleEmail(category)}
                      label={`${meta.label} email: ${channel.email ? 'enabled' : 'disabled'}`}
                    />
                    <span style={{ fontSize: 12, color: '#78716C' }}>Email</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 40,
                      height: 22,
                      borderRadius: 11,
                      background: '#E7E5E4',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <span style={{ fontSize: 10, color: '#A8A29E' }}>N/A</span>
                    </div>
                    <span style={{ fontSize: 12, color: '#A8A29E' }}>Email not available</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Save button */}
      <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '10px 28px',
            borderRadius: 8,
            border: 'none',
            background: '#1C1917',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? 'Saving\u2026' : 'Save preferences'}
        </button>

        {saved && (
          <span style={{ color: '#16a34a', fontSize: 14, fontWeight: 500 }}>
            Saved!
          </span>
        )}
      </div>
    </div>
  )
}
