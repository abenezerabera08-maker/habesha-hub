'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Camera,
  Pencil,
  MapPin,
  CalendarDays,
  Ticket,
  Users,
  UserPlus,
  Heart,
  ArrowRight,
  Bookmark,
  ChevronRight,
  User,
  ShieldCheck,
  Bell,
  ShieldAlert,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import LogoutButton from '@/app/components/LogoutButton'

type Profile = {
  displayName: string
  email: string
  initials: string
  location: string | null
  joinedDate: string
}

function deriveInitials(name: string, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/)
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

function deriveDisplayName(name: string | null, email: string): string {
  return name || email || 'User'
}

function formatJoinedDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export default function AccountPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [eventsAttended, setEventsAttended] = useState(0)
  const [interestCount, setInterestCount] = useState(0)
  const [hostError, setHostError] = useState('')
  const router = useRouter()
  const { role } = useAuth()

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const email = session.user.email ?? ''
      const joinedDate = session.user.created_at ?? new Date().toISOString()

      const { data: profileRow } = await supabase
        .from('profiles')
        .select('full_name, location')
        .eq('id', session.user.id)
        .single()

      const name = profileRow?.full_name ?? null

      let cityName: string | null = null
      if (profileRow?.location) {
        const { data: cityRow } = await supabase
          .from('cities')
          .select('name')
          .eq('id', profileRow.location)
          .maybeSingle()
        cityName = cityRow?.name ?? null
      }

      const [ordersRes, interestsRes] = await Promise.all([
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', session.user.id)
          .in('status', ['confirmed', 'checked_in']),
        supabase
          .from('user_interests')
          .select('interest_id', { count: 'exact', head: true })
          .eq('user_id', session.user.id),
      ])

      setEventsAttended(ordersRes.count ?? 0)
      setInterestCount(interestsRes.count ?? 0)

      setProfile({
        displayName: deriveDisplayName(name, email),
        email,
        initials: deriveInitials(name ?? email, email),
        location: cityName,
        joinedDate: formatJoinedDate(joinedDate),
      })
      setLoading(false)
    }

    load()
  }, [router])

  if (loading) {
    return (
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ height: 24, width: 140, borderRadius: 6, background: '#F5F5F4', marginBottom: 8 }} />
        <div style={{ height: 14, width: 260, borderRadius: 4, background: '#F5F5F4', marginBottom: 28 }} />
        <div style={{ height: 160, borderRadius: 16, background: '#F5F5F4', marginBottom: 16 }} />
        <div style={{ height: 80, borderRadius: 16, background: '#F5F5F4', marginBottom: 16 }} />
        <div style={{ height: 180, borderRadius: 16, background: '#F5F5F4', marginBottom: 16 }} />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px 96px' }}>
      {/* 1. Header */}
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1C1917', margin: 0 }}>
          My Account
        </h1>
        <p style={{ fontSize: 14, color: '#78716C', marginTop: 4 }}>
          Manage your profile, preferences and events.
        </p>
      </header>

      {/* 2. Profile Card */}
      <section
        style={{
          borderRadius: 16,
          border: '1px solid #F5F5F4',
          background: '#fff',
          padding: 20,
          marginBottom: 16,
        }}
      >
        <div
          className="profile-card-inner"
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          {/* Left: Avatar + Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              {/* Avatar */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    background: '#1C1917',
                    color: '#F59E0B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 22,
                    fontWeight: 700,
                    letterSpacing: '0.02em',
                  }}
                >
                  {profile!.initials}
                </div>
                <button
                  type="button"
                  aria-label="Change profile photo"
                  style={{
                    position: 'absolute',
                    bottom: -2,
                    right: -2,
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    border: '2px solid #fff',
                    background: '#F5F5F4',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  }}
                >
                  <Camera size={12} color="#78716C" />
                </button>
              </div>

              {/* Name + Meta */}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                  <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1C1917', margin: 0 }}>
                    {profile!.displayName}
                  </h2>
                  <button
                    type="button"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 10px',
                      borderRadius: 999,
                      border: '1px solid #E7E5E4',
                      background: '#fff',
                      color: '#57534E',
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                      lineHeight: 1.4,
                    }}
                  >
                    <Pencil size={11} />
                    Edit Profile
                  </button>
                </div>
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {profile!.location && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#78716C' }}>
                      <MapPin size={13} />
                      {profile!.location}, Ethiopia
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#78716C' }}>
                    <CalendarDays size={13} />
                    Joined {profile!.joinedDate}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Stats */}
          <div
            style={{
              borderTop: '1px solid #F5F5F4',
              paddingTop: 14,
              marginTop: 4,
            }}
          >
            <div
              className="profile-stats-row"
              style={{
                display: 'flex',
                justifyContent: 'space-around',
              }}
            >
              <StatItem
                icon={<Ticket size={16} color="#F59E0B" />}
                value={eventsAttended}
                label="Events Attended"
              />
              <StatItem
                icon={<UserPlus size={16} color="#F59E0B" />}
                value={0}
                label="Following"
              />
              <StatItem
                icon={<Users size={16} color="#F59E0B" />}
                value={0}
                label="Followers"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 3. Interests Banner */}
      <section
        style={{
          borderRadius: 16,
          background: '#1C1917',
          padding: 16,
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(245,158,11,0.35)',
            background: 'rgba(245,158,11,0.1)',
          }}
        >
          <Heart size={20} color="#F59E0B" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: 0 }}>
            Tell us what you love
          </p>
          <p style={{ fontSize: 12, color: '#A8A29E', margin: '2px 0 0', lineHeight: 1.4 }}>
            Get personalized event recommendations based on your interests.
          </p>
        </div>
        <Link
          href="/account/interests"
          style={{
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '8px 14px',
            borderRadius: 999,
            background: '#F59E0B',
            color: '#1C1917',
            fontSize: 12,
            fontWeight: 600,
            textDecoration: 'none',
            lineHeight: 1.4,
          }}
        >
          {interestCount > 0 ? 'Edit' : 'Add'} Interests
          <ArrowRight size={14} />
        </Link>
      </section>

      {/* 4. Host an Event — Primary CTA */}
      <section
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 16,
          background: '#1C1917',
          padding: 24,
          marginBottom: 24,
        }}
      >
        {/* Decorative glow */}
        <div
          style={{
            position: 'absolute',
            top: -24,
            right: -32,
            width: 160,
            height: 160,
            borderRadius: '50%',
            background: 'rgba(245,158,11,0.15)',
            filter: 'blur(40px)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(245,158,11,0.12)',
                marginBottom: 14,
              }}
            >
              <CalendarDays size={18} color="#F59E0B" />
            </div>
            <h3 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.2 }}>
              Host <span style={{ color: '#F59E0B' }}>an Event</span>
            </h3>
            <p style={{ fontSize: 13, color: '#A8A29E', margin: '8px 0 0', lineHeight: 1.5, maxWidth: 220 }}>
              Create, manage and grow your event. Reach more people and make it unforgettable.
            </p>
            {hostError && (
              <p style={{ fontSize: 13, color: '#FCA5A5', margin: '10px 0 0', lineHeight: 1.4, maxWidth: 260 }}>
                {hostError}
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                if (role !== 'organizer') {
                  setHostError('Only organizers can host events. Please switch to an organizer account to create events.')
                  return
                }
                router.push('/create-event')
              }}
              style={{
                marginTop: 16,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 20px',
                borderRadius: 999,
                border: 'none',
                background: '#F59E0B',
                color: '#1C1917',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                lineHeight: 1.4,
              }}
            >
              Create Your Event
              <ArrowRight size={16} />
            </button>
          </div>
          <Ticket
            size={80}
            color="rgba(245,158,11,0.85)"
            strokeWidth={1.25}
            style={{ flexShrink: 0, transform: 'rotate(-12deg)' }}
          />
        </div>
      </section>

      {/* 4b. Manage Your Events — organizer only */}
      {role === 'organizer' && (
        <section
          style={{
            borderRadius: 16,
            border: '1px solid #F5F5F4',
            background: '#fff',
            padding: 20,
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#FEF3C7',
              color: '#D97706',
            }}
          >
            <CalendarDays size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#1C1917', margin: 0 }}>
              Manage Your Events
            </p>
            <p style={{ fontSize: 12, color: '#78716C', margin: '2px 0 0', lineHeight: 1.4 }}>
              View, edit, and track the events you&apos;ve created.
              Manage drafts, pending approvals, and published events from one place.
            </p>
          </div>
          <Link
            href="/my-events"
            style={{
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '8px 14px',
              borderRadius: 999,
              background: '#F59E0B',
              color: '#1C1917',
              fontSize: 12,
              fontWeight: 600,
              textDecoration: 'none',
              lineHeight: 1.4,
            }}
          >
            Manage Your Events
            <ArrowRight size={14} />
          </Link>
        </section>
      )}

      {/* 5. Quick Access */}
      <section style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1C1917', margin: '0 0 12px' }}>
          Quick Access
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          <QuickCard
            icon={<Ticket size={16} />}
            title="My Tickets"
            desc="View your purchased tickets and orders"
            href="/my-tickets"
          />
          <QuickCard
            icon={<Bookmark size={16} />}
            title="Saved Events"
            desc="Events you've saved"
            href="#"
            disabled
          />
          <QuickCard
            icon={<Heart size={16} />}
            title="Interests"
            desc="Manage your interests"
            href="/account/interests"
          />
        </div>
      </section>

      {/* 6. Account Settings */}
      <section style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1C1917', margin: '0 0 12px' }}>
          Account Settings
        </h3>
        <div
          style={{
            borderRadius: 16,
            border: '1px solid #F5F5F4',
            background: '#fff',
            overflow: 'hidden',
          }}
        >
          <SettingsRow
            icon={<User size={16} />}
            title="Profile Information"
            desc="Update your personal information"
          />
          <SettingsRow
            icon={<ShieldCheck size={16} />}
            title="Security"
            desc="Password and account security"
          />
          <SettingsRow
            icon={<Bell size={16} />}
            title="Notifications"
            desc="Manage your notification preferences"
          />
          <SettingsRow
            icon={<ShieldAlert size={16} />}
            title="Privacy"
            desc="Manage your privacy settings"
            last
          />
        </div>
      </section>

      {/* 7. Logout */}
      <LogoutButton />
    </div>
  )
}

