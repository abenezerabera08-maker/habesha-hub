// components/tickets/TicketSummaryCard.jsx
'use client'

import { ChevronRight } from 'lucide-react'
import {
  getTierConfig,
  isGroupTier,
  getDisplayStatus,
  STATUS_CONFIG,
  formatEventDate,
  formatCheckedInAt,
  formatOrderedAt,
} from './ticketDisplay'

// Expected `ticket` shape (see app/my-tickets/page.jsx for how a Supabase
// order row gets mapped into this):
// {
//   id, eventTitle, eventDate, tierName, admits, status,
//   checkedInAt, rejectionReason, orderedAt
// }
export default function TicketSummaryCard({ ticket, onOpen }) {
  const tier = getTierConfig(ticket.tierName)
  const displayStatus = getDisplayStatus(ticket)
  const status = STATUS_CONFIG[displayStatus]
  const TierIcon = tier.icon
  const StatusIcon = status.icon
  const groupTicket = isGroupTier(ticket.tierName)

  return (
    <button
      onClick={() => onOpen(ticket)}
      className="w-full text-left bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 active:scale-[0.99] transition-all duration-150 overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      aria-label={`View ${ticket.tierName} ticket for ${ticket.eventTitle}, status: ${status.label}`}
    >
      <div className="flex">
        {/* Left accent bar — communicates tier at a glance without competing with ticket artwork */}
        <div className="w-1.5 shrink-0" style={{ backgroundColor: tier.color }} />

        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-900 truncate">{ticket.eventTitle}</h3>
              <p className="text-sm text-slate-500 mt-0.5">{formatEventDate(ticket.eventDate)}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300 shrink-0 mt-0.5" aria-hidden="true" />
          </div>

          <div className="flex items-center gap-2 mt-3 px-2.5 py-1.5 rounded-lg w-fit" style={{ backgroundColor: tier.bg }}>
            <TierIcon className="w-4 h-4" style={{ color: tier.color }} aria-hidden="true" />
            <span className="text-xs font-bold tracking-wide uppercase" style={{ color: tier.color }}>
              {ticket.tierName}
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs font-medium text-slate-600">
              {groupTicket ? `${ticket.admits} People` : `${ticket.admits} Person`}
            </span>
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-1.5">
              <StatusIcon className="w-4 h-4" style={{ color: status.color }} aria-hidden="true" />
              <span className="text-sm font-semibold" style={{ color: status.color }}>
                {status.label}
              </span>
              {displayStatus === 'checked_in' && (
                <span className="text-xs text-slate-400 ml-1">{formatCheckedInAt(ticket.checkedInAt)}</span>
              )}
            </div>
            <span className="text-xs text-slate-400">Ordered {formatOrderedAt(ticket.orderedAt)}</span>
          </div>

          {displayStatus === 'rejected' && ticket.rejectionReason && (
            <p className="text-xs text-red-600 mt-2">Reason: {ticket.rejectionReason}</p>
          )}
        </div>
      </div>
    </button>
  )
}
