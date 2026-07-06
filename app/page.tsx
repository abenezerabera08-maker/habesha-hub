import Link from 'next/link'

export default function HomePage() {
  return (
    <div style={{ maxWidth: 640, margin: '80px auto', padding: '0 16px' }}>
      <h1>Habesha Hub</h1>
      <p>Discover and book Ethiopian community events.</p>
      <nav style={{ marginTop: 24, display: 'flex', gap: 16 }}>
        <Link href="/login">Log In</Link>
        <Link href="/signup">Sign Up</Link>
      </nav>
    </div>
  )
}
