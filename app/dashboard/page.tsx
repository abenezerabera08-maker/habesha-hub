import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  LayoutDashboard, ShoppingBag, DollarSign, Ticket,
  CalendarDays, TrendingUp, MapPin,
} from 'lucide-react'
import RevenueChart from './RevenueChart'
import SalesByEventChart from './SalesByEventChart'

type EventRow = {
  id: string; title: string; event_date: string; location: string | null
  image_url: string | null; status: string; organizer_id: string
}

type OrderRow = {
  id: string; event_id: string; user_id: string; quantity: number
  total_price: number; status: string; created_at: string | null
}

type ProfileRow = { id: string; full_name: string | null }

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/')
  }

  const [roleRes, eventsRes] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
    supabase.from('events')
      .select('id, title, event_date, location, image_url, status, organizer_id')
      .eq('organizer_id', user.id)
      .order('event_date', { ascending: false }),
  ])

  const role = roleRes.data?.role ?? null
  if (role !== 'organizer') {
    redirect('/')
  }

  const allEvents = (eventsRes.data ?? []) as EventRow[]
  const eventIds = allEvents.map(e => e.id)
  const eventTitleMap = new Map(allEvents.map(e => [e.id, e.title]))

  let totalRevenue = 0
  let totalTicketsSold = 0
  let totalOrders = 0
  let chartData: { date: string; revenue: number }[] = []
  let salesByEvent: { name: string; revenue: number }[] = []
  let recentOrders: {
    id: string; event: string; attendee: string; qty: number
    amount: number; status: string; date: string
  }[] = []

  if (eventIds.length > 0) {
    const now = new Date()
    const ordersRes = await supabase.from('orders')
      .select('id, event_id, user_id, quantity, total_price, status, created_at')
      .in('event_id', eventIds)
      .order('created_at', { ascending: false })

    const allOrders = (ordersRes.data ?? []) as OrderRow[]
    const confirmed = allOrders.filter(o => o.status === 'confirmed')

    totalRevenue = confirmed.reduce((s, o) => s + o.total_price, 0)
    totalTicketsSold = confirmed.reduce((s, o) => s + o.quantity, 0)
    totalOrders = allOrders.length

    const chartMap = new Map<string, number>()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      chartMap.set(d.toISOString().slice(5, 10), 0)
    }
    for (const o of confirmed) {
      if (o.created_at) {
        const key = o.created_at.slice(5, 10)
        if (chartMap.has(key)) chartMap.set(key, (chartMap.get(key) ?? 0) + o.total_price)
      }
    }
    chartData = Array.from(chartMap.entries()).map(([date, revenue]) => ({ date, revenue }))

    const eventRevMap = new Map<string, number>()
    for (const o of confirmed) {
      eventRevMap.set(o.event_id, (eventRevMap.get(o.event_id) ?? 0) + o.total_price)
    }
    salesByEvent = Array.from(eventRevMap.entries())
      .map(([id, revenue]) => ({ name: eventTitleMap.get(id) ?? 'Unknown', revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 4)

    const recent = allOrders.slice(0, 5)
    const userIds = [...new Set(recent.map(o => o.user_id))]

    let nameMap = new Map<string, string | null>()
    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds)
      nameMap = new Map((profilesData ?? []).map((p: ProfileRow) => [p.id, p.full_name]))
    }

    recentOrders = recent.map(o => ({
      id: o.id.slice(0, 8),
      event: eventTitleMap.get(o.event_id) ?? '—',
      attendee: nameMap.get(o.user_id) ?? 'Unknown',
      qty: o.quantity,
      amount: o.total_price,
      status: o.status === 'confirmed' ? 'Completed' : o.status === 'pending_verification' ? 'Pending' : 'Failed',
      date: o.created_at ? new Date(o.created_at).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) : '—',
    }))
  }

  const now = new Date()
  const published = allEvents.filter(e => e.status === 'published')
  const publishedCount = published.length
  const upcomingCount = published.filter(e => new Date(e.event_date) >= now).length
  const upcomingEvents = allEvents
    .filter(e => new Date(e.event_date) >= now)
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
    .slice(0, 4)

  return (
    <div className="dash-layout">
      <aside className="dash-sidebar">
        <div className="dash-sidebar-brand">Organizer</div>
        <nav className="dash-sidebar-nav">
          <a href="/dashboard" className="dash-sidebar-link dash-sidebar-active">
            <LayoutDashboard size={18} /> Overview
          </a>
          <a href="/dashboard/payments" className="dash-sidebar-link">
            <ShoppingBag size={18} /> Orders
          </a>
        </nav>
        <div className="dash-sidebar-avatar">
          <span>{user.id.charAt(0).toUpperCase()}</span>
        </div>
      </aside>

      <div className="dash-main">
        <div className="dash-header">
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 750, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
              Overview
            </h1>
            <p style={{ fontSize: 14, color: '#6B7280', margin: '4px 0 0' }}>
              Welcome back! Here&apos;s what&apos;s happening with your events.
            </p>
          </div>
          <div className="dash-date-selector">
            <CalendarDays size={16} color="#6B7280" />
            <span>{new Date(now.getTime() - 6 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            <ChevronDown size={14} color="#6B7280" />
          </div>
        </div>

        <div className="dash-stats">
          <StatCard
            icon={<DollarSign size={18} />}
            iconBg="#FFF7ED" iconColor="#F97316"
            label="Total Revenue"
            value={`${totalRevenue.toLocaleString()} ETB`}
            sub={publishedCount > 0 ? `${upcomingCount} upcoming` : undefined}
          />
          <StatCard
            icon={<Ticket size={18} />}
            iconBg="#F0FDF4" iconColor="#22C55E"
            label="Tickets Sold"
            value={String(totalTicketsSold)}
          />
          <StatCard
            icon={<ShoppingBag size={18} />}
            iconBg="#F5F3FF" iconColor="#8B5CF6"
            label="Total Orders"
            value={String(totalOrders)}
          />
          <StatCard
            icon={<CalendarDays size={18} />}
            iconBg="#EFF6FF" iconColor="#3B82F6"
            label="Published Events"
            value={String(publishedCount)}
            sub={publishedCount > 0 ? `${upcomingCount} upcoming` : undefined}
          />
        </div>

        <div className="dash-analytics">
          <RevenueChart chartData={chartData} />
          <SalesByEventChart salesByEvent={salesByEvent} />
        </div>

        <div className="dash-bottom">
          <div className="dash-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>Recent Orders</h3>
              <Link href="/dashboard/payments" style={{ fontSize: 13, fontWeight: 600, color: '#F59E0B', textDecoration: 'none' }}>
                View all orders →
              </Link>
            </div>
            {recentOrders.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Order ID</th><th>Event</th><th>Attendee</th>
                      <th>Qty</th><th>Amount</th><th>Status</th><th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map(o => (
                      <tr key={o.id}>
                        <td style={{ fontFamily: 'monospace', color: '#6B7280' }}>#{o.id}</td>
                        <td style={{ fontWeight: 500 }}>{o.event}</td>
                        <td>{o.attendee}</td>
                        <td>{o.qty}</td>
                        <td style={{ fontWeight: 500 }}>{o.amount.toLocaleString()} ETB</td>
                        <td>
                          <span className={`dash-badge ${o.status === 'Completed' ? 'dash-badge-green' : o.status === 'Pending' ? 'dash-badge-amber' : 'dash-badge-red'}`}>
                            {o.status}
                          </span>
                        </td>
                        <td style={{ color: '#6B7280' }}>{o.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: '32px 0' }}>No orders yet</p>
            )}
          </div>

          <div className="dash-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>Upcoming Events</h3>
              <Link href="/my-events" style={{ fontSize: 13, fontWeight: 600, color: '#F59E0B', textDecoration: 'none' }}>
                View all events →
              </Link>
            </div>
            {upcomingEvents.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {upcomingEvents.map(ev => {
                  const d = new Date(ev.event_date)
                  return (
                    <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                      <div style={{ width: 58, height: 48, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: '#F3F4F6' }}>
                        {ev.image_url ? (
                          <img src={ev.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #312e81, #111827)' }} />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ev.title}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                          <CalendarDays size={11} color="#9CA3AF" />
                          <span style={{ fontSize: 11, color: '#6B7280' }}>
                            {d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                            {' · '}
                            {d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </span>
                        </div>
                        {ev.location && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                            <MapPin size={11} color="#9CA3AF" />
                            <span style={{ fontSize: 11, color: '#6B7280' }}>{ev.location}</span>
                          </div>
                        )}
                      </div>
                      <span className={`dash-badge ${ev.status === 'published' ? 'dash-badge-green' : 'dash-badge-amber'}`}>
                        {ev.status === 'published' ? 'Published' : 'Pending Review'}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: '32px 0' }}>No upcoming events</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ChevronDown({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

function StatCard({ icon, iconBg, iconColor, label, value, change, sub }: {
  icon: React.ReactNode; iconBg: string; iconColor: string
  label: string; value: string; change?: number; sub?: string
}) {
  return (
    <div className="dash-stat-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 36, height: 36, borderRadius: 8, background: iconBg, color: iconColor,
        }}>
          {icon}
        </span>
        <span style={{ fontSize: 13, color: '#6B7280', fontWeight: 500 }}>{label}</span>
      </div>
      <p style={{ fontSize: 23, fontWeight: 700, color: '#111827', margin: 0 }}>{value}</p>
      {change !== undefined && change !== 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
          <TrendingUp size={13} color="#22C55E" />
          <span style={{ fontSize: 12, color: '#22C55E', fontWeight: 500 }}>
            ↑ {Math.abs(change)}% vs last 7 days
          </span>
        </div>
      )}
      {sub && !change && (
        <p style={{ fontSize: 12, color: '#6B7280', margin: '6px 0 0' }}>{sub}</p>
      )}
    </div>
  )
}
