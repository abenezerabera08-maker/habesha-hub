// components/tickets/TicketVisual.jsx
'use client'

import { getTierConfig } from './ticketDisplay'

// Expected `ticket` shape: { eventTitle, tierName, ticketCode }
export default function TicketVisual({ ticket }) {
  const tier = getTierConfig(ticket.tierName)
  const TierIcon = tier.icon

  return (
    <div
      className="relative max-w-sm mx-auto rounded-3xl overflow-hidden shadow-2xl"
      style={{ background: 'linear-gradient(160deg, #0F172A 0%, #1E1B4B 60%, #1E293B 100%)' }}
    >
      {/* Stars scattered across the poster area */}
      <div className="absolute inset-0 opacity-40" aria-hidden="true">
        {[...Array(18)].map((_, i) => (
          <span
            key={i}
            className="absolute text-white"
            style={{ top: `${(i * 37) % 55}%`, left: `${(i * 53) % 92}%`, fontSize: `${6 + (i % 3) * 3}px` }}
          >
            ✦
          </span>
        ))}
      </div>

      <div className="relative px-6 pt-8 pb-6 text-center">
        <p className="text-[11px] tracking-[0.2em] text-slate-300 uppercase font-medium">Habesha Hub Presents</p>
        <h2 className="text-3xl font-extrabold text-white mt-2 leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
          {ticket.eventTitle}
        </h2>
        <div className="inline-flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-full" style={{ backgroundColor: `${tier.color}CC` }}>
          <TierIcon className="w-3.5 h-3.5 text-white" aria-hidden="true" />
          <span className="text-xs font-bold tracking-wide uppercase text-white">{ticket.tierName}</span>
        </div>
      </div>

      {/* Torn-stub divider with punch-out notches */}
      <div className="relative">
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-white/25" />
        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white" />
        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white" />
        <div className="h-3" />
      </div>

      <div className="relative px-6 pb-7 pt-2 flex flex-col items-center">
        {/* Simple generated barcode look — purely decorative, not a real scannable barcode.
            The check-in flow already works off tk_code via typed lookup (app/dashboard/scanner),
            not by scanning this graphic, so this stays visual-only. */}
        <div className="flex items-end gap-[2px] h-10 mt-2" aria-hidden="true">
          {[...Array(38)].map((_, i) => (
            <div
              key={i}
              className="bg-white"
              style={{ width: i % 5 === 0 ? '3px' : '1.5px', height: `${60 + ((i * 17) % 40)}%` }}
            />
          ))}
        </div>
        <p className="text-white text-sm font-mono tracking-[0.3em] mt-2">{ticket.ticketCode || '— — — — —'}</p>
        <p className="text-[10px] tracking-[0.3em] text-slate-400 uppercase mt-1">Admit One</p>
      </div>
    </div>
  )
}
