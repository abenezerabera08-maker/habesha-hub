'use client'

import { useRouter } from 'next/navigation'

export default function ChooseRolePage() {
  const router = useRouter()

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', textAlign: 'center' }}>
      <h1>What do you want to do?</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
        <button id="attend-events-btn" style={{ padding: '10px 28px', borderRadius: 8, border: '1px solid #ccc', background: '#fff', color: '#171717', fontSize: 15, cursor: 'pointer' }}>
          👤 Attend Events
        </button>
        <button id="host-event-btn" style={{ padding: '10px 28px', borderRadius: 8, border: '1px solid #ccc', background: '#fff', color: '#171717', fontSize: 15, cursor: 'pointer' }}>
          🏢 Host an Event
        </button>
      </div>
      <button id="skip-role-choice-btn" onClick={() => router.push('/')} style={{ marginTop: 24, padding: '8px 20px', borderRadius: 8, border: 'none', background: 'transparent', color: '#888', fontSize: 14, cursor: 'pointer' }}>
        Skip for now
      </button>
    </div>
  )
}
