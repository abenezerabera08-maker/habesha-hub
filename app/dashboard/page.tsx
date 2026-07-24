'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalTicketsSold, setTotalTicketsSold] = useState(0)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (profile?.role !== 'organizer') {
        setError('Only organizers can access the dashboard.')
        setLoading(false)
        return
      }

      const { data: events } = await supabase
        .from('events')
        .select('id')
        .eq('organizer_id', session.user.id)

      const eventIds = (events ?? []).map(e => e.id)
      if (eventIds.length === 0) {
        setLoading(false)
        return
      }

      const { data: orders } = await supabase
        .from('orders')
        .select('quantity, total_price')
        .eq('status', 'confirmed')
        .in('event_id', eventIds)

      if (orders && orders.length > 0) {
        setTotalRevenue(orders.reduce((sum, o) => sum + o.total_price, 0))
        setTotalTicketsSold(orders.reduce((sum, o) => sum + o.quantity, 0))
      }

      setLoading(false)
    }
    checkAuth()
  }, [router])

  if (loading) return <p>Loading...</p>
  if (error) return <p>{error}</p>

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 24 }}>Overview</h1>
      <div style={{ display: 'flex', gap: 16 }}>
        <div
          style={{
            border: '1px solid #ddd',
            borderRadius: 8,
            padding: 24,
            flex: 1,
          }}
        >
          <p style={{ margin: '0 0 8px', fontSize: 14, color: '#555' }}>Revenue</p>
          <p style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>{totalRevenue} ETB</p>
        </div>
        <div
          style={{
            border: '1px solid #ddd',
            borderRadius: 8,
            padding: 24,
            flex: 1,
          }}
        >
          <p style={{ margin: '0 0 8px', fontSize: 14, color: '#555' }}>Tickets Sold</p>
          <p style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>{totalTicketsSold}</p>
        </div>
      </div>
    </div>
  )
}
