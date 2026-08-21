const STEP_SECTIONS = [
  { label: 'Event Details', href: '#section-event-basics' },
  { label: 'Tickets', href: '#section-tickets' },
  { label: 'Payments', href: '#section-payment-methods' },
  { label: 'Review', href: '#section-review' },
]

export function ProgressSteps({ currentStep }: { currentStep: number }) {
  return (
    <ol style={{ display: 'flex', alignItems: 'center', listStyle: 'none', padding: 0, margin: 0, gap: 0 }}>
      {STEP_SECTIONS.map(({ label, href }, i) => {
        const step = i + 1
        const state = step < currentStep ? 'done' : step === currentStep ? 'active' : 'upcoming'
        return (
          <li key={label} style={{ display: 'flex', alignItems: 'center', flex: step < STEP_SECTIONS.length ? 1 : 'none' }}>
            <a href={href} style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
              <span style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 24, height: 24, borderRadius: 99, fontSize: 12, fontWeight: 600,
                background: state === 'active' ? '#4f46e5' : state === 'done' ? '#e0e7ff' : '#f3f4f6',
                color: state === 'active' ? '#fff' : state === 'done' ? '#4f46e5' : '#9ca3af',
                flexShrink: 0,
              }}>
                {step}
              </span>
              <span className="create-event-progress-labels" style={{
                fontSize: 13, fontWeight: 500,
                color: state === 'active' ? '#4f46e5' : '#9ca3af',
              }}>
                {label}
              </span>
            </a>
            {step < STEP_SECTIONS.length && (
              <span style={{ flex: 1, height: 1, background: '#e5e7eb', margin: '0 12px' }} />
            )}
          </li>
        )
      })}
    </ol>
  )
}
