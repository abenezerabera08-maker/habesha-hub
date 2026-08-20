'use client'

import { Suspense, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Lock, Mail, ArrowRight, Ticket, Compass, Users } from 'lucide-react'

const IMG = '/img/login_background_image.png'
const LOGO = '/logo.png'

const VALUE_ITEMS = [
  { icon: Ticket, title: 'Book Tickets', sub: 'Easy & secure' },
  { icon: Compass, title: 'Discover Events', sub: 'Find your vibe' },
  { icon: Users, title: 'Connect', sub: 'With community' },
]

function SignUpForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const roleParam = searchParams.get('role')
  const role = roleParam === 'attendee' || roleParam === 'organizer' ? roleParam : 'attendee'

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error } = await supabase.auth.signUp({ email, password })
    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    if (data.user?.identities?.length === 0) {
      setConfirmationSent(true)
    } else if (data.user && data.session) {
      const res = await fetch('/api/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: data.session.access_token, role: role === 'organizer' ? 'organizer' : 'customer' }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setError(body?.error ?? 'Could not set your account role. Please try again.')
        return
      }

      router.push(role === 'organizer' ? '/onboarding/organizer-profile' : '/onboarding/attendee-profile')
    } else if (data.user) {
      router.push(role === 'organizer' ? '/onboarding/organizer-profile' : '/onboarding/attendee-profile')
    }
  }

  return (
    <div className="login-page">

      {/* Ambient glow layers */}
      <div className="login-glow login-glow-warm" />
      <div className="login-glow login-glow-pink" />

      {/* =================== MOBILE BRAND (visible < 1024px) =================== */}
      <div className="login-mobile-brand">
        <img src={LOGO} alt="Habesha Hub" style={{ height: 32, width: 'auto' }} />
        <h1 style={{
          fontSize: 32, fontWeight: 800, color: '#F5F5F5',
          lineHeight: 0.95, letterSpacing: '-0.03em', margin: '16px 0 8px',
        }}>
          Join the<br />
          <span style={{
            background: 'linear-gradient(90deg, #FFB000 0%, #FF7900 48%, #F51B5C 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>movement.</span>
        </h1>
        <p style={{ fontSize: 14, color: '#78716C', lineHeight: 1.5, maxWidth: 340, margin: '0 auto' }}>
          One hub for every vibe.
        </p>
      </div>

      {/* =================== LEFT BRAND AREA (desktop) =================== */}
      <div className="login-brand-area">

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 48 }}>
          <img src={LOGO} alt="Habesha Hub" style={{ height: 36, width: 'auto' }} />
          <span style={{ fontSize: 18, fontWeight: 700, color: '#F5F5F5', letterSpacing: '-0.01em' }}>
            Habesha Hub
          </span>
        </div>

        {/* Headline */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: '#A8A29E', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 16px' }}>
            Events. Culture. People. Vibes.
          </p>
          <h1 style={{
            fontSize: 'clamp(40px, 5.5vw, 76px)', fontWeight: 800, color: '#F5F5F5',
            lineHeight: 0.92, letterSpacing: '-0.03em', margin: 0,
          }}>
            Join the<br />
            <span style={{
              background: 'linear-gradient(90deg, #FFB000 0%, #FF7900 48%, #F51B5C 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>movement.</span>
          </h1>
        </div>

        {/* Supporting copy */}
        <p style={{ fontSize: 15, color: '#78716C', lineHeight: 1.6, maxWidth: 440, margin: '0 0 40px' }}>
          Create your account and start discovering live music, nightlife, art, tech, comedy, food, and community events.
        </p>

        {/* Image composition */}
        <div className="login-collage">
          <div
            className="login-collage-card"
            style={{
              width: '100%', borderRadius: 20, overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.35), 0 8px 20px rgba(0,0,0,0.25)',
            }}
          >
            <img
              src={IMG}
              alt="Habesha Hub events collage"
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
                display: 'block',
              }}
            />
          </div>

          {/* Floating category pills */}
          {['Music', 'Art', 'Tech', 'Comedy', 'Food', 'Sports'].map((cat, i) => (
            <span
              key={cat}
              className="login-category-pill"
              style={{
                position: 'absolute',
                bottom: `${-10 - i * 16}px`,
                right: `${8 + i * 14}%`,
              }}
            >
              {cat}
            </span>
          ))}
        </div>

        {/* Community card */}
        <div className="login-community-card">
          <div style={{ display: 'flex' }}>
            {[0,1,2,3].map(i => (
              <div key={i} style={{
                width: 30, height: 30, borderRadius: 99,
                background: `linear-gradient(135deg, ${['#4f46e5','#059669','#f59e0b','#e11d48'][i]}, ${['#818cf8','#34d399','#fbbf24','#fb7185'][i]})`,
                border: '2px solid #080808',
                marginLeft: i > 0 ? -8 : 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: '#fff',
              }}>
                {['A','M','S','K'][i]}
              </div>
            ))}
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#F5F5F5', margin: 0 }}>A growing community</p>
            <p style={{ fontSize: 12, color: '#78716C', margin: '2px 0 0' }}>Discovering what&apos;s happening.</p>
          </div>
        </div>
      </div>

      {/* =================== RIGHT AUTH AREA =================== */}
      <div className="login-auth-area">

        {/* Auth card */}
        <div className="login-auth-card">

          {confirmationSent ? (
            /* Confirmation sent state */
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <img src={LOGO} alt="" style={{ height: 36, width: 'auto', marginBottom: 20 }} />
              <div style={{
                width: 56, height: 56, borderRadius: 99, margin: '0 auto 20px',
                background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Mail size={28} color="#22c55e" />
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: '#F5F5F5', margin: '0 0 8px' }}>
                Check your email
              </h2>
              <p style={{ fontSize: 14, color: '#78716C', margin: '0 0 4px', lineHeight: 1.5 }}>
                We sent a confirmation link to
              </p>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#F5F5F5', margin: '0 0 24px' }}>
                {email}
              </p>
              <button
                type="button"
                onClick={() => setConfirmationSent(false)}
                className="login-cta"
              >
                Back to sign up
              </button>
            </div>
          ) : (
            <>
              {/* Card top: logo + heading */}
              <div style={{ marginBottom: 28 }}>
                <img src={LOGO} alt="" style={{ height: 36, width: 'auto', marginBottom: 20 }} />
                <h2 style={{ fontSize: 22, fontWeight: 700, color: '#F5F5F5', margin: '0 0 6px' }}>
                  Create your account
                </h2>
                <p style={{ fontSize: 14, color: '#78716C', margin: 0, lineHeight: 1.5 }}>
                  Sign up to start discovering and attending events
                </p>
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  marginBottom: 16, padding: '10px 14px', borderRadius: 10,
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                  color: '#fca5a5', fontSize: 13,
                }}>
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSignUp}>
                {/* Email field */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#A8A29E', marginBottom: 6 }}>
                    Email
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={18} color="#57534E" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      className="login-input"
                      style={{ paddingLeft: 44 }}
                    />
                  </div>
                </div>

                {/* Password field */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#A8A29E', marginBottom: 6 }}>
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} color="#57534E" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      className="login-input"
                      style={{ paddingLeft: 44, paddingRight: 48 }}
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword(prev => !prev)}
                      style={{
                        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', padding: 6, cursor: 'pointer',
                        color: '#57534E', display: 'flex',
                      }}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Primary CTA */}
                <div style={{ marginTop: 24 }}>
                  <button
                    type="submit"
                    disabled={loading}
                    className="login-cta"
                  >
                    {loading ? 'Creating account...' : <>Create Account <ArrowRight size={18} /></>}
                  </button>
                </div>
              </form>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '28px 0' }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                <span style={{ fontSize: 12, color: '#57534E', whiteSpace: 'nowrap' }}>or continue with</span>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
              </div>

              {/* Social buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button type="button" className="login-social-btn">
                  <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  Continue with Google
                </button>
                <button type="button" className="login-social-btn">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#F5F5F5"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                  Continue with Apple
                </button>
              </div>

              {/* Login link */}
              <p style={{ textAlign: 'center', fontSize: 14, color: '#78716C', marginTop: 24 }}>
                Already have an account?{' '}
                <a href="/login" style={{ color: '#FFB000', fontWeight: 600, textDecoration: 'none' }}>
                  Log in
                </a>
              </p>

              {/* Value proposition */}
              <div className="login-value-row">
                {VALUE_ITEMS.map(item => (
                  <div key={item.title} style={{ flex: 1, textAlign: 'center' }}>
                    <item.icon size={18} color="#FFB000" style={{ margin: '0 auto 6px' }} />
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#A8A29E', margin: '0 0 2px' }}>{item.title}</p>
                    <p style={{ fontSize: 11, color: '#57534E', margin: 0 }}>{item.sub}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="login-footer">
        {['Privacy', 'Terms', 'Help'].map(link => (
          <a key={link} href="#" style={{ fontSize: 12, color: '#57534E', textDecoration: 'none' }}>{link}</a>
        ))}
      </div>
    </div>
  )
}

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpForm />
    </Suspense>
  )
}
