'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function OrganizerProfilePage() {
  const [orgName, setOrgName] = useState('')
  const [orgDescription, setOrgDescription] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [managerPhone, setManagerPhone] = useState('')
  const [supportPhone, setSupportPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      setLoading(false)
    }
    checkAuth()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setError('You must be signed in to save your organizer profile.')
      return
    }

    const { error: insertError } = await supabase
      .from('organizer_profiles')
      .insert({
        user_id: session.user.id,
        org_name: orgName,
        org_description: orgDescription || null,
        contact_email: contactEmail,
        manager_phone: managerPhone || null,
        support_phone: supportPhone || null,
      })

    if (insertError) {
      setError(insertError.message)
      return
    }

    router.push('/account/interests')
  }

  if (loading) return <p>Loading...</p>

  return (
    <div style={{ maxWidth: 400, margin: '80px auto' }}>
      <h1>Organizer profile</h1>
      <form onSubmit={handleSubmit} style={{ marginTop: 24 }}>
        <input
          id="org-name-input"
          type="text"
          placeholder="Organization/team name"
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          required
          style={{ display: 'block', width: '100%', marginBottom: 12, padding: 8 }}
        />
        <textarea
          id="org-description-input"
          placeholder="Description"
          value={orgDescription}
          onChange={(e) => setOrgDescription(e.target.value)}
          style={{ display: 'block', width: '100%', marginBottom: 12, padding: 8, resize: 'vertical' }}
        />
        <input
          id="contact-email-input"
          type="email"
          placeholder="Contact email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          required
          style={{ display: 'block', width: '100%', marginBottom: 12, padding: 8 }}
        />
        <input
          id="manager-phone-input"
          type="tel"
          placeholder="Manager phone number"
          value={managerPhone}
          onChange={(e) => setManagerPhone(e.target.value)}
          style={{ display: 'block', width: '100%', marginBottom: 12, padding: 8 }}
        />
        <input
          id="support-phone-input"
          type="tel"
          placeholder="Customer support phone number"
          value={supportPhone}
          onChange={(e) => setSupportPhone(e.target.value)}
          style={{ display: 'block', width: '100%', marginBottom: 12, padding: 8 }}
        />
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" style={{ padding: '8px 16px' }}>Continue</button>
      </form>
    </div>
  )
}
