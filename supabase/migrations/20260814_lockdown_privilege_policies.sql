-- =============================================================================
-- Habesha Hub — Privilege-Escalation Lockdown
-- Date: 2026-08-14
--
-- Closes the self-escalation paths the server-boundary change depends on.
-- The app now performs all privileged mutations through server routes
-- (service-role client, which bypasses RLS), so these policies are
-- DEFENSE IN DEPTH against direct client -> supabase calls.
--
-- Fixed paths:
--   * profiles:  a user could UPDATE their own row to role='admin'
--   * events:    an organizer could UPDATE their own event to status='published'
--   * orders:    a buyer could UPDATE their own order to status='confirmed'
--   * payments:  a buyer could UPDATE their own payment to status='approved'
--   * orders/payments/payment_proofs/payment_verifications: client can no
--     longer INSERT these at all (server-only writes), so a buyer can no
--     longer fabricate a free 'confirmed' order.
--
-- Apply section by section in the Supabase SQL editor; run the CHECK query
-- at the end of each section before moving on. If your live policies have
-- different names than the ones listed here, run
--   select tablename, policyname, cmd, roles from pg_policies order by 1,2;
-- first and update the DROP statements to match.
-- =============================================================================

-- =============================================================================
-- SECTION 1: trigger — only admins may change profiles.role
-- =============================================================================

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Changing your own role is not allowed';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- CHECK 1: trigger exists; a non-admin role self-update must now fail.
select tgname, pg_get_triggerdef(t.oid)
from pg_trigger t
where tgname = 'protect_profile_role';

-- =============================================================================
-- SECTION 2: trigger — only admins may write events.status = 'published'
-- =============================================================================

create or replace function public.protect_event_publish()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'published' and not public.is_admin() then
    raise exception 'Only an admin can publish an event';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_event_publish on public.events;
create trigger protect_event_publish
  before update on public.events
  for each row execute function public.protect_event_publish();

-- CHECK 2: trigger exists; an organizer's self-publish must now fail.
select tgname, pg_get_triggerdef(t.oid)
from pg_trigger t
where tgname = 'protect_event_publish';

-- =============================================================================
-- SECTION 3: profiles INSERT — only your own row, and only as 'customer'
-- =============================================================================

drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_insert_role_customer" on public.profiles;

create policy "profiles_insert_role_customer" on public.profiles
  for insert
  with check (id = auth.uid() and role = 'customer');

-- CHECK 3: anon/authenticated can only insert themselves as customer.
select policyname, cmd, roles from pg_policies
where tablename = 'profiles' and cmd = 'INSERT';

-- =============================================================================
-- SECTION 4: profiles UPDATE — self or admin (role changes handled by trigger)
-- =============================================================================

drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_update_self_or_admin" on public.profiles;

create policy "profiles_update_self_or_admin" on public.profiles
  for update
  using (id = auth.uid() or is_admin())
  with check (id = auth.uid() or is_admin());

-- CHECK 4: profile UPDATE still allowed for self (location etc.), role guarded
-- by the Section 1 trigger.
select policyname, cmd, roles from pg_policies
where tablename = 'profiles' and cmd = 'UPDATE';

-- =============================================================================
-- SECTION 5: events INSERT — owner only, non-privileged statuses
-- =============================================================================

drop policy if exists "events_insert_organizer" on public.events;
drop policy if exists "events_insert_owner" on public.events;

create policy "events_insert_owner" on public.events
  for insert
  with check (organizer_id = auth.uid() and status in ('draft', 'pending_review'));

-- CHECK 5: no anon role can insert; status is restricted.
select policyname, cmd, roles from pg_policies
where tablename = 'events' and cmd = 'INSERT';

-- =============================================================================
-- SECTION 6: events UPDATE — owner or admin (publish guarded by trigger)
-- =============================================================================

drop policy if exists "events_update_owner" on public.events;
drop policy if exists "events_update_owner_or_admin" on public.events;

create policy "events_update_owner_or_admin" on public.events
  for update
  using (organizer_id = auth.uid() or is_admin())
  with check (organizer_id = auth.uid() or is_admin());

-- CHECK 6: non-admins cannot write status='published' (trigger + policy).
select policyname, cmd, roles from pg_policies
where tablename = 'events' and cmd = 'UPDATE';

-- =============================================================================
-- SECTION 7: orders INSERT — server-only (client may not fabricate orders)
-- =============================================================================

drop policy if exists "orders_insert_owner" on public.orders;
drop policy if exists "orders_insert_server_only" on public.orders;

create policy "orders_insert_server_only" on public.orders
  for insert
  with check (false);

-- CHECK 7: no policy row grants orders INSERT to anon/authenticated.
select policyname, cmd, roles from pg_policies
where tablename = 'orders' and cmd = 'INSERT';

