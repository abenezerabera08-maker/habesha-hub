-- =============================================================================
-- Habesha Hub — Notification retention index
-- Date: 2026-08-24
--
-- Adds a (created_at) index to support the retention cleanup query:
--   DELETE FROM notifications WHERE created_at < now() - interval '90 days'
--
-- The existing idx_notifications_user_created index is (user_id, created_at DESC)
-- which cannot efficiently support a global delete filtered only by created_at.
-- A standalone (created_at) index allows an index scan + tight range for the
-- cleanup worker without scanning the entire table.
-- =============================================================================

CREATE INDEX idx_notifications_created_at
  ON public.notifications (created_at);
