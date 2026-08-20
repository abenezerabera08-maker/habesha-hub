// app/my-tickets/[ticketId]/page.jsx
//
// Same header notice as app/my-tickets/page.jsx applies here — fetchTicketById()
// below is an ASSUMED query. Reuse your existing single-order fetch if one
// already exists, and just map its result into the shape TicketVisual and
// this page expect (see mapOrderToTicket in app/my-tickets/page.jsx).

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, Users, User, Hash, Calendar, MapPin } from 'lucide-react'
import { supabase } from '@/lib/supabase' // ASSUMED path — adjust to your real shared client import
import TicketVisual from '@/components/tickets/TicketVisual'
import {
  isGroupTier,
  getDisplayStatus,
  STATUS_CONFIG,
  formatEventDate,
  formatCheckedInAt,
} from '@/components/tickets/ticketDisplay'

function mapOrderToTicket(order) {
  const event = order.events
  const tier = order.ticket_tiers
  return {
    id: order.id,
    eventTitle: event?.title ?? 'Untitled event',
    eventDate: event?.event_date,
    doorsOpen: null, // not in current schema — omit or compute from event_date if you add a doors-open field later
    venueName: event?.venue_name,
    venueLocation: event?.location,
    tierName: tier?.name ?? 'General Admission',
    admits: order.quantity ?? 1, // ASSUMED column name — verify
    status: order.status,
    checkedInAt: order.checked_in_at ?? null,
    rejectionReason: order.payment_verifications_notes ?? null, // ASSUMED — see app/my-tickets/page.jsx header
    ticketCode: order.tk_code ?? null,
    ticketHolderName: order.profiles?.full_name,
  }
}

async function fetchTicketById(orderId) {
  // ASSUMED query shape — verify table/column names against your real schema.
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id,
      status,
      quantity,
      tk_code,
      checked_in_at,
      events ( title, event_date, venue_name, location ),
      ticket_tiers ( name ),
      profiles ( full_name )
    `)
    .eq('id', orderId)
    .single()

  if (error) throw error
  return mapOrderToTicket(data)
}

export default function TicketDetailPage() {
  const router = useRouter()
  const params = useParams()
  const ticketId = params.ticketId

  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const result = await fetchTicketById(ticketId)
        if (!cancelled) setTicket(result)
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    if (ticketId) load()
    return () => { cancelled = true }
  }, [ticketId])

  if (loading) {
    return (
      <div className="min-h-full bg-slate-50 flex items-center justify-center py-16">
        <p className="text-sm text-slate-400">Loading ticket…</p>
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div className="min-h-full bg-slate-50 flex flex-col items-center justify-center py-16 gap-3">
        <p className="text-sm text-red-600">Couldn't load this ticket{error ? `: ${error}` : ''}.</p>
        <button onClick={() => router.push('/my-tickets')} className="text-sm text-blue-600 font-medium">
          Back to My Tickets
        </button>
      </div>
    )
  }

  const displayStatus = getDisplayStatus(ticket)
  const status = STATUS_CONFIG[displayStatus]
  const StatusIcon = status.icon
  const groupTicket = isGroupTier(ticket.tierName)

  return (
    <div className="min-h-full bg-slate-50">
      <div className="sticky top-0 bg-white/90 backdrop-blur border-b border-slate-200 px-4 py-3 flex items-center gap-2 z-10">
        <button
          onClick={() => router.push('/my-tickets')}
          className="flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium text-sm px-2 py-1.5 rounded-lg hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          My Tickets
        </button>
      </div>

      <div className="max-w-sm mx-auto px-4 py-6">
        <TicketVisual ticket={ticket} />

        <div className="flex items-center gap-2 mt-5 px-4 py-3 rounded-xl" style={{ backgroundColor: status.bg }}>
          <StatusIcon className="w-5 h-5 shrink-0" style={{ color: status.color }} aria-hidden="true" />
          <div>
            <p className="text-sm font-bold" style={{ color: status.color }}>{status.label}</p>
            {displayStatus === 'checked_in' && (
              <p className="text-xs" style={{ color: status.color }}>{formatCheckedInAt(ticket.checkedInAt)}</p>
            )}
            {displayStatus === 'rejected' && ticket.rejectionReason && (
              <p className="text-xs" style={{ color: status.color }}>Reason: {ticket.rejectionReason}</p>
            )}
          </div>
        </div>

        <div className="mt-4 bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          <div className="flex items-center gap-3 px-4 py-3">
            <Users className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs text-slate-400">Admits</p>
              <p className="text-sm font-medium text-slate-900">
                {groupTicket ? `${ticket.admits} People` : `${ticket.admits} Person`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <User className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs text-slate-400">Ticket Holder</p>
              <p className="text-sm font-medium text-slate-900">{ticket.ticketHolderName ?? '—'}</p>
            </div>
          </div>
          {ticket.ticketCode && (
            <div className="flex items-center gap-3 px-4 py-3">
              <Hash className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-xs text-slate-400">Ticket Code</p>
                <p className="text-sm font-medium text-slate-900 font-mono">{ticket.ticketCode}</p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-bold tracking-wide text-slate-400 uppercase mb-3">Event</p>
          <div className="flex items-start gap-3">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-slate-900">{formatEventDate(ticket.eventDate)}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 mt-3">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-slate-900">{ticket.venueName ?? '—'}</p>
              <p className="text-xs text-slate-500">{ticket.venueLocation}</p>
            </div>
          </div>
        </div>

        {displayStatus !== 'rejected' && displayStatus !== 'checked_in' && (
          <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-blue-50 rounded-xl">
            <p className="text-xs text-blue-700">Show this ticket at the entrance. Screenshots will not be accepted.</p>
          </div>
        )}
      </div>
    </div>
  )
}
