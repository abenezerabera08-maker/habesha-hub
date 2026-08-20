'use client'

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts'

export default function RevenueChart({ chartData }: { chartData: { date: string; revenue: number }[] }) {
  return (
    <div className="dash-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>Revenue Overview</h3>
        <select className="dash-select">
          <option>Last 7 days</option>
        </select>
      </div>
      <div style={{ height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="orangeFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false}
              tickFormatter={v => v >= 1000 ? `${v / 1000}k` : String(v)} />
            <RechartsTooltip
              contentStyle={{ background: '#111827', border: 'none', borderRadius: 8, fontSize: 12, color: '#F9FAFB' }}
              formatter={(value) => [`${Number(value).toLocaleString()} ETB`, 'Revenue']}
              labelStyle={{ color: '#9CA3AF' }}
            />
            <Area type="monotone" dataKey="revenue" stroke="#F59E0B" strokeWidth={2}
              fill="url(#orangeFill)" dot={false} activeDot={{ r: 5, fill: '#F59E0B', stroke: '#fff', strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
