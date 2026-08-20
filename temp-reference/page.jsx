// app/my-tickets/page.jsx
//
// ============================================================================
// READ BEFORE INTEGRATING
// ============================================================================
// I don't have access to your actual repo in this chat, so the parts below
// marked "ASSUMED" are my best reconstruction from the schema notes we've
// built up across sessions — not verified against your real code. Everything
// else (the UI, the card, the status logic) is complete and ready as-is.
//
// Your project already HAS a working /my-tickets fetch (from Stage 5.5.11 —
// "existing page fetches status but doesn't render it yet"). The safest path
// is: keep that existing query, and just feed its result through
// mapOrderToTicket() below (adjusting the field names in that function to
// match your real column names) so it lands in the shape TicketSummaryCard
// expects. Give this whole file to Claude Code with the prompt:
//
//   "Compare fetchMyTickets() in this file against the existing data-fetching
//    logic in app/my-tickets/page.tsx. Replace fetchMyTickets() with the real
//    working query, keeping mapOrderToTicket()'s output shape the same."
//
// ASSUMED column/table names (verify these specifically):
//   - orders.user_id            → FK to the logged-in attendee (profiles.id)
//   - ticket_tiers.name         → tier display name ("VIP", "Jema", etc.)
//   - orders quantity/admits    → not yet in memory notes; guessed as
//                                  orders.quantity, defaults to 1 if absent
//   - rejection reason path     → orders → payments → payment_verifications.notes
//                                  (two-hop join, simplified below — your
//                                  existing page already solved this, reuse it)
// ============================================================================

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase' // ASSUMED path — adjust to your real shared client import
import TicketSummaryCard from '@/components/tickets/TicketSummaryCard'

function mapOrderToTicket(order) {
  const event = order.events
  const tier = order.ticket_tiers
  return {
    id: order.id,
    eventTitle: event?.title ?? 'Untitled event',
    eventDate: event?.event_date,
    venueName: event?.venue_name,
    venueLocation: event?.location,
    tierName: tier?.name ?? 'General Admission',
    admits: order.quantity ?? 1, // ASSUMED column name — verify
    status: order.status, // expected: 'pending' | 'confirmed' | 'rejected'
    checkedInAt: order.checked_in_at ?? null,
    rejectionReason: order.payment_verifications_notes ?? null, // ASSUMED — see header comment
    ticketCode: order.tk_code ?? null,
    orderedAt: order.created_at, // ASSUMED — confirm orders has created_at
    ticketHolderName: order.profiles?.full_name,
  }
}

async function fetchMyTickets(userId) {
  // ASSUMED query shape — see header comment. Swap for your existing working query.
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id,
      status,
      quantity,
      tk_code,
      checked_in_at,
      created_at,
      events ( title, event_date, venue_name, location ),
      ticket_tiers ( name ),
      profiles ( full_name )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map(mapOrderToTicket)
}

export default function MyTicketsPage() {
  const router = useRouter()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login') // ASSUMED route — adjust to your real login path
        return
      }
      try {
        const result = await fetchMyTickets(user.id)
        if (!cancelled) setTickets(result)
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [router])

  function openTicket(ticket) {
    router.push(`/my-tickets/${ticket.id}`)
  }

  return (
    <div className="min-h-full bg-slate-50">
      <div className="max-w-sm mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-5">My Tickets</h1>

        {loading && (
          <p className="text-sm text-slate-400">Loading your tickets…</p>
        )}

        {error && (
          <p className="text-sm text-red-600">Couldn't load your tickets: {error}</p>
        )}

        {!loading && !error && tickets.length === 0 && (
          <div className="text-center py-16">
            <p className="text-slate-500 text-sm">You haven't got any tickets yet.</p>
          </div>
        )}

        {!loading && !error && tickets.length > 0 && (
          <div className="space-y-3">
            {tickets.map((t) => (
              <TicketSummaryCard key={t.id} ticket={t} onOpen={openTicket} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
