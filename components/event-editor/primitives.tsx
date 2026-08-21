import React from 'react'

export const cardStyle: React.CSSProperties = {
  background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 20,
}

export const inputBase: React.CSSProperties = {
  width: '100%', padding: '10px 14px', fontSize: 14,
  border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none',
  color: '#111827', backgroundColor: '#fff', fontFamily: 'inherit',
}

export function SectionCard({ id, icon: Icon, title, subtitle, badge, children }: {
  id?: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  subtitle?: string
  badge?: string
  children: React.ReactNode
}) {
  return (
    <section id={id} style={{ ...cardStyle, scrollMarginTop: 112 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
        <span style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 36, height: 36, borderRadius: 8, background: '#eef2ff', color: '#4f46e5',
          flexShrink: 0, marginTop: 2,
        }}>
          <Icon className="w-[18px] h-[18px]" />
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>{title}</h2>
            {badge && <span style={{ fontSize: 12, color: '#9ca3af' }}>({badge})</span>}
          </div>
          {subtitle && <p style={{ fontSize: 14, color: '#6b7280', marginTop: 2 }}>{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

export function Field({ label, required, hint, error, children }: {
  label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 14, fontWeight: 500, color: '#1f2937' }}>
        {label}{required && <span style={{ color: '#e11d48' }}> *</span>}
      </label>
      {children}
      {error
        ? <span style={{ fontSize: 12, color: '#e11d48' }}>{error}</span>
        : hint ? <span style={{ fontSize: 12, color: '#9ca3af' }}>{hint}</span> : null}
    </div>
  )
}