-- =============================================================================
-- SECTION 8: orders UPDATE — organizer of the event or admin only (no buyer)
-- =============================================================================

drop policy if exists "orders_update_owner" on public.orders;
drop policy if exists "orders_update_organizer_or_admin" on public.orders;

create policy "orders_update_organizer_or_admin" on public.orders
  for update
  using (
    exists (
      select 1 from public.events e
      where e.id = orders.event_id
        and (e.organizer_id = auth.uid() or is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.events e
      where e.id = orders.event_id
        and (e.organizer_id = auth.uid() or is_admin())
    )
  );

-- CHECK 8: a buyer can no longer flip their own order to 'confirmed'.
select policyname, cmd, roles from pg_policies
where tablename = 'orders' and cmd = 'UPDATE';

-- =============================================================================
-- SECTION 9: orders DELETE — owner only while pending_payment (client cleanup)
-- =============================================================================

drop policy if exists "orders_delete_owner" on public.orders;
drop policy if exists "orders_delete_pending_only" on public.orders;

create policy "orders_delete_pending_only" on public.orders
  for delete
  using (user_id = auth.uid() and status = 'pending_payment');

-- CHECK 9: buyer can delete only their own pending_payment orders.
select policyname, cmd, roles from pg_policies
where tablename = 'orders' and cmd = 'DELETE';

-- =============================================================================
-- SECTION 10: payments INSERT — server-only
-- =============================================================================

drop policy if exists "payments_insert_owner" on public.payments;
drop policy if exists "payments_insert_server_only" on public.payments;

create policy "payments_insert_server_only" on public.payments
  for insert
  with check (false);

-- CHECK 10:
select policyname, cmd, roles from pg_policies
where tablename = 'payments' and cmd = 'INSERT';

-- =============================================================================
-- SECTION 11: payments UPDATE — organizer of the event or admin only (no buyer)
-- =============================================================================

drop policy if exists "payments_update_owner" on public.payments;
drop policy if exists "payments_update_organizer_or_admin" on public.payments;

create policy "payments_update_organizer_or_admin" on public.payments
  for update
  using (
    exists (
      select 1 from public.orders o
      join public.events e on e.id = o.event_id
      where o.id = payments.order_id
        and (e.organizer_id = auth.uid() or is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.orders o
      join public.events e on e.id = o.event_id
      where o.id = payments.order_id
        and (e.organizer_id = auth.uid() or is_admin())
    )
  );

-- CHECK 11: a buyer can no longer self-approve their payment.
select policyname, cmd, roles from pg_policies
where tablename = 'payments' and cmd = 'UPDATE';

-- =============================================================================
-- SECTION 12: payment_proofs INSERT/DELETE — server-only
-- =============================================================================

drop policy if exists "payment_proofs_insert_owner" on public.payment_proofs;
drop policy if exists "payment_proofs_insert_server_only" on public.payment_proofs;

create policy "payment_proofs_insert_server_only" on public.payment_proofs
  for insert
  with check (false);

drop policy if exists "payment_proofs_delete_owner" on public.payment_proofs;
drop policy if exists "payment_proofs_delete_server_only" on public.payment_proofs;

create policy "payment_proofs_delete_server_only" on public.payment_proofs
  for delete
  using (false);

-- CHECK 12:
select policyname, cmd, roles from pg_policies
where tablename = 'payment_proofs' and cmd in ('INSERT', 'DELETE');

-- =============================================================================
-- SECTION 13: payment_verifications INSERT — server-only
-- =============================================================================

drop policy if exists "payment_verifications_insert_organizer" on public.payment_verifications;
drop policy if exists "payment_verifications_insert_server_only" on public.payment_verifications;

create policy "payment_verifications_insert_server_only" on public.payment_verifications
  for insert
  with check (false);

-- CHECK 13:
select policyname, cmd, roles from pg_policies
where tablename = 'payment_verifications' and cmd = 'INSERT';

-- =============================================================================
-- FULL VERIFICATION (run after all sections)
-- =============================================================================

-- 1. No client role (anon/authenticated) may INSERT into a money/status table.
select tablename, policyname, cmd, roles
from pg_policies
where tablename in ('orders', 'payments', 'payment_proofs', 'payment_verifications')
  and cmd = 'INSERT'
order by tablename;

-- 2. No buyer (self-owned row) may UPDATE orders or payments.
select tablename, policyname, cmd
from pg_policies
where tablename in ('orders', 'payments') and cmd = 'UPDATE'
order by tablename;

-- 3. Triggers in place.
select tgname from pg_trigger
where tgname in ('protect_profile_role', 'protect_event_publish');
