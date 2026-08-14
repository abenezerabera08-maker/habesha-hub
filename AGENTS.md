<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Habesha Hub — Agent Rules & Progress Log

This file is for any coding agent (opencode, Claude Code, etc.) working on this
repo. Read it before making changes. Update the Progress Log at the bottom
after every session.

## Project

- **Stack:** Next.js (App Router) + Supabase (Postgres + Auth + Storage), TypeScript.
- **What it is:** Event hosting and ticketing app for Ethiopian community
  events. Organizers create events with ticket tiers and local payment
  methods (TeleBirr, CBE Birr, bank transfer); attendees buy tickets by
  uploading proof of payment, which the organizer manually reviews and
  approves or rejects.
- **Roles today:** `organizer` and `customer` (attendee), stored on
  `profiles.role`. No `admin` role exists yet.

## Working rules — follow these exactly

1. **Explain / How / Check.** For every change: explain what's happening,
   show how to do it (exact file, exact code or SQL), then give a check step
   to verify it worked. Don't skip the check step.
2. **SQL one operation at a time.** Never bundle multiple schema/data changes
   into one statement block without a check query after each one.
3. **Never silently "fix" or optimize.** If a performance or design tradeoff
   exists, say so before writing code — don't just pick one.
4. **No ambiguity.** Exact file paths, exact SQL, explicit sequencing. Don't
   say "update the relevant file" — name it.
5. **Full detail, no abbreviating.** Don't compress instructions to save
   space.
6. **Ask at most one clarifying question at a time**, and only when actually
   blocked — otherwise pick the most reasonable interpretation, state the
   assumption, and proceed.

## Standing rule — Supabase RLS silent-failure pattern

This bit us **four separate times** in one night: `orders`, `profiles`,
`events`, and `ticket_tiers` were all missing an UPDATE (or SELECT) policy
for the organizer role. Supabase does **not** throw an error when a write is
blocked by RLS — the client call reports success, the UI shows "Saved," and
the database silently keeps the old value.

**Before declaring any new insert/update feature done:**

1. Check that a matching policy actually exists for the role/command you're
   using:

```sql
   SELECT policyname, cmd, roles FROM pg_policies WHERE tablename = 'TABLE_NAME';
```

2. After testing a save in the UI, **always** verify directly against the
   database — don't trust the UI's success message:

```sql
   SELECT <changed_columns> FROM TABLE_NAME WHERE id = 'ROW_ID';
```

3. If the value didn't change, the fix is almost always a missing policy
   (usually UPDATE for the owning role), not a bug in the frontend code.

## Known architecture facts

- **Ticket availability view:** `purchasable_ticket_tiers` — a ticket is
  purchasable only if `events.status = 'published'`, `ticket_tiers.is_active
= true`, `quantity_sold < quantity_available`, and `sale_start`/`sale_end`
  bracket `now()`. Sale dates are stored as UTC timestamps — always convert
  local `datetime-local` input values with `.toISOString()` before saving
  (Addis Ababa is UTC+3; raw local strings saved without conversion cause
  tickets to appear unavailable for ~3 hours).
- **Event status lifecycle:** `draft` is the default on creation. From
  `draft`, an organizer can go to `pending_review` via "Submit for Review."
  Admin review is built (`app/admin/page.tsx`, `lib/services/admin.ts` —
  `approveEvent`/`rejectEvent`), confirmed working as of the hardening
  session.
- **Key routes:**
  - `/my-tickets` — attendee order status (pending/confirmed/rejected +
    rejection reason)
  - `/my-events` — organizer's own events list, links to edit pages
  - `/events/[id]/edit` — organizer event management (details, ticket
    tiers, payment methods — editable only while `draft`; ownership-checked
    against `organizer_id`)
  - `/dashboard` — organizer overview (revenue + tickets-sold stat cards)
  - `/dashboard/payments` — payment verification/approval queue
  - `/dashboard/scanner` (planned, not built) — TK-code search-based
    check-in, **not** a camera/QR scanner
