'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
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

  if (loading) return <p>Loading...</p>

  return (
    <div style={{ maxWidth: 640, margin: '80px auto', textAlign: 'center' }}>
      <h1>Organizer Dashboard — Coming Soon</h1>
    </div>
  )
}
