'use client'

type InterestChipProps = {
  label: string
  active: boolean
  onClick: () => void
}

export default function InterestChip({ label, active, onClick }: InterestChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flexShrink: 0,
        whiteSpace: 'nowrap',
        borderRadius: 20,
        padding: '8px 16px',
        fontSize: 14,
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'background-color 0.15s, color 0.15s',
        border: active ? 'none' : '1px solid #ddd',
        background: active ? '#F59E0B' : '#fff',
        color: active ? '#fff' : '#57534E',
      }}
    >
      {label}
    </button>
  )
}
