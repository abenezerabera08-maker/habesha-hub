-- =============================================================================
-- Habesha Hub — Notification preferences
-- Date: 2026-08-24
--
-- Stores per-user preferences for in-app notification categories.
-- A user can toggle entire categories on/off rather than individual types.
--
-- Design: one row per (user_id, category). Absence of a row means enabled
-- (default opt-in). This avoids inserting thousands of rows for existing users.
--
-- Categories:
--   event_reminder      → event_reminder
--   ticket_activity     → ticket_purchased, ticket_checked_in
--   payments            → payment_confirmed, payment_received
--   event_changes       → event_updated, event_rescheduled, event_cancelled
--   organizer_activity  → new_ticket_sale, attendee_checked_in
--
-- RLS: users can only read/update their own preferences.
-- No INSERT policy for authenticated users — preferences are created
-- server-side via upsert or by the authenticated user through an API route.
-- =============================================================================

-- ─── Table ────────────────────────────────────────────────────────────────────

CREATE TABLE public.notification_preferences (
  user_id   uuid NOT NULL,
  category  text NOT NULL,
  enabled   boolean NOT NULL DEFAULT true,

  CONSTRAINT notification_preferences_pkey PRIMARY KEY (user_id, category),
  CONSTRAINT notification_preferences_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,

  CONSTRAINT notification_preferences_category_check CHECK (
    category IN (
      'event_reminder',
      'ticket_activity',
      'payments',
      'event_changes',
      'organizer_activity'
    )
  )
);

COMMENT ON TABLE public.notification_preferences IS
  'Per-user in-app notification category preferences. '
  'Absence of a row means the category is enabled (default opt-in).';

COMMENT ON COLUMN public.notification_preferences.category IS
  'Notification category: event_reminder, ticket_activity, payments, '
  'event_changes, organizer_activity.';

COMMENT ON COLUMN public.notification_preferences.enabled IS
  'Whether this category is enabled for the user. Default true.';

-- ─── Indexes ──────────────────────────────────────────────────────────────────

-- Lookup preferences for a user: WHERE user_id = ?
-- Covered by the composite PK (user_id, category).

-- ─── Row Level Security ──────────────────────────────────────────────────────

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- SELECT: a user can only read their own preferences
CREATE POLICY "Users can view own notification preferences"
  ON public.notification_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERT: a user can insert their own preferences
-- (needed for the initial upsert from the client)
CREATE POLICY "Users can insert own notification preferences"
  ON public.notification_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: a user can update their own preferences
CREATE POLICY "Users can update own notification preferences"
  ON public.notification_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: none (not required for V1)

-- ─── Grants ──────────────────────────────────────────────────────────────────

GRANT ALL ON public.notification_preferences TO anon;
GRANT ALL ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;
