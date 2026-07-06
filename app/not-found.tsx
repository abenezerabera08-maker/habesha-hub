import Link from 'next/link'

export default function NotFoundPage() {
  return (
    <div style={{ maxWidth: 480, margin: '80px auto', textAlign: 'center' }}>
      <h1>Page not found</h1>
      <p>The page you are looking for does not exist.</p>
      <Link href="/" style={{ display: 'inline-block', marginTop: 16 }}>
        Go home
      </Link>
    </div>
  )
}
