import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, CheckCircle2, Clock, XCircle, Users, Crown, Star, Ticket as TicketIcon, MapPin, Calendar, User, Hash } from 'lucide-react';

// ---------------------------------------------------------------------------
// MOCK DATA — matches the 4 examples from the reference mockup.
// In the real app this shape is produced by mapping Supabase order/event/
// ticket_tier rows (see MyTicketsPage.jsx / TicketDetailPage.jsx for that).
// ---------------------------------------------------------------------------
const MOCK_TICKETS = [
  {
    id: '1',
    eventTitle: 'ADWA Fight Night',
    eventDate: '2026-08-29T16:38:00',
    doorsOpen: '5:00 PM',
    venueName: 'Adwa Victory Memorial',
    venueLocation: 'Addis Ababa, Ethiopia',
    tierName: 'General Admission',
    admits: 1,
    price: 0,
    status: 'confirmed',
    checkedInAt: null,
    rejectionReason: null,
    ticketCode: 'ABC123',
    orderedAt: '2026-08-18',
    ticketHolderName: 'Abenezer Tesfaye',
  },
  {
    id: '2',
    eventTitle: 'ADWA Fight Night',
    eventDate: '2026-08-29T16:38:00',
    doorsOpen: '5:00 PM',
    venueName: 'Adwa Victory Memorial',
    venueLocation: 'Addis Ababa, Ethiopia',
    tierName: 'VIP',
    admits: 1,
    price: 250,
    status: 'checked_in',
    checkedInAt: '2026-08-29T17:42:00',
    rejectionReason: null,
    ticketCode: 'VIP789',
    orderedAt: '2026-08-18',
    ticketHolderName: 'Abenezer Tesfaye',
  },
  {
    id: '3',
    eventTitle: 'ADWA Fight Night',
    eventDate: '2026-08-29T16:38:00',
    doorsOpen: '5:00 PM',
    venueName: 'Adwa Victory Memorial',
    venueLocation: 'Addis Ababa, Ethiopia',
    tierName: 'Backstage',
    admits: 1,
    price: 500,
    status: 'rejected',
    checkedInAt: null,
    rejectionReason: 'qwertyuiop',
    ticketCode: null,
    orderedAt: '2026-08-14',
    ticketHolderName: 'Abenezer Tesfaye',
  },
  {
    id: '4',
    eventTitle: 'ADWA Fight Night',
    eventDate: '2026-08-29T16:38:00',
    doorsOpen: '5:00 PM',
    venueName: 'Adwa Victory Memorial',
    venueLocation: 'Addis Ababa, Ethiopia',
    tierName: 'Jema',
    admits: 5,
    price: 1000,
    status: 'confirmed',
    checkedInAt: null,
    rejectionReason: null,
    ticketCode: 'JEM456',
    orderedAt: '2026-08-18',
    ticketHolderName: 'Abenezer Tesfaye',
  },
];

// ---------------------------------------------------------------------------
// TIER CONFIG — accent color + icon per ticket tier. Falls back to a neutral
// slate style for any tier name not listed here (e.g. Early Bird, Balcony
// Stand), so new tiers never render unstyled.
// ---------------------------------------------------------------------------
const TIER_CONFIG = {
  'general admission': { color: '#2563EB', bg: '#EFF6FF', ring: '#BFDBFE', icon: TicketIcon },
  vip: { color: '#B45309', bg: '#FFFBEB', ring: '#FDE68A', icon: Crown },
  backstage: { color: '#7C3AED', bg: '#F5F3FF', ring: '#DDD6FE', icon: Star },
  jema: { color: '#16A34A', bg: '#F0FDF4', ring: '#BBF7D0', icon: Users },
  'early bird': { color: '#0D9488', bg: '#F0FDFA', ring: '#99F6E4', icon: Clock },
  'balcony stand': { color: '#E11D48', bg: '#FFF1F2', ring: '#FECDD3', icon: TicketIcon },
};
function getTierConfig(tierName) {
  const key = (tierName || '').trim().toLowerCase();
  return TIER_CONFIG[key] || { color: '#475569', bg: '#F8FAFC', ring: '#E2E8F0', icon: TicketIcon };
}
function isGroupTier(tierName) {
  return (tierName || '').trim().toLowerCase() === 'jema';
}

// ---------------------------------------------------------------------------
// STATUS — derives a single display status from order status + check-in time.
// A rejected payment is NEVER treated as a usable ticket (per spec section 4).
// ---------------------------------------------------------------------------
function getDisplayStatus(ticket) {
  if (ticket.checkedInAt) return 'checked_in';
  return ticket.status; // 'confirmed' | 'pending' | 'rejected'
}
const STATUS_CONFIG = {
  confirmed: { label: 'Confirmed', color: '#16A34A', bg: '#F0FDF4', icon: CheckCircle2 },
  checked_in: { label: 'Checked In', color: '#2563EB', bg: '#EFF6FF', icon: CheckCircle2 },
  pending: { label: 'Payment Pending', color: '#B45309', bg: '#FFFBEB', icon: Clock },
  rejected: { label: 'Payment Failed', color: '#DC2626', bg: '#FEF2F2', icon: XCircle },
};

function formatEventDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
function formatCheckedInAt(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
function formatOrderedAt(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// ---------------------------------------------------------------------------
// TicketSummaryCard — the compact card shown in the My Tickets list.
// Entire card is clickable/keyboard-focusable, not just a chevron button.
// ---------------------------------------------------------------------------
function TicketSummaryCard({ ticket, onOpen }) {
  const tier = getTierConfig(ticket.tierName);
  const displayStatus = getDisplayStatus(ticket);
  const status = STATUS_CONFIG[displayStatus];
  const TierIcon = tier.icon;
  const StatusIcon = status.icon;
  const groupTicket = isGroupTier(ticket.tierName);

  return (
    <button
      onClick={() => onOpen(ticket)}
      className="w-full text-left bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 active:scale-[0.99] transition-all duration-150 overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      style={{ '--tw-ring-color': tier.color }}
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

          <div
            className="flex items-center gap-2 mt-3 px-2.5 py-1.5 rounded-lg w-fit"
            style={{ backgroundColor: tier.bg }}
          >
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
  );
}

// ---------------------------------------------------------------------------
// TicketVisual — the immersive visual ticket, reused on the detail page.
// Dark, poster-style card with a torn-stub divider and a barcode footer.
// ---------------------------------------------------------------------------
function TicketVisual({ ticket }) {
  const tier = getTierConfig(ticket.tierName);
  const TierIcon = tier.icon;

  return (
    <div className="relative max-w-sm mx-auto rounded-3xl overflow-hidden shadow-2xl" style={{
      background: 'linear-gradient(160deg, #0F172A 0%, #1E1B4B 60%, #1E293B 100%)',
    }}>
      {/* Stars scattered across the poster area */}
      <div className="absolute inset-0 opacity-40" aria-hidden="true">
        {[...Array(18)].map((_, i) => (
          <span
            key={i}
            className="absolute text-white"
            style={{
              top: `${(i * 37) % 55}%`,
              left: `${(i * 53) % 92}%`,
              fontSize: `${6 + (i % 3) * 3}px`,
            }}
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
        <div
          className="inline-flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-full"
          style={{ backgroundColor: `${tier.color}CC` }}
        >
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
        {/* Simple generated barcode look */}
        <div className="flex items-end gap-[2px] h-10 mt-2" aria-hidden="true">
          {[...Array(38)].map((_, i) => (
            <div
              key={i}
              className="bg-white"
              style={{ width: (i % 5 === 0) ? '3px' : '1.5px', height: `${60 + ((i * 17) % 40)}%` }}
            />
          ))}
        </div>
        <p className="text-white text-sm font-mono tracking-[0.3em] mt-2">{ticket.ticketCode || '— — — — —'}</p>
        <p className="text-[10px] tracking-[0.3em] text-slate-400 uppercase mt-1">Admit One</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TicketDetailView
// ---------------------------------------------------------------------------
function TicketDetailView({ ticket, onBack }) {
  const displayStatus = getDisplayStatus(ticket);
  const status = STATUS_CONFIG[displayStatus];
  const StatusIcon = status.icon;
  const groupTicket = isGroupTier(ticket.tierName);

  return (
    <div className="min-h-full bg-slate-50">
      <div className="sticky top-0 bg-white/90 backdrop-blur border-b border-slate-200 px-4 py-3 flex items-center gap-2 z-10">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium text-sm px-2 py-1.5 rounded-lg hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          My Tickets
        </button>
      </div>

      <div className="max-w-sm mx-auto px-4 py-6">
        <TicketVisual ticket={ticket} />

        <div
          className="flex items-center gap-2 mt-5 px-4 py-3 rounded-xl"
          style={{ backgroundColor: status.bg }}
        >
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
              <p className="text-sm font-medium text-slate-900">{groupTicket ? `${ticket.admits} People` : `${ticket.admits} Person`}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <User className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs text-slate-400">Ticket Holder</p>
              <p className="text-sm font-medium text-slate-900">{ticket.ticketHolderName}</p>
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
              <p className="text-xs text-slate-500">Doors open {ticket.doorsOpen}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 mt-3">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-slate-900">{ticket.venueName}</p>
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
  );
}

// ---------------------------------------------------------------------------
// MyTicketsList
// ---------------------------------------------------------------------------
function MyTicketsList({ tickets, onOpen }) {
  return (
    <div className="min-h-full bg-slate-50">
      <div className="max-w-sm mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-5">My Tickets</h1>
        <div className="space-y-3">
          {tickets.map((t) => (
            <TicketSummaryCard key={t.id} ticket={t} onOpen={onOpen} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root preview — toggles between the list and detail view, mimicking
// client-side navigation. In the real app this is two separate routes.
// ---------------------------------------------------------------------------
export default function TicketExperiencePreview() {
  const [selected, setSelected] = useState(null);

  return (
    <div className="w-full min-h-[700px] bg-slate-100 font-sans">
      {selected ? (
        <TicketDetailView ticket={selected} onBack={() => setSelected(null)} />
      ) : (
        <MyTicketsList tickets={MOCK_TICKETS} onOpen={setSelected} />
      )}
    </div>
  );
}
