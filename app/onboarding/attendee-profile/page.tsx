'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ArrowRight, User, MapPin } from 'lucide-react'

const LOGO = '/logo.png'

type City = {
  id: string
  name: string
}

export default function AttendeeProfilePage() {
  const [fullName, setFullName] = useState('')
  const [location, setLocation] = useState('')
  const [cities, setCities] = useState<City[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const { data: citiesData } = await supabase
        .from('cities')
        .select('id, name')
        .eq('is_active', true)
        .order('name', { ascending: true })

      setCities((citiesData ?? []) as City[])
      setLoading(false)
    }
    init()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setError('You must be signed in to complete your profile.')
      return
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ full_name: fullName, location })
      .eq('id', session.user.id)
      .select('id')
      .single()

    if (updateError) {
      setError(
        updateError.message.includes('JSON object requested')
          ? 'Your profile could not be updated. Please try signing out and in again.'
          : updateError.message
      )
      return
    }

    router.push('/account/interests')
  }

  if (loading) {
    return (
      <div className="onboarding-page">
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: '100vh', color: '#78716C', fontSize: 14,
        }}>
          <div style={{
            width: 24, height: 24, border: '2.5px solid #292929',
            borderTopColor: '#FFB000', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', marginRight: 10,
          }} />
          Loading…
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <div className="onboarding-page">
      {/* Ambient glow layers */}
      <div className="onboarding-glow onboarding-glow-warm" />
      <div className="onboarding-glow onboarding-glow-pink" />

      {/* Content card */}
      <div className="onboarding-card">
        {/* Logo */}
        <img src={LOGO} alt="Habesha Hub" style={{ height: 32, width: 'auto', marginBottom: 28 }} />

        {/* Heading */}
        <h1 style={{
          fontSize: 22, fontWeight: 700, color: '#F5F5F5',
          margin: '0 0 6px', letterSpacing: '-0.01em',
        }}>
          Complete your profile
        </h1>
        <p style={{
          fontSize: 14, color: '#78716C', margin: '0 0 28px', lineHeight: 1.5,
        }}>
          Tell us a little about yourself so we can personalize your experience.
        </p>

        {/* Error */}
        {error && (
          <div style={{
            marginBottom: 16, padding: '10px 14px', borderRadius: 10,
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
            color: '#fca5a5', fontSize: 13,
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Name field */}
          <div style={{ marginBottom: 16 }}>
            <label
              htmlFor="full-name-input"
              style={{
                display: 'block', fontSize: 13, fontWeight: 500,
                color: '#A8A29E', marginBottom: 6,
              }}
            >
              Name
            </label>
            <div style={{ position: 'relative' }}>
              <User
                size={18} color="#57534E"
                style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                id="full-name-input"
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="onboarding-input"
                style={{ paddingLeft: 44 }}
              />
            </div>
          </div>

          {/* City field */}
          <div style={{ marginBottom: 24 }}>
            <label
              htmlFor="location-select"
              style={{
                display: 'block', fontSize: 13, fontWeight: 500,
                color: '#A8A29E', marginBottom: 6,
              }}
            >
              City
            </label>
            <div style={{ position: 'relative' }}>
              <MapPin
                size={18} color="#57534E"
                style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
              />
              <select
                id="location-select"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                className="onboarding-input onboarding-select"
                style={{ paddingLeft: 44, color: location ? '#F5F5F5' : '#57534E' }}
              >
                <option value="" disabled>Select a city</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>{city.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Continue button */}
          <button
            type="submit"
            className="onboarding-cta"
          >
            Continue <ArrowRight size={18} />
          </button>
        </form>
      </div>

      {/* Footer */}
      <div className="onboarding-footer">
        <span style={{ fontSize: 12, color: '#57534E' }}>
          Habesha Hub
        </span>
      </div>
    </div>
  )
}
