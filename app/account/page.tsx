'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import LogoutButton from '@/app/components/LogoutButton'

type Profile = {
  displayName: string
  email: string
  initials: string
}

function deriveInitials(name: string, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/)
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

function deriveDisplayName(name: string | null, email: string): string {
  return name || email || 'User'
}

export default function AccountPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [cities, setCities] = useState<{ id: string; name: string }[]>([])
  const [showCityPicker, setShowCityPicker] = useState(false)
  const [savingCity, setSavingCity] = useState(false)
  const [currentCityName, setCurrentCityName] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const email = session.user.email ?? ''

      const { data: profileRow } = await supabase
        .from('profiles')
        .select('full_name, name, location')
        .eq('id', session.user.id)
        .single()

      const name = profileRow?.full_name ?? profileRow?.name ?? null

      const { data: citiesData } = await supabase
        .from('cities')
        .select('id, name')
        .eq('is_active', true)
        .order('name', { ascending: true })
      setCities((citiesData ?? []) as { id: string; name: string }[])

      let cityName: string | null = null
      if (profileRow?.location) {
        const { data: cityRow } = await supabase
          .from('cities')
          .select('name')
          .eq('id', profileRow.location)
          .maybeSingle()
        cityName = cityRow?.name ?? null
      }
      setCurrentCityName(cityName)

      setProfile({
        displayName: deriveDisplayName(name, email),
        email,
        initials: deriveInitials(name ?? email, email),
      })
      setLoading(false)
    }

    load()
  }, [router])

  if (loading) return <p>Loading...</p>

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 28 }}>Account</h1>
      </div>

      {/* Profile Card */}
      <div style={{ border: '1px solid #ddd', borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: '#171717',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {profile!.initials}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 18 }}>{profile!.displayName}</div>
            <div style={{ color: '#888', fontSize: 14, marginTop: 2 }}>0 events attended</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
          <div style={{ fontSize: 14 }}><strong>0</strong> <span style={{ color: '#888' }}>Following</span></div>
          <div style={{ fontSize: 14 }}><strong>0</strong> <span style={{ color: '#888' }}>Followers</span></div>
        </div>

        <button
          onClick={() => setShowCityPicker((prev) => !prev)}
          style={{
            padding: '6px 16px',
            borderRadius: 20,
            border: '1px solid #ccc',
            background: '#fff',
            cursor: 'pointer',
            fontSize: 13,
            color: '#555',
          }}
        >
          {currentCityName ?? '+ Add a location'}
        </button>

        {showCityPicker && (
          <select
            onChange={async (e) => {
              const cityId = e.target.value
              if (!cityId) return
              setSavingCity(true)
              const { data: { session } } = await supabase.auth.getSession()
              if (session) {
                await supabase.from('profiles').update({ location: cityId }).eq('id', session.user.id)
                const chosen = cities.find(c => c.id === cityId)
                setCurrentCityName(chosen?.name ?? null)
              }
              setSavingCity(false)
              setShowCityPicker(false)
            }}
            disabled={savingCity}
            style={{ display: 'block', marginTop: 8, padding: 8, border: '1px solid #ccc', borderRadius: 8, background: '#fff', fontSize: 13, width: '100%', maxWidth: 260 }}
          >
            <option value="">Select a city</option>
            {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </div>

      {/* Interests Banner */}
      <div
        style={{
          background: '#2563eb',
          borderRadius: 12,
          padding: 20,
          marginBottom: 24,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff" stroke="none" style={{ flexShrink: 0, marginTop: 2 }}>
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        <div style={{ color: '#fff', fontSize: 14, lineHeight: 1.5 }}>
          Tell us what you love. Get event recommendations based on your interests.{' '}
          <Link href="/account/interests" style={{ color: '#fff', textDecoration: 'underline', fontWeight: 600 }}>
            Add interests
          </Link>
        </div>
      </div>

      {/* Preferences */}
      <h2 style={{ fontSize: 18, margin: '0 0 12px' }}>Preferences</h2>
      <div style={{ border: '1px solid #ddd', borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
        <PrefRow icon={<StarIcon />} label="Interests" href="/account/interests" />
      </div>

      {/* Host an Event */}
      <button
        onClick={async () => {
          const { data: { session } } = await supabase.auth.getSession()
          if (!session) {
            router.push('/choose-role')
          } else {
            router.push('/create-event')
          }
        }}
        style={{
          width: '100%',
          padding: '12px 20px',
          borderRadius: 8,
          border: 'none',
          background: '#171717',
          color: '#fff',
          fontSize: 15,
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: 16,
        }}
      >
        Host an Event
      </button>

      <Link
        href="/my-events"
        style={{
          display: 'block',
          width: '100%',
          padding: '12px 20px',
          borderRadius: 8,
          border: '1px solid #ddd',
          background: '#fff',
          color: '#171717',
          fontSize: 15,
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: 16,
          textAlign: 'center',
          textDecoration: 'none',
        }}
      >
        My Events
      </Link>

      {/* Logout */}
      <LogoutButton />
    </div>
  )
}

function PrefRow({ icon, label, href }: { icon: React.ReactNode; label: string; href: string }) {
  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 16px',
        textDecoration: 'none',
        color: 'inherit',
        borderBottom: '1px solid #eee',
      }}
    >
      <span style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>{icon}</span>
      <span style={{ flex: 1, fontSize: 15 }}>{label}</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </Link>
  )
}

function StarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}
