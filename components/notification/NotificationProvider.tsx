'use client'

/**
 * NotificationProvider — centralized realtime subscription for notifications.
 *
 * Architecture:
 * - Single Supabase channel subscription per authenticated user
 * - Listens for INSERT events on the notifications table
 * - Maintains unreadCount and recentNotifications in shared state
 * - Provides context for NotificationBell and /notifications page
 * - Cleans up subscription on user change and unmount
 *
 * Security: Supabase RLS (auth.uid() = user_id) filters the realtime events
 * so each user only receives their own notifications.
 *
 * Fallback: If realtime is unavailable, the existing normal fetch in
 * NotificationBell and the notifications page still work independently.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import type { NotificationRow } from '@/lib/types/notifications'

type NotificationContextValue = {
  unreadCount: number
  recentNotifications: NotificationRow[]
  /** Decrement unread count by 1 (call after marking one notification as read). */
  decrementUnreadCount: () => void
  /** Set unread count to an exact value (call after marking all as read). */
  setUnreadCount: (n: number) => void
}

const NotificationContext = createContext<NotificationContextValue>({
  unreadCount: 0,
  recentNotifications: [],
  decrementUnreadCount: () => {},
  setUnreadCount: () => {},
})

export function useNotifications(): NotificationContextValue {
  return useContext(NotificationContext)
}

const RECENT_LIMIT = 20

export default function NotificationProvider({ children }: { children: ReactNode }) {
  const { userId, loading: authLoading } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [recentNotifications, setRecentNotifications] = useState<NotificationRow[]>([])

  // Ref to track the current channel for cleanup
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  // Ref to track the current userId for stale-closure prevention
  const userIdRef = useRef<string | null>(null)

  // ─── Fetch initial unread count ──────────────────────────────────────────
  useEffect(() => {
    if (authLoading || !userId) {
      setUnreadCount(0)
      setRecentNotifications([])
      return
    }

    let active = true

    async function fetchInitial() {
      const { data, error } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', userId)
        .is('read_at', null)

      if (!active) return
      if (!error && data) {
        setUnreadCount(data.length)
      }
    }

    fetchInitial()
    return () => { active = false }
  }, [userId, authLoading])

  // ─── Realtime subscription ───────────────────────────────────────────────
  useEffect(() => {
    if (authLoading || !userId) return

    // Track userId for the subscription callback
    userIdRef.current = userId

    const channelName = `notifications:${userId}`

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          // Stale-closure guard: ignore events for a previous user
          if (userIdRef.current !== userId) return

          const newRow = payload.new as NotificationRow

          // Security: double-check the notification belongs to the current user
          // (Supabase RLS should already enforce this, but belt-and-suspenders)
          if (newRow.user_id !== userId) return

          // Add to recent notifications (dedup by ID)
          setRecentNotifications((prev) => {
            if (prev.some((n) => n.id === newRow.id)) return prev
            // Newest first — prepend and trim to limit
            return [newRow, ...prev].slice(0, RECENT_LIMIT)
          })

          // Increment unread count
          setUnreadCount((c) => c + 1)
        }
      )
      .subscribe((status) => {
        // Log subscription status for debugging but don't surface to user
        if (status === 'CHANNEL_ERROR') {
          console.error('[NotificationProvider] Realtime channel error for user:', userId)
        }
      })

    channelRef.current = channel

    return () => {
      channelRef.current = null
      supabase.removeChannel(channel)
    }
  }, [userId, authLoading])

  // ─── Context value (stable references) ──────────────────────────────────
  const decrementUnreadCount = useCallback(() => {
    setUnreadCount((c) => Math.max(0, c - 1))
  }, [])

  const contextValue: NotificationContextValue = {
    unreadCount,
    recentNotifications,
    decrementUnreadCount,
    setUnreadCount,
  }

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  )
}