- **Bottom nav:** Discover, Saved, Tickets, Account for everyone; Dashboard +
  Scanner added only when `profiles.role === 'organizer'`. No shared auth
  context exists — role is fetched directly in `BottomNav` on mount.
- **Server API boundary:** Privileged/status mutations run through server
  routes with a service-role client (`lib/api.ts`: `requireUser`/
  `requireAdmin`/`runApi`/`adminClient`); client calls them via
  `lib/apiClient.ts` (`apiFetch`/`apiPost` with the user's bearer token). The
  service functions in `lib/services/*` are thin wrappers over those routes.
  RLS is defense-in-depth on top (see lockdown migration). `SUPABASE_SERVICE_ROLE_KEY`
  must exist in `.env.local` or every API route returns 500.
- **Organizers buying their own event's tickets is allowed** — not a bug.

## Open / Next up

1. **Admin approval workflow** — approve/reject (sets `published` / `rejected`)
   and admin role assignment are built (see Progress Log). Remaining:
   - Confirm the event status enum/check constraint in the live DB. Values in
     code: `draft`, `pending_review`, `published`, `rejected`, `archived`
     (`archived` is only in the my-events color map; no write path uses it yet)
   - A notification system (nothing is wired up — the old note about a
     decorative bell icon was stale; there is no bell icon in the codebase)
2. **Ticket check-in system** (its own future stage) — organizer gets a
   search page scoped to their event, looks up a TK code, marks it checked;
   a checked code can't be reused; organizer can download the full attendee
   list to check people off manually if there's a connectivity problem at
   the door. Deliberately not QR/camera-based.
3. **Stage 9** — fuller analytics dashboard (charts, recent sales table)
   beyond the current revenue/tickets-sold stat cards.
4. **Stage 10** — Discover page ranking by city/interest match (filtering
   already correct: published + upcoming only).
5. **Stage 11** — event-interest tagging on the create-event page.

## Progress Log

Add a dated entry here after every session — what was built, what broke,
what got fixed. Keep entries short; this is a changelog, not a diary.

- **Session (tonight):** Fixed RLS bugs blocking payment approve/reject
  persistence and attendee name display on `/dashboard/payments`. Fixed
  ticket sale-date timezone bug. Built bottom nav bar. Built `/dashboard`
  sidebar + stat cards (was a placeholder before). Built `/my-events` and
  the full `/events/[id]/edit` page (details, ticket tiers, payment
  methods), fixing two more missing RLS UPDATE policies along the way
  (`events`, `ticket_tiers`). Split create-event into "Save as Draft" /
  "Submit for Review" buttons. Consolidated edit-page saves into one button.

- **Session (2026-08-14, hardening):** Production-hardening pass. New
  `lib/auth.ts` (`requireRole`), `lib/db.ts` (`expectRow` catches RLS
  silent-write failures), `lib/validation.ts` (realistic Unicode name/number
  validation, tier/payment-method/date rules). New transactional services
  `lib/services/events.ts` (`createEvent`, `submitEventForReview`,
  `replaceTiers`, `replacePaymentMethods`), `lib/services/payments.ts`
  (`checkoutOrder` with full cleanup, `approvePayment`, `rejectPayment` with
  rollback), `lib/services/admin.ts` (`approveEvent`, `rejectEvent`). New
  `app/api/role/route.ts` — signup role now set server-side via
  `SUPABASE_SERVICE_ROLE_KEY` (must be added to `.env.local`) instead of an
  anon-client `profiles.update`. Hardened create-event, edit, checkout,
  `/dashboard/payments`, `/admin`, `/my-tickets`, onboarding, signup pages:
  no UI success without verified DB effect, errors shown, no navigation on
  failure. Removed dead nav items (`/saved`, `/dashboard/scanner`) and dead
  account rows; removed ASCII-stripping input sanitizers; fixed currency to
  ETB. Added `supabase/migrations/20260814_harden_rls_policies.sql`
  (per-table ownership policies incl. organizer/admin subqueries, `is_admin()`
  helper, `profiles.role` default `'customer'`) and `HARDENING.md` report.
  Fixed Next 16 prerender failure on `/signup` (missing Suspense around
  `useSearchParams`). Lint, tsc, and `next build` all pass.

- **Session (2026-08-14, Stage 8.3):** Shipped re-review logic — editing a
  `published`/`pending_review` event resets it to `pending_review`
  (`app/events/[id]/edit/page.tsx`).

- **Session (2026-08-14, admin roles):** Confirmed status values in use from
  code (draft/pending_review/published/rejected/archived; approve→published,
  reject→rejected). Built admin user management: `listUsers` + `setUserRole`
  in `lib/services/admin.ts`, new `app/admin/users/page.tsx` (admin-guarded,
  promotes/demotes customer/organizer/admin, self-demotion blocked), linked
  from `/admin`. Requires the live `profiles` UPDATE policy to allow
  `is_admin()` (per the hardening migration). Lint, tsc, `next build` pass.

- **Session (2026-08-14, API layer + security boundary):** Closed the
  "service layer is the trusted backend" finding. All privileged/status
  mutations now run through server routes (service-role client, RLS
  bypassed): `/api/admin/events/approve`, `/api/admin/events/reject`,
  `/api/admin/users`, `/api/admin/users/role`, `/api/payments/verify`,
  `/api/events/submit`, and two-phase `/api/checkout` + `/api/checkout/confirm`
  (server validates event published + tier purchasable + quantity limits +
  payment-method ownership + proof storage path; server creates order/payment/
  proof rows). New `lib/api.ts` (server helpers: `runApi`, `requireUser`,
  `requireAdmin`, `adminClient`) and `lib/apiClient.ts` (`apiFetch`/`apiPost`
  with bearer token). Services `admin.ts`/`payments.ts`/`submitEventForReview`
  rewired to call the routes — page code unchanged. Client can no longer
  INSERT orders/payments/payment_proofs/payment_verifications, and buyers are
  out of orders/payments UPDATE. RLS lockdown migration
  `supabase/migrations/20260814_lockdown_privilege_policies.sql`
  (`protect_profile_role` + `protect_event_publish` triggers, profiles INSERT
  self-only-as-customer, orders/payments UPDATE organizer-or-admin, server-only
  INSERTs) — NOT applied, run in the SQL editor section by section. Known
  limitation: `quantity_sold` is still never incremented anywhere (availability
  is read-side only; oversell race remains). Lint, tsc, `next build` pass.

- **Session (2026-08-14, API layer + validation hardening):** Checkout,
  payment verification, event submit, and admin endpoints moved to server-side
  API routes (`app/api/checkout`, `app/api/checkout/confirm`,
  `app/api/payments/verify`, `app/api/events/submit`, `app/api/admin/*`) with
  `lib/api.ts` (`requireUser`/`requireAdmin`/`runApi`) and `lib/apiClient.ts`
  (bearer-token `apiFetch`/`apiPost`). Fixed `requireUser` to return a
  token-scoped `db` client (routes were destructuring `db` that didn't exist —
  broke the whole API layer and `tsc`). Closed the medium-severity validation
  gaps from the audit: quantity must be an integer >= 1 and <= max_per_order/
  remaining (route), tier + payment method must belong to the selected event
  (route queries `purchasable_ticket_tiers` and `event_payment_methods` scoped
  by `event_id`), reference number trimmed + capped at 120 chars (new
  `MAX_REFERENCE_LENGTH` in `lib/validation.ts`, enforced in confirm route),
  proof image restricted to JPG/PNG/WebP/HEIC under 5 MB — the client wrapper
  now generates a UUID-based storage path (never the client filename) and the
  confirm route validates the stored object's `metadata.mimetype`/`size`.
  Added `supabase/migrations/20260814_validation_constraints.sql` (DB
  enforcement: `orders.quantity > 0`, `payment_proofs.reference_number` <= 120,
  tier-matches-event and payment-method-matches-event triggers) — run in the
  Supabase SQL editor section by section. Lint, tsc, `next build` all pass.

