'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalTicketsSold, setTotalTicketsSold] = useState(0)
  const [chartData, setChartData] = useState<{ date: string; revenue: number }[]>([])
  const [recentSales, setRecentSales] = useState<{ id: string; attendeeName: string; eventTitle: string; quantity: number; totalPrice: number; createdAt: string }[]>([])
  const [myEvents, setMyEvents] = useState<{ id: string; title: string; published_at: string | null; event_date: string }[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')
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

      const { data: eventsList } = await supabase
        .from('events')
        .select('id, title, published_at, event_date')
        .eq('organizer_id', session.user.id)
        .not('published_at', 'is', null)
        .order('event_date', { ascending: false })

      setMyEvents(eventsList ?? [])
      if (eventsList && eventsList.length > 0) {
        setSelectedEventId(eventsList[0].id)
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

      const { data: detailedOrders } = await supabase
        .from('orders')
        .select('id, quantity, total_price, created_at, event_id, user_id')
        .eq('status', 'confirmed')
        .in('event_id', eventIds)
        .order('created_at', { ascending: false })

      if (detailedOrders && detailedOrders.length > 0) {
        // Build recent sales table: last 8 orders, with event title and attendee name
        const recentOrders = detailedOrders.slice(0, 8)
        const eventIdsForRecent = [...new Set(recentOrders.map(o => o.event_id))]
        const userIdsForRecent = [...new Set(recentOrders.map(o => o.user_id))]

        const [eventsRes, profilesRes] = await Promise.all([
          supabase.from('events').select('id, title').in('id', eventIdsForRecent),
          supabase.from('profiles').select('id, full_name').in('id', userIdsForRecent),
        ])

        const eventTitleMap = new Map((eventsRes.data ?? []).map(e => [e.id, e.title]))
        const nameMap = new Map((profilesRes.data ?? []).map(p => [p.id, p.full_name]))

        setRecentSales(recentOrders.map(o => ({
          id: o.id,
          attendeeName: nameMap.get(o.user_id) ?? 'Unknown',
          eventTitle: eventTitleMap.get(o.event_id) ?? 'Unknown event',
          quantity: o.quantity,
          totalPrice: o.total_price,
          createdAt: o.created_at ?? '',
        })))
      }

      setLoading(false)
    }
    checkAuth()
  }, [router])

  useEffect(() => {
    const loadChartForEvent = async () => {
      if (!selectedEventId) return
      const selectedEvent = myEvents.find(e => e.id === selectedEventId)
      if (!selectedEvent || !selectedEvent.published_at) return

      const { data: eventOrders } = await supabase
        .from('orders')
        .select('total_price, created_at')
        .eq('status', 'confirmed')
        .eq('event_id', selectedEventId)

      const start = new Date(selectedEvent.published_at)
      const end = new Date(selectedEvent.event_date)
      const days: { date: string; revenue: number }[] = []
      const cursor = new Date(start)
      cursor.setHours(0, 0, 0, 0)
      const endDay = new Date(end)
      endDay.setHours(0, 0, 0, 0)

      while (cursor <= endDay) {
        const dateStr = cursor.toISOString().slice(0, 10)
        const dayRevenue = (eventOrders ?? [])
          .filter(o => o.created_at && o.created_at.slice(0, 10) === dateStr)
          .reduce((sum, o) => sum + o.total_price, 0)
        days.push({ date: dateStr.slice(5), revenue: dayRevenue })
        cursor.setDate(cursor.getDate() + 1)
      }
      setChartData(days)
    }
    loadChartForEvent()
  }, [selectedEventId, myEvents])

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

      {myEvents.length === 0 ? (
        <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 24, marginTop: 24 }}>
          <p style={{ margin: 0, fontSize: 14, color: '#555', fontWeight: 600 }}>No published events yet.</p>
        </div>
      ) : (
        <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 24, marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p style={{ margin: 0, fontSize: 14, color: '#555', fontWeight: 600 }}>
              Revenue — {myEvents.find(e => e.id === selectedEventId)?.title ?? 'select an event'}
            </p>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd' }}
            >
              {myEvents.map(ev => (
                <option key={ev.id} value={ev.id}>{ev.title}</option>
              ))}
            </select>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="#171717" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 24, marginTop: 24, marginBottom: 40 }}>
        <p style={{ margin: '0 0 16px', fontSize: 14, color: '#555', fontWeight: 600 }}>Recent Sales</p>
        {recentSales.length === 0 ? (
          <p style={{ color: '#888', fontSize: 14 }}>No sales yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                <th style={{ padding: '8px 4px' }}>Attendee</th>
                <th style={{ padding: '8px 4px' }}>Event</th>
                <th style={{ padding: '8px 4px' }}>Qty</th>
                <th style={{ padding: '8px 4px' }}>Amount</th>
                <th style={{ padding: '8px 4px' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.map(sale => (
                <tr key={sale.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '8px 4px' }}>{sale.attendeeName}</td>
                  <td style={{ padding: '8px 4px' }}>{sale.eventTitle}</td>
                  <td style={{ padding: '8px 4px' }}>{sale.quantity}</td>
                  <td style={{ padding: '8px 4px' }}>{sale.totalPrice} ETB</td>
                  <td style={{ padding: '8px 4px' }}>{new Date(sale.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
