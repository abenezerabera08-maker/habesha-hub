'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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

  if (loading) return <p>Loading...</p>

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', padding: '24px 16px' }}>
      {/* Back link */}
      <Link
        href="/account"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', color: '#555', fontSize: 14, marginBottom: 20 }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Back
      </Link>

      <h1 style={{ fontSize: 26, margin: '0 0 8px' }}>What are you into?</h1>
      <p style={{ color: '#888', fontSize: 14, margin: '0 0 24px' }}>
        Pick a few &mdash; we&rsquo;ll use this to recommend events and tell you when something matches.
      </p>

      {error && <p style={{ color: 'red', marginBottom: 12 }}>{error}</p>}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {allInterests.map((interest) => {
          const isSelected = selected.has(interest.id)
          return (
            <button
              key={interest.id}
              onClick={() => toggle(interest.id)}
              style={{
                padding: '8px 18px',
                borderRadius: 20,
                border: '1px solid',
                borderColor: isSelected ? '#171717' : '#ccc',
                background: isSelected ? '#171717' : '#fff',
                color: isSelected ? '#fff' : '#171717',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {interest.name}
            </button>
          )
        })}
      </div>

      <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '10px 28px',
            borderRadius: 8,
            border: 'none',
            background: '#171717',
            color: '#fff',
            fontSize: 15,
            cursor: saving ? 'not-allowed' : 'pointer',
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
