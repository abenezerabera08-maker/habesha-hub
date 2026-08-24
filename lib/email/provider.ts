/**
 * Email provider abstraction.
 *
 * Uses Resend REST API directly — no SDK dependency.
 * All functions are server-side only (require RESEND_API_KEY env var).
 *
 * Provider errors are categorized into transient (retryable) and permanent
 * (do not retry) to support the email worker's retry logic.
 */

export type EmailSendResult =
  | { ok: true; providerId: string }
  | { ok: false; error: string; transient: boolean }

function getApiKey(): string {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY environment variable is not set.')
  return key
}

function getFromAddress(): string {
  const from = process.env.EMAIL_FROM_ADDRESS
  if (!from) throw new Error('EMAIL_FROM_ADDRESS environment variable is not set.')
  return from
}

function getFromName(): string {
  return process.env.EMAIL_FROM_NAME || 'HabeshaHub'
}

function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL
  if (!url) throw new Error('NEXT_PUBLIC_APP_URL environment variable is not set.')
  return url.replace(/\/+$/, '')
}

export { getAppUrl }

/**
 * Send an email via Resend REST API.
 *
 * @param to - Recipient email address
 * @param subject - Email subject line
 * @param html - Email body (HTML string)
 * @param options - Optional: replyTo address
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  options?: { replyTo?: string }
): Promise<EmailSendResult> {
  const apiKey = getApiKey()
  const from = `${getFromName()} <${getFromAddress()}>`

  const body: Record<string, unknown> = {
    from,
    to: [to],
    subject,
    html,
  }
  if (options?.replyTo) {
    body.reply_to = options.replyTo
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const json = await res.json().catch(() => null)

    if (!res.ok) {
      const statusCode = res.status
      const message = json?.message || json?.error || `HTTP ${statusCode}`

      // Categorize errors: 4xx (except 429) = permanent, 429/5xx = transient
      const transient = statusCode === 429 || statusCode >= 500

      console.error(
        `[Email] Provider error ${statusCode}: ${message} (to: ${to}, transient: ${transient})`
      )

      return { ok: false, error: message, transient }
    }

    const providerId = json?.id as string | undefined
    if (!providerId) {
      return { ok: false, error: 'Provider returned no email id.', transient: false }
    }

    return { ok: true, providerId }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[Email] Network error: ${message} (to: ${to})`)
    // Network errors are transient
    return { ok: false, error: message, transient: true }
  }
}

/**
 * Check if email configuration is present and valid.
 * Returns { ok: true } or { ok: false, error: string }.
 */
export function validateEmailConfig(): { ok: true } | { ok: false; error: string } {
  const missing: string[] = []
  if (!process.env.RESEND_API_KEY) missing.push('RESEND_API_KEY')
  if (!process.env.EMAIL_FROM_ADDRESS) missing.push('EMAIL_FROM_ADDRESS')
  if (!process.env.NEXT_PUBLIC_APP_URL) missing.push('NEXT_PUBLIC_APP_URL')

  if (missing.length > 0) {
    return {
      ok: false,
      error: `Missing email environment variables: ${missing.join(', ')}`,
    }
  }
  return { ok: true }
}
