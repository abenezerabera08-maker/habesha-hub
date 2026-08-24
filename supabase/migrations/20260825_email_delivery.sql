-- =============================================================================
-- Habesha Hub — Email notification delivery (Step 9)
-- Date: 2026-08-25
--
-- 1. notification_email_deliveries table
--    Outbox pattern: each row represents one email to send. The worker claims
--    pending rows, sends via provider, marks sent/failed. UNIQUE(notification_id)
--    guarantees idempotency — one notification produces at most one email.
--
-- 2. notification_preferences channel columns
--    Adds in_app_enabled and email_enabled to replace the single enabled column.
--    Existing rows: in_app_enabled = enabled, email_enabled = true (opt-in default).
--    Default for new users: both true.
--
-- RLS on email_deliveries: service_role only (worker is server-side).
-- No client access needed.
-- =============================================================================

-- ─── 1. Email deliveries table ────────────────────────────────────────────────

CREATE TABLE public.notification_email_deliveries (
  id              uuid DEFAULT gen_random_uuid() NOT NULL,
  notification_id uuid NOT NULL,
  user_id         uuid NOT NULL,
  recipient_email text NOT NULL,
  status          text NOT NULL DEFAULT 'pending',
  attempts        integer NOT NULL DEFAULT 0,
  max_attempts    integer NOT NULL DEFAULT 5,
  last_error      text,
  provider_id     text,
  created_at      timestamp with time zone DEFAULT now() NOT NULL,
  updated_at      timestamp with time zone DEFAULT now() NOT NULL,
  sent_at         timestamp with time zone,

  CONSTRAINT notification_email_deliveries_pkey PRIMARY KEY (id),
  CONSTRAINT notification_email_deliveries_notification_id_key
    UNIQUE (notification_id),
  CONSTRAINT notification_email_deliveries_notification_id_fkey
    FOREIGN KEY (notification_id) REFERENCES public.notifications(id) ON DELETE CASCADE,
  CONSTRAINT notification_email_deliveries_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,

  CONSTRAINT notification_email_deliveries_status_check CHECK (
    status IN ('pending', 'processing', 'sent', 'failed')
  ),
  CONSTRAINT notification_email_deliveries_attempts_check CHECK (
    attempts >= 0
  ),
  CONSTRAINT notification_email_deliveries_max_attempts_check CHECK (
    max_attempts >= 1
  )
);

COMMENT ON TABLE public.notification_email_deliveries IS
  'Email delivery outbox for notification system. One row per notification email. '
  'Worker claims pending rows, sends via provider, marks sent/failed.';

COMMENT ON COLUMN public.notification_email_deliveries.status IS
  'pending → processing → sent | failed. Retried on transient failure up to max_attempts.';

COMMENT ON COLUMN public.notification_email_deliveries.recipient_email IS
  'Denoised from auth.users at creation time. Stored to avoid repeated auth lookups.';

COMMENT ON COLUMN public.notification_email_deliveries.provider_id IS
  'Provider-assigned ID (e.g. Resend email ID) for tracking and dedup.';

-- ─── Indexes ──────────────────────────────────────────────────────────────────

-- Worker fetch: WHERE status = 'pending' ORDER BY created_at LIMIT N
CREATE INDEX idx_email_deliveries_status_created
  ON public.notification_email_deliveries (status, created_at);

-- Lookup by notification for idempotency check
-- Covered by UNIQUE(notification_id).

-- Lookup by user for monitoring
CREATE INDEX idx_email_deliveries_user_id
  ON public.notification_email_deliveries (user_id);

-- ─── Row Level Security ──────────────────────────────────────────────────────

ALTER TABLE public.notification_email_deliveries ENABLE ROW LEVEL SECURITY;

-- No policies for authenticated or anon — service_role only (worker is server-side).
-- Users do not need direct access to delivery records in V1.

-- ─── Grants ──────────────────────────────────────────────────────────────────

GRANT ALL ON public.notification_email_deliveries TO service_role;

-- ─── 2. Add channel columns to notification_preferences ──────────────────────

-- Add new columns with safe defaults
ALTER TABLE public.notification_preferences
  ADD COLUMN in_app_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN email_enabled boolean NOT NULL DEFAULT true;

-- Migrate existing data: old 'enabled' column becomes in_app_enabled
-- email_enabled defaults to true (opt-in for important transactional emails)
UPDATE public.notification_preferences
  SET in_app_enabled = enabled,
      email_enabled = true;

-- Add comments
COMMENT ON COLUMN public.notification_preferences.in_app_enabled IS
  'Whether in-app notifications are enabled for this category. Default true.';

COMMENT ON COLUMN public.notification_preferences.email_enabled IS
  'Whether email notifications are enabled for this category. Default true.';

-- The old 'enabled' column is kept for backward compatibility but is no longer
-- the primary channel toggle. New code uses in_app_enabled / email_enabled.
