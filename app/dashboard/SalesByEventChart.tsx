'use client'

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { ArrowUpRight } from 'lucide-react'
import Link from 'next/link'

const CHART_COLORS = ['#F59E0B', '#22C55E', '#8B5CF6', '#3B82F6']

export default function SalesByEventChart({ salesByEvent }: { salesByEvent: { name: string; revenue: number }[] }) {
  return (
    <div className="dash-card">
      <h3 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: '0 0 16px' }}>Sales by Event</h3>
      {salesByEvent.length > 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 160, height: 160, flexShrink: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={salesByEvent} dataKey="revenue" nameKey="name"
                  cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                  strokeWidth={0}>
                  {salesByEvent.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {salesByEvent.map((item, i) => {
              const total = salesByEvent.reduce((s, e) => s + e.revenue, 0)
              const pct = total > 0 ? Math.round((item.revenue / total) * 100) : 0
              return (
                <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 99, background: CHART_COLORS[i], flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, color: '#374151', fontWeight: 500 }}>{item.name}</span>
                  <span style={{ fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' }}>
                    {item.revenue.toLocaleString()} ETB ({pct}%)
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: '40px 0' }}>No sales data yet</p>
      )}
      <Link href="/my-events" style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 13, fontWeight: 600, color: '#F59E0B', textDecoration: 'none',
        marginTop: 16,
      }}>
        View all events <ArrowUpRight size={14} />
      </Link>
    </div>
  )
}
