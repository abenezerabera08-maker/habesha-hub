'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { useNotifications } from '@/components/notification/NotificationProvider'
import type { NotificationRow } from '@/lib/types/notifications'
import { getNotificationIcon, relativeTime, getNotificationHref } from './notificationHelpers'

const PAGE_SIZE = 20

export default function NotificationBell() {
  const { userId } = useAuth()
  const { unreadCount, recentNotifications, decrementUnreadCount, setUnreadCount } = useNotifications()
  const [panelOpen, setPanelOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const bellRef = useRef<HTMLButtonElement>(null)
  const seenIdsRef = useRef<Set<string>>(new Set())

  // Close panel on outside click
  useEffect(() => {
    if (!panelOpen) return

    function handleClickOutside(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        bellRef.current && !bellRef.current.contains(e.target as Node)
      ) {
        setPanelOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [panelOpen])

  // Close panel on Escape
  useEffect(() => {
    if (!panelOpen) return

    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setPanelOpen(false)
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [panelOpen])

  // When panel opens, fetch full notification list
  const fetchNotifications = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from('notifications')
      .select('id, user_id, type, title, message, data, read_at, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)

    if (error) {
      setError('Failed to load notifications.')
      setLoading(false)
      return
    }

    const rows = (data ?? []) as NotificationRow[]
    setNotifications(rows)
    // Track seen IDs for dedup with realtime events
    seenIdsRef.current = new Set(rows.map((n) => n.id))
    setLoading(false)
  }, [userId])

  // Sync realtime notifications into the panel list when panel is open
  useEffect(() => {
    if (!panelOpen) return

    for (const n of recentNotifications) {
      if (!seenIdsRef.current.has(n.id)) {
        seenIdsRef.current.add(n.id)
        setNotifications((prev) => {
          if (prev.some((p) => p.id === n.id)) return prev
          return [n, ...prev]
        })
      }
    }
  }, [panelOpen, recentNotifications])

  const togglePanel = useCallback(() => {
    const opening = !panelOpen
    setPanelOpen(opening)
    if (opening) {
      fetchNotifications()
    }
  }, [panelOpen, fetchNotifications])

  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    const prev = notifications
    // Optimistic update
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
      // Rollback on failure
      setNotifications(prev)
      setUnreadCount(prev.filter((n) => !n.read_at).length)
    }
  }, [notifications, decrementUnreadCount, setUnreadCount])

  const handleMarkAllAsRead = useCallback(async () => {
    const prev = notifications
    const prevCount = unreadCount
    // Optimistic update
    setNotifications((n) =>
      n.map((item) =>
        item.read_at ? item : { ...item, read_at: new Date().toISOString() }
      )
    )
    setUnreadCount(0)

    const res = await fetch('/api/notifications/read-all', {
      method: 'POST',
    })

    if (!res.ok) {
      setNotifications(prev)
      setUnreadCount(prevCount)
    }
  }, [notifications, unreadCount, setUnreadCount])

  const handleNotificationClick = useCallback(async (notification: NotificationRow) => {
    // Mark as read if unread
    if (!notification.read_at) {
      await handleMarkAsRead(notification.id)
    }
    // Navigate if there's a destination
    const href = getNotificationHref(notification.type, notification.data)
    if (href) {
      window.location.href = href
    }
  }, [handleMarkAsRead])

  if (!userId) return null

  const hasUnread = unreadCount > 0
  const badgeDisplay = unreadCount > 99 ? '99+' : unreadCount > 0 ? String(unreadCount) : ''

  return (
    <>
      {/* Bell button — fixed above BottomNav */}
      <button
        ref={bellRef}
        type="button"
        onClick={togglePanel}
        aria-label={hasUnread ? `Notifications (${unreadCount} unread)` : 'Notifications'}
        style={{
          position: 'fixed',
          bottom: 72,
          right: 20,
          zIndex: 10000,
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: '1px solid #E7E5E4',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          transition: 'box-shadow 0.15s',
          flexShrink: 0,
        }}
      >
        <Bell size={20} color={hasUnread ? '#F59E0B' : '#78716C'} />
        {badgeDisplay && (
          <span
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              minWidth: 18,
              height: 18,
              borderRadius: 9,
              background: '#DC2626',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              lineHeight: 1,
              border: '2px solid #fff',
            }}
          >
            {badgeDisplay}
          </span>
        )}
      </button>

      {/* Panel overlay */}
      {panelOpen && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Notifications"
          style={{
            position: 'fixed',
            bottom: 124,
            right: 16,
            zIndex: 10001,
            width: 360,
            maxWidth: 'calc(100vw - 32px)',
            maxHeight: 'calc(100vh - 200px)',
            background: '#fff',
            borderRadius: 16,
            border: '1px solid #E7E5E4',
            boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              borderBottom: '1px solid #F5F5F4',
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 700, color: '#1C1917' }}>
              Notifications
            </span>
            {hasUnread && (
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
                  fontSize: 12,
                  fontWeight: 500,
                  color: '#D97706',
                  padding: 0,
                }}
              >
                <CheckCheck size={14} />
                Mark all as read
              </button>
            )}
          </div>

          {/* Content */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              minHeight: 0,
            }}
          >
            {/* Loading */}
            {loading && (
              <div style={{ padding: 16 }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: i < 2 ? '1px solid #F5F5F4' : 'none' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#F5F5F4', flexShrink: 0 }} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ height: 12, borderRadius: 4, background: '#F5F5F4', width: '70%' }} />
                      <div style={{ height: 12, borderRadius: 4, background: '#F5F5F4', width: '90%' }} />
                      <div style={{ height: 10, borderRadius: 4, background: '#F5F5F4', width: '40%' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error */}
            {error && !loading && (
              <div style={{ padding: 24, textAlign: 'center' }}>
                <p style={{ fontSize: 14, color: '#DC2626', margin: '0 0 8px' }}>{error}</p>
                <button
                  type="button"
                  onClick={fetchNotifications}
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: '#D97706',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Try again
                </button>
              </div>
            )}

            {/* Empty */}
            {!loading && !error && notifications.length === 0 && (
              <div style={{ padding: 32, textAlign: 'center' }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: '#FEF3C7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                  }}
                >
                  <Bell size={24} color="#D97706" />
                </div>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#1C1917', margin: '0 0 4px' }}>
                  You&apos;re all caught up
                </p>
                <p style={{ fontSize: 13, color: '#A8A29E', margin: 0 }}>
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
                        padding: '12px 16px',
                        border: 'none',
                        borderBottom: '1px solid #F5F5F4',
                        background: isUnread ? '#FFFBEB' : '#fff',
                        cursor: href ? 'pointer' : 'default',
                        textAlign: 'left',
                        transition: 'background 0.1s',
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
                          background: isUnread ? '#FEF3C7' : '#F5F5F4',
                        }}
                      >
                        <Icon size={16} color={isUnread ? '#D97706' : '#78716C'} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span
                            style={{
                              fontSize: 13,
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
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: '#F59E0B',
                                flexShrink: 0,
                              }}
                            />
                          )}
                        </div>
                        <p
                          style={{
                            fontSize: 12,
                            color: '#78716C',
                            margin: '2px 0 0',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            lineHeight: 1.4,
                          }}
                        >
                          {n.message}
                        </p>
                        <span style={{ fontSize: 11, color: '#A8A29E', marginTop: 2, display: 'block' }}>
                          {relativeTime(n.created_at)}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
