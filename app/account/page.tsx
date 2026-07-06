'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import LogoutButton from '@/app/components/LogoutButton'

export default function AccountPage() {
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
      } else {
        setLoading(false)
      }
    }
    checkUser()
  }, [router])

  if (loading) return <p>Loading...</p>

  return (
    <div>
      <h1>My Account</h1>
      <p>Welcome! Your account page is coming together.</p>
      <LogoutButton />
    </div>
  )
}