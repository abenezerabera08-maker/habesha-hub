-- Habesha Hub — Server-side validation hardening (DB enforcement layer)
-- Date: 2026-08-14
-- Applies to: orders, payment_proofs, payments
--
-- WHY: checkoutOrder() in lib/services/payments.ts runs in the browser, so its
-- input checks are bypassable. These constraints and triggers make the database
-- itself reject the same invalid payloads the audit flagged:
--   1. orders.quantity accepted without checking > 0
--   2. payment_proofs.reference_number stored as unbounded free text
--   3. orders.ticket_tier_id trusted without verifying it belongs to orders.event_id
--   4. payments.payment_method_id trusted without verifying it belongs to the
--      order's event
--
-- Run this in the Supabase SQL editor, section by section, and run the CHECK
-- query at the end of each section before moving on. Never bundle two sections
-- together. If a section errors on existing data, clean that data first, then
-- rerun just that section.

-- =============================================================================
-- SECTION 1: orders.quantity must be a positive whole number
-- =============================================================================

alter table public.orders
  add constraint orders_quantity_positive check (quantity > 0);

-- CHECK 1: the constraint exists.
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.orders'::regclass
  and conname = 'orders_quantity_positive';

-- =============================================================================
-- SECTION 2: payment_proofs.reference_number is length-bounded
-- =============================================================================

-- Matches MAX_REFERENCE_LENGTH = 120 in lib/validation.ts.
alter table public.payment_proofs
  add constraint payment_proofs_reference_number_length
  check (reference_number is null or char_length(reference_number) <= 120);

-- CHECK 2: the constraint exists.
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.payment_proofs'::regclass
  and conname = 'payment_proofs_reference_number_length';

-- =============================================================================
-- SECTION 3: an order's ticket tier must belong to the order's event
-- =============================================================================

create or replace function public.check_order_tier_matches_event()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
    from public.ticket_tiers tt
    where tt.id = new.ticket_tier_id
      and tt.event_id = new.event_id
  ) then
    raise exception 'The selected ticket type does not belong to this event.';
  end if;
  return new;
end;
$$;

create trigger orders_tier_event_check
  before insert on public.orders
  for each row
  execute function public.check_order_tier_matches_event();

-- CHECK 3: the trigger exists.
select tgname
from pg_trigger
where tgrelid = 'public.orders'::regclass
  and tgname = 'orders_tier_event_check';

-- =============================================================================
-- SECTION 4: a payment's method must belong to the order's event
-- =============================================================================

create or replace function public.check_payment_method_matches_event()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
    from public.orders o
    join public.event_payment_methods epm
      on epm.id = new.payment_method_id
      and epm.event_id = o.event_id
    where o.id = new.order_id
  ) then
    raise exception 'The selected payment method is not available for this event.';
  end if;
  return new;
end;
$$;

create trigger payments_payment_method_event_check
  before insert on public.payments
  for each row
  execute function public.check_payment_method_matches_event();

-- CHECK 4: the trigger exists.
select tgname
from pg_trigger
where tgrelid = 'public.payments'::regclass
  and tgname = 'payments_payment_method_event_check';

-- =============================================================================
-- FULL VERIFICATION (run after all sections)
-- =============================================================================

-- 1. All four enforcement points are live.
select
  (select conname from pg_constraint where conrelid = 'public.orders'::regclass and conname = 'orders_quantity_positive') as orders_quantity_constraint,
  (select conname from pg_constraint where conrelid = 'public.payment_proofs'::regclass and conname = 'payment_proofs_reference_number_length') as reference_length_constraint,
  (select tgname from pg_trigger where tgrelid = 'public.orders'::regclass and tgname = 'orders_tier_event_check') as orders_tier_trigger,
  (select tgname from pg_trigger where tgrelid = 'public.payments'::regclass and tgname = 'payments_payment_method_event_check') as payments_method_trigger;

-- 2. The DB rejects a zero-quantity order (expect an error, no row inserted).
--    insert into public.orders (user_id, event_id, ticket_tier_id, quantity, total_price, status)
--    values ('<ANY_USER>', '<ANY_EVENT>', '<ANY_TIER>', 0, 0, 'pending_payment');

-- 3. After a real checkout in the UI, confirm the cross-table guards held:
--    select o.id, o.event_id, o.ticket_tier_id, tt.event_id as tier_event_id
--    from public.orders o
--    join public.ticket_tiers tt on tt.id = o.ticket_tier_id
--    where o.id = '<ORDER_ID>';
--
--    select p.id, p.payment_method_id, o.event_id, epm.event_id as method_event_id
--    from public.payments p
--    join public.orders o on o.id = p.order_id
--    join public.event_payment_methods epm on epm.id = p.payment_method_id
--    where p.id = '<PAYMENT_ID>';
