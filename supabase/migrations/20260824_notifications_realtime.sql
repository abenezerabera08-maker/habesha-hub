-- =============================================================================
-- Habesha Hub — Enable Realtime for notifications
-- Date: 2026-08-24
--
-- Adds the notifications table to the supabase_realtime publication so that
-- authenticated users can subscribe to postgres_changes INSERT events.
--
-- Security: RLS on notifications (auth.uid() = user_id) ensures each user
-- only receives their own notification events via the realtime channel.
--
-- This migration is idempotent — if the table is already in the publication,
-- the ADD TABLE is a no-op.
-- =============================================================================

-- Ensure the notifications table is in the supabase_realtime publication.
-- By default Supabase includes all tables, but this makes it explicit and
-- survives any future publication configuration changes.
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
