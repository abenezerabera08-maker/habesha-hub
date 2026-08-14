'use client'

import { Suspense, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'

function SignUpForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [confirmationSent, setConfirmationSent] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const roleParam = searchParams.get('role')
  const role = roleParam === 'attendee' || roleParam === 'organizer' ? roleParam : 'attendee'

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const { data, error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setError(error.message)
      return
    }

    if (data.user?.identities?.length === 0) {
      setConfirmationSent(true)
    } else if (data.user && data.session) {
      const res = await fetch('/api/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: data.session.access_token, role: role === 'organizer' ? 'organizer' : 'customer' }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setError(body?.error ?? 'Could not set your account role. Please try again.')
        return
      }

      router.push(role === 'organizer' ? '/onboarding/organizer-profile' : '/onboarding/attendee-profile')
    } else if (data.user) {
      router.push(role === 'organizer' ? '/onboarding/organizer-profile' : '/onboarding/attendee-profile')
    }
  }

  if (confirmationSent) {
    return (
      <div style={{ maxWidth: 320, margin: '80px auto', textAlign: 'center' }}>
        <h1>Check your email</h1>
        <p>A confirmation link has been sent to <strong>{email}</strong>.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSignUp} style={{ maxWidth: 320, margin: '80px auto' }}>
      <h1>Sign up</h1>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ display: 'block', width: '100%', marginBottom: 12, padding: 8 }}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ display: 'block', width: '100%', marginBottom: 12, padding: 8 }}
      />
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button type="submit" style={{ padding: '8px 16px' }}>Create account</button>
    </form>
  )
}

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpForm />
    </Suspense>
  )
}