function StatItem({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode
  value: number
  label: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '0 8px' }}>
      {icon}
      <span style={{ fontSize: 18, fontWeight: 700, color: '#1C1917' }}>{value}</span>
      <span style={{ fontSize: 11, color: '#78716C', textAlign: 'center', lineHeight: 1.3 }}>
        {label}
      </span>
    </div>
  )
}

function QuickCard({
  icon,
  title,
  desc,
  href,
  disabled,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  href: string
  disabled?: boolean
}) {
  const cardStyle: React.CSSProperties = {
    position: 'relative',
    display: 'block',
    borderRadius: 14,
    border: '1px solid #F5F5F4',
    background: '#fff',
    padding: 14,
    textDecoration: 'none',
    color: 'inherit',
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? 'default' : 'pointer',
  }

  if (disabled) {
    return (
      <div style={cardStyle}>
        <QuickCardContent icon={icon} title={title} desc={desc} />
      </div>
    )
  }

  return (
    <Link href={href} style={cardStyle}>
      <QuickCardContent icon={icon} title={title} desc={desc} />
    </Link>
  )
}

function QuickCardContent({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode
  title: string
  desc: string
}) {
  return (
    <>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FEF3C7',
          color: '#D97706',
        }}
      >
        {icon}
      </div>
      <p style={{ fontSize: 14, fontWeight: 600, color: '#1C1917', margin: '8px 0 2px' }}>
        {title}
      </p>
      <p style={{ fontSize: 12, color: '#78716C', margin: 0, lineHeight: 1.4 }}>
        {desc}
      </p>
      <ChevronRight
        size={14}
        color="#D6D3D1"
        style={{ position: 'absolute', bottom: 14, right: 14 }}
      />
    </>
  )
}

function SettingsRow({
  icon,
  title,
  desc,
  last,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  last?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 16px',
        borderBottom: last ? 'none' : '1px solid #F5F5F4',
        minHeight: 56,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F5F5F4',
          color: '#57534E',
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#1C1917', margin: 0 }}>
          {title}
        </p>
        <p style={{ fontSize: 12, color: '#78716C', margin: '2px 0 0' }}>
          {desc}
        </p>
      </div>
      <ChevronRight size={16} color="#D6D3D1" style={{ flexShrink: 0 }} />
    </div>
  )
}
