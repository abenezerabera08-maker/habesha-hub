-- =============================================================================
-- Habesha Hub — Notifications table
-- Date: 2026-08-24
--
-- Creates the notifications table for the V1 notification system.
-- Types use a text CHECK constraint (consistent with events.status,
-- orders.status, payments.status, etc.) rather than a PostgreSQL enum,
-- because CHECK constraints are easier to extend with ALTER TABLE ADD
-- without owning type maintenance.
--
-- Foreign key: notifications.user_id → profiles.id
--   (consistent with orders.user_id → profiles.id; profiles.id = auth.users.id)
--
-- INSERT is server-only (service_role bypasses RLS). No authenticated-user
-- INSERT policy is created — notifications will be inserted through trusted
-- server-side API routes using adminClient() from lib/api.ts.
--
-- RLS policies:
--   SELECT — user can read their own notifications
--   UPDATE — user can update their own (for marking read)
--   DELETE — none (not required for V1)
-- =============================================================================

-- ─── Table ────────────────────────────────────────────────────────────────────

CREATE TABLE public.notifications (
  id         uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id    uuid NOT NULL,
  type       text NOT NULL,
  title      text NOT NULL,
  message    text NOT NULL,
  data       jsonb,
  read_at    timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,

  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,

  CONSTRAINT notifications_type_check CHECK (
    type IN (
      -- Attendee notifications
      'ticket_purchased',
      'payment_confirmed',
      'event_updated',
      'event_reminder',
      'ticket_checked_in',
      'event_cancelled',
      'event_rescheduled',

      -- Organizer notifications
      'new_ticket_sale',
      'payment_received',
      'attendee_checked_in'
    )
  )
);

COMMENT ON TABLE public.notifications IS
  'System-generated notifications for attendees and organizers. '
  'INSERT is restricted to service_role (server-side only).';

COMMENT ON COLUMN public.notifications.user_id IS
  'Recipient of the notification. References profiles.id (auth.users.id).';

COMMENT ON COLUMN public.notifications.type IS
  'Notification type. Attendee: ticket_purchased, payment_confirmed, event_updated, '
  'event_reminder, ticket_checked_in, event_cancelled, event_rescheduled. '
  'Organizer: new_ticket_sale, payment_received, attendee_checked_in.';

COMMENT ON COLUMN public.notifications.read_at IS
  'NULL = unread. Set to now() when the user marks the notification as read.';

COMMENT ON COLUMN public.notifications.data IS
  'Optional structured metadata (event_id, order_id, tier name, etc.). '
  'Client interprets this based on type.';

-- ─── Indexes ──────────────────────────────────────────────────────────────────

-- Latest notifications for a user: WHERE user_id = ? ORDER BY created_at DESC
CREATE INDEX idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);

-- Unread count for a user: WHERE user_id = ? AND read_at IS NULL
-- Partial index — only rows where read_at IS NULL
CREATE INDEX idx_notifications_user_unread
  ON public.notifications (user_id)
  WHERE read_at IS NULL;

-- Mark/read operations: WHERE id = ? AND user_id = ?
-- Covered by the PK on id + RLS check; no additional index needed.

-- ─── Row Level Security ──────────────────────────────────────────────────────

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- SELECT: a user can only read their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- UPDATE: a user can only update their own notifications
-- (used for marking read: setting read_at)
CREATE POLICY "Users can update own notifications"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- INSERT: no policy for authenticated users
-- Notifications are created server-side only (service_role bypasses RLS).

-- DELETE: no policy (not required for V1)

-- ─── Grants ──────────────────────────────────────────────────────────────────

GRANT ALL ON public.notifications TO anon;
GRANT ALL ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
