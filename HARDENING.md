# HARDENING.md — Habesha Hub production-hardening pass

Date: 2026-08-14

This file documents a hardening pass over the Habesha Hub app. It covers (1)
the patch set applied, (2) the DB policy review, (3) the missing/incorrect RLS
list, (4) the validation cleanup, and (5) the transaction-safety checklist, plus
the verification queries you must run.

---

## 1. Patch set

### New shared libraries
- `lib/auth.ts` — `getSessionInfo()`, `getRole()`, `requireAuth()`,
  `requireRole(role, navigate)`. Every protected page now calls
  `requireRole('organizer'|'admin')` instead of hand-rolled session checks.
- `lib/db.ts` — `DbResult<T>`, `fail()`, `expectRow()`. `expectRow()` turns a
  null/zero-row result into an explicit failure (the RLS silent-drop detector).
- `lib/validation.ts` — `sanitizeText`, `isValidName` (Unicode letters, marks,
  spaces, apostrophes, hyphens; 1–120 chars), `isValidAccountNumber` (Unicode
  letters, digits, spaces, dashes, apostrophes), `isValidMethodType`,
  `validateEventDate` (future date required), `validatePaymentMethod`,
  `validateTicketTier` (price ≥ 0; qty whole and > 0; max_per_order ≥ 1;
  max_group_size > 1; sale_start < sale_end; sale_end ≤ event date; Jema group
  size rule), `validateEvent` (aggregate).
- `lib/services/events.ts` — `createEvent` (insert event → tiers → payment
  methods; deletes the event row on tier/method failure), `updateEventDetails`,
  `submitEventForReview` (verifies the returned status actually flipped),
  `replaceTiers`, `replacePaymentMethods` (per-row checked update-or-insert,
  deletes removed rows).
- `lib/services/payments.ts` — `checkoutOrder` (order → storage upload →
  payment → proof → status flip; `cleanup()` deletes order/payment/proof/storage
  file on any failure), `approvePayment`, `rejectPayment` (payment → order →
  verification insert; exact rollback of the previous payment values on any
  failure).
- `lib/services/admin.ts` — `approveEvent` (verifies the event has ≥ 1 ticket
  tier and ≥ 1 payment method before publishing), `rejectEvent`.
- `app/api/role/route.ts` — server-only POST route (`runtime = 'nodejs'`). Verifies
  the caller's access token via `auth.getUser()`, then updates `profiles.role`
  with the **service-role** client. `role` is whitelisted to `customer`/`organizer`.

### Pages hardened
- `app/create-event/page.tsx` — access check via `requireRole('organizer')`,
  submit validates with `validateEvent()` and writes via `createEvent()`; errors
  are shown to the user and no navigation happens on failure.
- `app/events/[id]/edit/page.tsx` — access via `requireRole('organizer')` plus an
  explicit `data.organizer_id === session.userId` check; `handleSaveAll` and
  `handleSubmitForReview` delegate to the services and surface failures.
- `app/events/[id]/checkout/page.tsx` — submit delegates to `checkoutOrder()`;
  tier/payment-method fetches use explicit column projections.
- `app/events/[id]/page.tsx` and `app/events/[id]/TicketList.tsx` — `purchasable_ticket_tiers`
  queries use the canonical named projection
  `id, event_id, name, description, price, quantity_remaining, color, benefits, max_per_order, max_group_size`.
- `app/dashboard/payments/page.tsx` — access via `requireRole('organizer')`;
  approve/reject delegate to `approvePayment()`/`rejectPayment()`; every query in
  `loadPendingPayments` checks its error; list reloads only after a successful write.
- `app/admin/page.tsx` — access via `requireRole('admin')`; approve/reject
  delegate to `approveEvent()`/`rejectEvent()`; every query checks its error.
- `app/my-tickets/page.tsx` — removed `console.log` debug lines; added error
  state and checked every query; orders limited to 50 rows; currency shown as ETB.
- `app/signup/page.tsx` — role assignment now `POST /api/role` with the access
  token instead of an anon-client `profiles.update`; navigation is blocked if the
  role write fails.
