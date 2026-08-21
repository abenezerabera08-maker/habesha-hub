-- Add nullable end_at timestamp to events
-- Existing events will have end_at = null (valid — means "no specified ending time")
ALTER TABLE public.events ADD COLUMN end_at timestamp with time zone;

COMMENT ON COLUMN public.events.end_at IS 'Optional event ending time. NULL means the ending time is unspecified.';
