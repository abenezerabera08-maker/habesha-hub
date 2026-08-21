'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ChooseRolePage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/')
  }, [router])

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', textAlign: 'center', padding: 16 }}>
      <p style={{ color: '#6B7280' }}>Redirecting...</p>
    </div>
  )
}
