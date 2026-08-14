'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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

  if (loading) return <p>Loading...</p>

  return (
    <div style={{ maxWidth: 400, margin: '80px auto' }}>
      <h1>Complete your profile</h1>
      <form onSubmit={handleSubmit} style={{ marginTop: 24 }}>
        <input
          id="full-name-input"
          type="text"
          placeholder="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          style={{ display: 'block', width: '100%', marginBottom: 12, padding: 8 }}
        />
        <select
          id="location-select"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          required
          style={{ display: 'block', width: '100%', marginBottom: 12, padding: 8 }}
        >
          <option value="" disabled>Select a city</option>
          {cities.map((city) => (
            <option key={city.id} value={city.id}>{city.name}</option>
          ))}
        </select>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" style={{ padding: '8px 16px' }}>Continue</button>
      </form>
    </div>
  )
}