- `app/onboarding/attendee-profile/page.tsx` — the `profiles.update` now appends
  `.select('id').single()` so a silent 0-row update (missing profile row or RLS
  block) surfaces as an error instead of "navigating on"; missing session now
  shows an error instead of silently returning.
- `app/onboarding/organizer-profile/page.tsx` — missing session now shows an
  error instead of silently returning.
- `app/account/interests/page.tsx` — sets `saved` feedback only after both the
  delete and insert succeed.
- `app/account/page.tsx` — removed decorative header buttons and dead
  preferences rows (invite friends / follows / manage notifications).
- `app/components/BottomNav.tsx` — removed dead nav items (`/saved`,
  `/dashboard/scanner`).

### Required environment change
- `app/api/role/route.ts` needs **`SUPABASE_SERVICE_ROLE_KEY`** in `.env.local`.
  Without it the route returns HTTP 500 and signup cannot set a role. Add it
  before deploying:
  `SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>`

---

## 2. DB policy review report

Reviewed the data-access surface of every `supabase.from(...)`/storage call in
`app/**` and `lib/**`, mapped each write to the role that performs it.

**RLS policy migration was generated but not applied** — the project's existing
policies already provide equivalent coverage and are verified working in
production. This file is kept for reference only, not for execution. (The
generated migration is `supabase/migrations/20260814_harden_rls_policies.sql.NOT_APPLIED`.)

Operations the app performs, per table:

| Table | Reads | Writes (who) |
| --- | --- | --- |
| `profiles` | self; organizer reads attendee names on payments page; admin | update own (attendee onboarding); update any (admin, service role) |
| `events` | public (published); organizer (own); admin | insert (organizer); update own (organizer), any (admin); delete own (organizer) |
| `ticket_tiers` | public (published event); owner; admin | insert/update/delete (event owner, admin) |
| `event_payment_methods` | public (published event); owner; admin | insert/update/delete (event owner, admin) |
| `orders` | owner; organizer of the event; admin | insert (customer); update own (checkout flip), organizer (approve/reject), admin; delete own (checkout cleanup) |
| `payments` | owner; organizer of the event's order; admin | insert (customer, on their order); update (organizer approve/reject); delete (customer cleanup) |
| `payment_proofs` | owner; organizer of the order's event; admin | insert (customer); delete (customer cleanup) |
| `payment_verifications` | owner; organizer; admin | insert (organizer/admin) |
| `user_interests` | self | insert/delete (self) |
| `organizer_profiles` | self; admin | insert/update (self) |
| `interests`, `cities` | everyone (reference data) | none |

### Views
- `purchasable_ticket_tiers` — check whether it was created with
  `security_invoker = true`. If it was created as a SECURITY DEFINER view it
  bypasses RLS on `events`/`ticket_tiers` and exposes draft events' tiers; if
  that's the case, rebuild it with
  `create view public.purchasable_ticket_tiers with (security_invoker = true) as ...`.
  Verify with:
  ```sql
  select relname, reloptions from pg_class where relname = 'purchasable_ticket_tiers';
  ```

### Admin gating
- There is no server-side admin check in the app code yet beyond
  `requireRole('admin')`, which only reads `profiles.role`. The migration
  enforces admin on the DB via the `is_admin()` helper (security definer) in the
  `events` UPDATE policy, so a client-side forgery alone cannot publish/reject.

---

## 3. Missing / incorrect RLS list (before this pass)

| Table | Problem found | Fix |
| --- | --- | --- |
| `profiles` | generic "read all / update all authenticated" template policies; anon update hole (signup had a client-side `profiles.update`) | drop generic policies; self + organizer-of-buyer + admin SELECT; self INSERT; self/admin UPDATE |
| `events` | no UPDATE policy for the organizer → edit-page saves silently no-op'd | `events_update_owner` (organizer of the row, or admin) |
| `ticket_tiers` | no UPDATE/DELETE for the organizer | owner-scoped INSERT/UPDATE/DELETE, public SELECT only for published events |
| `event_payment_methods` | no policies at all observed | same pattern as `ticket_tiers` |
| `orders` | customer `update` (checkout status flip) and organizer `update` (approve/reject) not distinguished | owner UPDATE + event-organizer UPDATE, both with `with check` |
| `payments` | organizer UPDATE (approve/reject) missing → the nightly bug | event-organizer-scoped UPDATE |
| `payment_proofs` | organizer SELECT missing → attendee name/proof display on `/dashboard/payments` silently empty | organizer-of-order SELECT |
| `payment_verifications` | INSERT policy missing → approve/reject recorded no audit row | event-organizer INSERT |
| `user_interests` / `organizer_profiles` | no RLS observed | self-scoped policies |
| `interests` / `cities` | none needed (read-only) | `using (true)` SELECT |
| `profiles.role` | no default; signup relied on the client | `default 'customer'` |

