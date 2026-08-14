-- =============================================================================
-- Habesha Hub — orders check-in columns
-- Date: 2026-08-15
-- Applies to: orders
--
-- WHY: the check-in feature needs to (a) store the attendee's TK code on an
-- order the moment a payment is approved, (b) stamp when/who checked the order
-- in at the door.
--
-- Added to orders:
--   * tk_code        — 6-char alphanumeric code (uppercase, no 0/O, 1/I),
--                      generated server-side in lib/tkcode.ts and written by
--                      app/api/payments/verify when a payment is approved.
--                      Unique so the scanner lookup is by exact code.
--   * checked_in_at  — when the order was scanned in (null until checked).
--   * checked_in_by  — who scanned it in (profiles.id of the organizer/admin).
--
-- Run in the Supabase SQL editor, section by section. Run the CHECK query at
-- the end of each section before moving on. Never bundle two sections together.
-- =============================================================================

-- =============================================================================
-- SECTION 1: add the columns
-- =============================================================================

alter table public.orders
  add column if not exists tk_code text,
  add column if not exists checked_in_at timestamptz,
  add column if not exists checked_in_by uuid;

-- CHECK 1: all three columns exist with the right types.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'orders'
  and column_name in ('tk_code', 'checked_in_at', 'checked_in_by')
order by column_name;

-- =============================================================================
-- SECTION 2: unique index on tk_code (and the FK on checked_in_by)
-- =============================================================================

create unique index if not exists orders_tk_code_key
  on public.orders (tk_code)
  where tk_code is not null;

alter table public.orders
  drop constraint if exists orders_checked_in_by_fkey;

alter table public.orders
  add constraint orders_checked_in_by_fkey
  foreign key (checked_in_by) references public.profiles (id)
  on delete set null;

-- CHECK 2: index + FK in place.
select indexname, indexdef
from pg_indexes
where tablename = 'orders' and indexname = 'orders_tk_code_key';

select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.orders'::regclass
  and conname = 'orders_checked_in_by_fkey';

-- =============================================================================
-- FULL VERIFICATION
-- =============================================================================

-- A scan of the final state of the orders table shape.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'orders'
order by ordinal_position;
