'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCheck, Bell, Loader2, RefreshCw } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { useNotifications } from '@/components/notification/NotificationProvider'
import type { NotificationRow } from '@/lib/types/notifications'
import { getNotificationIcon, relativeTime, getNotificationHref } from '@/components/notification/notificationHelpers'

const PAGE_SIZE = 20

export default function NotificationsPage() {
  const router = useRouter()
  const { userId, loading: authLoading } = useAuth()
  const { unreadCount, recentNotifications, decrementUnreadCount, setUnreadCount } = useNotifications()
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const seenIdsRef = useRef<Set<string>>(new Set())
  const cursorRef = useRef<{ createdAt: string; id: string } | null>(null)

  const fetchNotifications = useCallback(async (append = false) => {
    if (!userId) return

    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
      setError(null)
    }

    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE) })
      if (append && cursorRef.current) {
        params.set('cursorCreatedAt', cursorRef.current.createdAt)
        params.set('cursorId', cursorRef.current.id)
      }

      const res = await fetch(`/api/notifications/list?${params}`)
      const json = await res.json()

      if (!json.ok) {
        setError('Failed to load notifications.')
        setLoading(false)
        setLoadingMore(false)
        return
      }

      const { rows, hasMore: more } = json.data as { rows: NotificationRow[]; hasMore: boolean }

      if (append) {
        setNotifications((prev) => {
          const existingIds = new Set(prev.map((n) => n.id))
          const deduped = rows.filter((n) => !existingIds.has(n.id))
          return [...prev, ...deduped]
        })
      } else {
        setNotifications(rows)
      }

      // Update cursor to the last row's (created_at, id)
      if (rows.length > 0) {
        const last = rows[rows.length - 1]
        cursorRef.current = { createdAt: last.created_at, id: last.id }
      }

      // Track seen IDs for dedup with realtime events
      for (const n of rows) {
        seenIdsRef.current.add(n.id)
      }

      setHasMore(more)
    } catch {
      setError('Failed to load notifications.')
    }

    setLoading(false)
    setLoadingMore(false)
  }, [userId])

  useEffect(() => {
    if (authLoading) return
    if (!userId) {
      router.replace('/login')
      return
    }
    fetchNotifications()
  }, [userId, authLoading, router, fetchNotifications])

  // Sync realtime notifications into the page list
  useEffect(() => {
    for (const n of recentNotifications) {
      if (!seenIdsRef.current.has(n.id)) {
        seenIdsRef.current.add(n.id)
        setNotifications((prev) => {
          if (prev.some((p) => p.id === n.id)) return prev
          return [n, ...prev]
        })
      }
    }
  }, [recentNotifications])

  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    const prev = notifications
    const prevCount = unreadCount
    setNotifications((n) =>
      n.map((item) =>
        item.id === notificationId ? { ...item, read_at: new Date().toISOString() } : item
      )
    )
    decrementUnreadCount()
    const res = await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId }),
    })
    if (!res.ok) {
      setNotifications(prev)
      setUnreadCount(prevCount)
    }
  }, [notifications, unreadCount, decrementUnreadCount, setUnreadCount])

  const handleMarkAllAsRead = useCallback(async () => {
    const prev = notifications
    const prevCount = unreadCount
    setNotifications((n) =>
      n.map((item) =>
        item.read_at ? item : { ...item, read_at: new Date().toISOString() }
      )
    )
    setUnreadCount(0)
    const res = await fetch('/api/notifications/read-all', { method: 'POST' })
    if (!res.ok) {
      setNotifications(prev)
      setUnreadCount(prevCount)
    }
  }, [notifications, unreadCount, setUnreadCount])

  const handleNotificationClick = useCallback(async (notification: NotificationRow) => {
    if (!notification.read_at) {
      await handleMarkAsRead(notification.id)
    }
    const href = getNotificationHref(notification.type, notification.data)
    if (href) {
      router.push(href)
    }
  }, [handleMarkAsRead, router])

  // Auth loading
  if (authLoading || (!userId && loading)) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px 96px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F5F5F4' }} />
          <div style={{ height: 20, width: 160, borderRadius: 4, background: '#F5F5F4' }} />
        </div>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '16px 0', borderBottom: '1px solid #F5F5F4' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#F5F5F4', flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ height: 14, borderRadius: 4, background: '#F5F5F4', width: '60%' }} />
              <div style={{ height: 14, borderRadius: 4, background: '#F5F5F4', width: '85%' }} />
              <div style={{ height: 10, borderRadius: 4, background: '#F5F5F4', width: '30%' }} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px 96px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Go back"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: '1px solid #E7E5E4',
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <ArrowLeft size={18} color="#374151" />
          </button>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1C1917', margin: 0 }}>
            Notifications
          </h1>
          {unreadCount > 0 && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#D97706',
                background: '#FEF3C7',
                padding: '2px 8px',
                borderRadius: 999,
              }}
            >
              {unreadCount} unread
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllAsRead}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              color: '#D97706',
              padding: 0,
            }}
          >
            <CheckCheck size={15} />
            Mark all read
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            padding: 24,
            textAlign: 'center',
            borderRadius: 14,
            border: '1px solid #FECACA',
            background: '#FEF2F2',
          }}
        >
          <p style={{ fontSize: 14, color: '#DC2626', margin: '0 0 8px' }}>{error}</p>
          <button
            type="button"
            onClick={() => fetchNotifications()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 13,
              fontWeight: 500,
              color: '#D97706',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <RefreshCw size={14} />
            Try again
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && !error && (
        <div>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '16px 0', borderBottom: '1px solid #F5F5F4' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#F5F5F4', flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ height: 14, borderRadius: 4, background: '#F5F5F4', width: '60%' }} />
                <div style={{ height: 14, borderRadius: 4, background: '#F5F5F4', width: '85%' }} />
                <div style={{ height: 10, borderRadius: 4, background: '#F5F5F4', width: '30%' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && notifications.length === 0 && (
        <div style={{ padding: '48px 20px', textAlign: 'center' }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: '#FEF3C7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <Bell size={28} color="#D97706" />
          </div>
          <p style={{ fontSize: 16, fontWeight: 600, color: '#1C1917', margin: '0 0 6px' }}>
            You&apos;re all caught up
          </p>
          <p style={{ fontSize: 14, color: '#A8A29E', margin: 0, lineHeight: 1.5 }}>
            New updates about your tickets and events will appear here.
          </p>
        </div>
      )}

      {/* Notification list */}
      {!loading && !error && notifications.length > 0 && (
        <div>
          {notifications.map((n) => {
            const isUnread = !n.read_at
            const Icon = getNotificationIcon(n.type)
            const href = getNotificationHref(n.type, n.data)

            return (
              <button
                key={n.id}
                type="button"
                onClick={() => handleNotificationClick(n)}
                style={{
                  display: 'flex',
                  gap: 12,
                  width: '100%',
                  padding: '16px 0',
                  borderBottom: '1px solid #F5F5F4',
                  background: 'transparent',
                  cursor: href ? 'pointer' : 'default',
                  textAlign: 'left',
                  transition: 'background 0.1s',
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isUnread ? '#FEF3C7' : '#F5F5F4',
                  }}
                >
                  <Icon size={18} color={isUnread ? '#D97706' : '#78716C'} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: isUnread ? 700 : 600,
                        color: '#1C1917',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {n.title}
                    </span>
                    {isUnread && (
                      <span
                        aria-label="Unread"
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          background: '#F59E0B',
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </div>
                  <p
                    style={{
                      fontSize: 13,
                      color: '#78716C',
                      margin: '3px 0 0',
                      lineHeight: 1.4,
                    }}
                  >
                    {n.message}
                  </p>
                  <span style={{ fontSize: 12, color: '#A8A29E', marginTop: 4, display: 'block' }}>
                    {relativeTime(n.created_at)}
                  </span>
                </div>
              </button>
            )
          })}

          {/* Load more */}
          {hasMore && (
            <div style={{ padding: '20px 0', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => fetchNotifications(true)}
                disabled={loadingMore}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 20px',
                  borderRadius: 10,
                  border: '1px solid #E7E5E4',
                  background: '#fff',
                  color: '#374151',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: loadingMore ? 'not-allowed' : 'pointer',
                  opacity: loadingMore ? 0.6 : 1,
                }}
              >
                {loadingMore ? (
                  <>
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    Loading...
                  </>
                ) : (
                  'Load more'
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