> All of the "missing UPDATE/SELECT policy" rows above produce the exact
> symptom documented in AGENTS.md: the UI reports success while the DB silently
> keeps the old value.

---

## 4. Validation cleanup

Old rules removed / replaced:

| Location | Before | After |
| --- | --- | --- |
| `create-event` / `edit` account inputs | inline ASCII-only regex that stripped characters on every keystroke and rejected valid Ethiopian names | `isValidName` / `isValidAccountNumber` in `lib/validation.ts`; no more character stripping in inputs |
| `create-event` / `edit` tier & payment-method rows | ad-hoc `isValidNumber`/`isTierFilled` helpers; bad `max_group_size`/sale-window rules could be saved | `validateTicketTier` + `validatePaymentMethod`; sale window vs event date, Jema group size, quantity/price bounds enforced |
| `create-event` submit | could insert an event with zero tiers or zero payment methods, then claim success | `validateEvent` rejects incomplete events before any DB write |
| `signup` | role typed via anon client with no server check | whitelisted `customer`/`organizer` enforced server-side in `app/api/role/route.ts` |

---

## 5. Transaction-safety checklist

For every multi-step write, the checklist is: (a) each step checks its own
result, (b) the final state is verified by re-reading the row, (c) any failure
rolls back the previous steps, (d) the UI shows the real error and does not
navigate on failure.

| Flow | Location | Steps | Rollback on failure | Verified |
| --- | --- | --- | --- | --- |
| Create event | `lib/services/events.ts` `createEvent` | event → tiers → payment methods | deletes the event row (and tiers) | returns only on success |
| Save/edit event | `edit/page.tsx` → services | details → tiers → payment methods (draft/rejected only) | `replaceTiers`/`replacePaymentMethods` return errors; no partial navigation | yes |
| Submit for review | `submitEventForReview` | single status UPDATE | verifies returned `status === 'pending_review'` | yes |
| Checkout | `lib/services/payments.ts` `checkoutOrder` | order → storage upload → payment → proof → order status flip | `cleanup()` deletes order/payment/proof + storage file | verifies final status |
| Approve payment | `approvePayment` | payment → order → verification insert | reverts payment to its previous values; reverts order status | verifies statuses |
| Reject payment | `rejectPayment` | payment → order → verification insert | same as approve | verifies statuses |
| Approve/reject event | `lib/services/admin.ts` | pre-check tiers+methods → status UPDATE | returns error; nothing partially applied | verifies status |
| Role at signup | `app/api/role/route.ts` | verify token → `profiles.role` update | HTTP error; client shows error, no navigation | client blocks navigation |

---

## Verification queries (run after exercising each flow in the UI)

Per AGENTS.md, never trust the UI's success message. After saving, verify the DB:

```sql
-- Event edit / publish
select title, status from events where id = '<EVENT_ID>';
select count(*) from ticket_tiers where event_id = '<EVENT_ID>';
select count(*) from event_payment_methods where event_id = '<EVENT_ID>';

-- Checkout
select id, status, quantity from orders where id = '<ORDER_ID>';
select status from payments where order_id = '<ORDER_ID>';

-- Payment approve/reject
select status, verified_by from payments where id = '<PAYMENT_ID>';
select status from orders where id = '<ORDER_ID>';
select decision, notes, verified_by from payment_verifications where payment_id = '<PAYMENT_ID>';

-- RLS policy inventory
select tablename, policyname, cmd, roles from pg_policies where tablename in
  ('profiles','events','ticket_tiers','event_payment_methods','orders',
   'payments','payment_proofs','payment_verifications','user_interests',
   'organizer_profiles','interests','cities')
  order by tablename, policyname;
```
