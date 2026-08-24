'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Heart } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Interest = {
  id: string
  name: string
}

export default function InterestsPage() {
  const [allInterests, setAllInterests] = useState<Interest[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const [interestsRes, userInterestsRes] = await Promise.all([
        supabase.from('interests').select('id, name').order('name'),
        supabase.from('user_interests').select('interest_id').eq('user_id', session.user.id),
      ])

      if (interestsRes.error) {
        setError('Failed to load interests.')
        setLoading(false)
        return
      }

      setAllInterests(interestsRes.data as Interest[])

      if (userInterestsRes.data) {
        const preselected = new Set(
          (userInterestsRes.data as { interest_id: string }[]).map((r) => r.interest_id)
        )
        setSelected(preselected)
      }

      setLoading(false)
    }

    load()
  }, [router])

  const toggle = useCallback((id: string) => {
    setSaved(false)
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleSave = async () => {
    setError('')
    setSaving(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { error: deleteError } = await supabase
      .from('user_interests')
      .delete()
      .eq('user_id', session.user.id)

    if (deleteError) {
      setError('Failed to save interests.')
      setSaving(false)
      return
    }

    if (selected.size > 0) {
      const { error: insertError } = await supabase.from('user_interests').insert(
        [...selected].map((interest_id) => ({ user_id: session.user.id, interest_id }))
      )
      if (insertError) {
        setError('Failed to save interests.')
        setSaving(false)
        return
      }
    }

    setSaving(false)
    setSaved(true)

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    router.push(profile?.role === 'organizer' ? '/dashboard' : '/')
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 500, margin: '0 auto', padding: '24px 16px 96px' }}>
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
        <div style={{ height: 28, width: 180, borderRadius: 6, background: '#F5F5F4', marginBottom: 8 }} />
        <div style={{ height: 16, width: 280, borderRadius: 6, background: '#F5F5F4', marginBottom: 28 }} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
            <div key={i} style={{ height: 40, width: 100 + (i % 3) * 20, borderRadius: 20, background: '#F5F5F4' }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', padding: '24px 16px 96px' }}>
      {/* Back link */}
      <div style={{ marginBottom: 32 }}>
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

      {/* Header section */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(245,158,11,0.1)',
              border: '1px solid rgba(245,158,11,0.25)',
              flexShrink: 0,
            }}
          >
            <Heart size={18} color="#F59E0B" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C1917', margin: 0 }}>
            What are you into?
          </h1>
        </div>
        <p style={{ color: '#78716C', fontSize: 14, margin: 0, lineHeight: 1.5 }}>
          Pick a few &mdash; we&rsquo;ll use this to recommend events and tell you when something matches.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 10,
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            marginBottom: 16,
          }}
        >
          <p style={{ fontSize: 13, color: '#DC2626', margin: 0 }}>{error}</p>
        </div>
      )}

      {/* Interest chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {allInterests.map((interest) => {
          const isSelected = selected.has(interest.id)
          return (
            <button
              key={interest.id}
              type="button"
              onClick={() => toggle(interest.id)}
              style={{
                flexShrink: 0,
                whiteSpace: 'nowrap',
                borderRadius: 20,
                padding: '10px 20px',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background-color 0.15s, color 0.15s, border-color 0.15s, box-shadow 0.15s',
                border: isSelected ? '1px solid #F59E0B' : '1px solid #E7E5E4',
                background: isSelected ? '#F59E0B' : '#fff',
                color: isSelected ? '#fff' : '#57534E',
                minHeight: 44,
                boxShadow: isSelected ? '0 2px 8px rgba(245,158,11,0.2)' : 'none',
              }}
            >
              {interest.name}
            </button>
          )
        })}
      </div>

      {/* Save section */}
      <div style={{ marginTop: 36, display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '12px 28px',
            borderRadius: 10,
            border: 'none',
            background: '#1C1917',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.6 : 1,
            minHeight: 44,
            fontFamily: 'inherit',
            transition: 'opacity 0.15s',
          }}
        >
          {saving ? 'Saving\u2026' : 'Save interests'}
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
