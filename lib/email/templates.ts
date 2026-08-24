/**
 * Email templates for HabeshaHub notification emails.
 *
 * All templates are pure functions that return { subject, html }.
 * HTML is email-compatible (inline styles, no external CSS).
 *
 * Each template uses data from the notification's `data` JSON field.
 * Templates should not query the database — all needed data is passed in.
 */

import { getAppUrl } from '@/lib/email/provider'
import type { NotificationType } from '@/lib/types/notifications'

type EmailTemplate = {
  subject: string
  html: string
}

// ─── Shared layout ─────────────────────────────────────────────────────────────

function emailShell(content: string, previewText?: string): string {
  const appUrl = getAppUrl()
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${previewText ? `<meta name="x-apple-disable-message-reformatting">` : ''}
</head>
<body style="margin:0;padding:0;background-color:#F5F5F4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  ${previewText ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${previewText}</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F5F4;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#FFFFFF;border-radius:12px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color:#1C1917;padding:24px 32px;text-align:center;">
              <a href="${appUrl}" style="color:#F59E0B;font-size:20px;font-weight:700;text-decoration:none;letter-spacing:-0.5px;">
                HabeshaHub
              </a>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px 24px;border-top:1px solid #F5F5F4;text-align:center;">
              <p style="margin:0;font-size:12px;color:#A8A29E;line-height:1.5;">
                HabeshaHub — Connecting Communities Through Events<br>
                <a href="${appUrl}/account/notifications" style="color:#78716C;text-decoration:underline;">Manage notification preferences</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background-color:#1C1917;color:#FFFFFF;font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:8px;margin-top:16px;">${label}</a>`
}

function infoRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 0;font-size:14px;color:#78716C;vertical-align:top;width:120px;">${label}</td>
    <td style="padding:8px 0;font-size:14px;color:#1C1917;font-weight:500;">${value}</td>
  </tr>`
}

// ─── Template data types ───────────────────────────────────────────────────────

type PaymentConfirmedData = {
  event_id?: string
  event_name?: string
  tier_name?: string
  order_id?: string
  quantity?: number
  total_price?: number
}

type EventReminderData = {
  event_id?: string
  event_title?: string
  event_date?: string
  event_time?: string
  venue_name?: string
  venue_location?: string
  city?: string
}

type EventRescheduledData = {
  event_id?: string
  event_name?: string
  newDate?: string
  previousDate?: string
}

type EventCancelledData = {
  event_id?: string
  event_name?: string
}

type NewTicketSaleData = {
  event_id?: string
  event_name?: string
  tier_name?: string
  order_id?: string
  quantity?: number
  buyer_name?: string
}

type PaymentReceivedData = {
  event_id?: string
  event_name?: string
  order_id?: string
  amount?: number
  buyer_name?: string
}

// ─── Templates ─────────────────────────────────────────────────────────────────

function paymentConfirmed(data: Record<string, unknown>): EmailTemplate {
  const d = data as PaymentConfirmedData
  const eventName = d.event_name || 'your event'
  const appUrl = getAppUrl()

  const rows = [
    d.tier_name ? infoRow('Ticket', d.tier_name) : '',
    d.quantity ? infoRow('Quantity', String(d.quantity)) : '',
    d.total_price !== undefined ? infoRow('Total', `ETB ${d.total_price.toLocaleString()}`) : '',
  ]
    .filter(Boolean)
    .join('')

  return {
    subject: `Payment confirmed — ${eventName}`,
    html: emailShell(
      `
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1C1917;">Payment Confirmed</h1>
        <p style="margin:0 0 24px;font-size:15px;color:#57534E;line-height:1.6;">
          Your payment for <strong>${eventName}</strong> has been confirmed. You're all set!
        </p>
        ${rows ? `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAFAF9;border-radius:8px;padding:16px;margin-bottom:24px;">
            <tr><td style="padding:16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${rows}
              </table>
            </td></tr>
          </table>
        ` : ''}
        ${button(`${appUrl}/my-tickets`, 'View My Tickets')}
      `,
      `Payment confirmed for ${eventName}`
    ),
  }
}

function eventReminder(data: Record<string, unknown>): EmailTemplate {
  const d = data as EventReminderData
  const eventName = d.event_title || 'your event'
  const appUrl = getAppUrl()

  const dateStr = d.event_date
    ? new Date(d.event_date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : ''

  const timeStr = d.event_date
    ? new Date(d.event_date).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : ''

  const locationParts = [d.venue_name, d.venue_location, d.city].filter(Boolean)
  const locationStr = locationParts.join(', ')

  const rows = [
    dateStr ? infoRow('Date', dateStr) : '',
    timeStr ? infoRow('Time', timeStr) : '',
    locationStr ? infoRow('Location', locationStr) : '',
  ]
    .filter(Boolean)
    .join('')

  return {
    subject: `Reminder: ${eventName} is tomorrow`,
    html: emailShell(
      `
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1C1917;">Event Reminder</h1>
        <p style="margin:0 0 24px;font-size:15px;color:#57534E;line-height:1.6;">
          Your event <strong>${eventName}</strong> is coming up soon. Get ready!
        </p>
        ${rows ? `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFFBEB;border-radius:8px;padding:16px;margin-bottom:24px;border:1px solid #FDE68A;">
            <tr><td style="padding:16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${rows}
              </table>
            </td></tr>
          </table>
        ` : ''}
        ${button(`${appUrl}/my-tickets`, 'View Ticket Details')}
      `,
      `Reminder: ${eventName} is tomorrow`
    ),
  }
}

function eventRescheduled(data: Record<string, unknown>): EmailTemplate {
  const d = data as EventRescheduledData
  const eventName = d.event_name || 'your event'
  const appUrl = getAppUrl()

  let previousDateStr = ''
  if (d.previousDate) {
    previousDateStr = new Date(d.previousDate).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  let newDateStr = ''
  if (d.newDate) {
    newDateStr = new Date(d.newDate).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  return {
    subject: `Event rescheduled — ${eventName}`,
    html: emailShell(
      `
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1C1917;">Event Rescheduled</h1>
        <p style="margin:0 0 24px;font-size:15px;color:#57534E;line-height:1.6;">
          <strong>${eventName}</strong> has been rescheduled to a new date.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFF7ED;border-radius:8px;padding:16px;margin-bottom:24px;border:1px solid #FED7AA;">
          <tr><td style="padding:16px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              ${previousDateStr ? infoRow('Previous', previousDateStr) : ''}
              ${newDateStr ? infoRow('New date', newDateStr) : ''}
            </table>
          </td></tr>
        </table>
        <p style="margin:0 0 16px;font-size:14px;color:#78716C;line-height:1.5;">
          Please check the event page for the latest details.
        </p>
        ${button(`${appUrl}/events/${d.event_id || ''}`, 'View Event')}
      `,
      `Event rescheduled: ${eventName}`
    ),
  }
}

function eventCancelled(data: Record<string, unknown>): EmailTemplate {
  const d = data as EventCancelledData
  const eventName = d.event_name || 'your event'

  return {
    subject: `Event cancelled — ${eventName}`,
    html: emailShell(
      `
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#DC2626;">Event Cancelled</h1>
        <p style="margin:0 0 24px;font-size:15px;color:#57534E;line-height:1.6;">
          <strong>${eventName}</strong> has been cancelled by the organizer.
        </p>
        <div style="background-color:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:16px;margin-bottom:24px;">
          <p style="margin:0;font-size:14px;color:#991B1B;line-height:1.5;">
            If you have already paid for this event, please contact the organizer directly for information about refunds.
          </p>
        </div>
      `,
      `Event cancelled: ${eventName}`
    ),
  }
}

function newTicketSale(data: Record<string, unknown>): EmailTemplate {
  const d = data as NewTicketSaleData
  const eventName = d.event_name || 'your event'
  const appUrl = getAppUrl()

  const rows = [
    d.tier_name ? infoRow('Ticket type', d.tier_name) : '',
    d.quantity ? infoRow('Quantity', String(d.quantity)) : '',
    d.buyer_name ? infoRow('Buyer', d.buyer_name) : '',
  ]
    .filter(Boolean)
    .join('')

  return {
    subject: `New ticket sale — ${eventName}`,
    html: emailShell(
      `
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1C1917;">New Ticket Sale</h1>
        <p style="margin:0 0 24px;font-size:15px;color:#57534E;line-height:1.6;">
          A new ticket has been purchased for <strong>${eventName}</strong>.
        </p>
        ${rows ? `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F0FDF4;border-radius:8px;padding:16px;margin-bottom:24px;border:1px solid #BBF7D0;">
            <tr><td style="padding:16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${rows}
              </table>
            </td></tr>
          </table>
        ` : ''}
        ${button(`${appUrl}/dashboard/payments`, 'View Dashboard')}
      `,
      `New ticket sale for ${eventName}`
    ),
  }
}

function paymentReceived(data: Record<string, unknown>): EmailTemplate {
  const d = data as PaymentReceivedData
  const eventName = d.event_name || 'your event'
  const appUrl = getAppUrl()

  const rows = [
    d.amount !== undefined ? infoRow('Amount', `ETB ${d.amount.toLocaleString()}`) : '',
    d.buyer_name ? infoRow('Buyer', d.buyer_name) : '',
  ]
    .filter(Boolean)
    .join('')

  return {
    subject: `Payment received — ${eventName}`,
    html: emailShell(
      `
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1C1917;">Payment Received</h1>
        <p style="margin:0 0 24px;font-size:15px;color:#57534E;line-height:1.6;">
          A payment for <strong>${eventName}</strong> has been confirmed.
        </p>
        ${rows ? `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F0FDF4;border-radius:8px;padding:16px;margin-bottom:24px;border:1px solid #BBF7D0;">
            <tr><td style="padding:16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${rows}
              </table>
            </td></tr>
          </table>
        ` : ''}
        ${button(`${appUrl}/dashboard/payments`, 'View Payments')}
      `,
      `Payment received for ${eventName}`
    ),
  }
}

// ─── Template registry ─────────────────────────────────────────────────────────

type TemplateFn = (data: Record<string, unknown>) => EmailTemplate

const TEMPLATES: Partial<Record<NotificationType, TemplateFn>> = {
  payment_confirmed: paymentConfirmed,
  event_reminder: eventReminder,
  event_rescheduled: eventRescheduled,
  event_cancelled: eventCancelled,
  new_ticket_sale: newTicketSale,
  payment_received: paymentReceived,
}

/**
 * Get the email template for a notification type.
 * Returns null if the type has no email template (not email-eligible).
 */
export function getEmailTemplate(
  type: NotificationType,
  data: Record<string, unknown> | null
): EmailTemplate | null {
  const fn = TEMPLATES[type]
  if (!fn) return null
  return fn(data ?? {})
}
