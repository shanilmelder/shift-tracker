import { env } from '../config/env.js';

/**
 * Transactional email, over Resend's HTTP API.
 *
 * Not Supabase Auth's mailer: its templates are driven by GoTrue's own flows and cannot carry
 * a value we generated, which is exactly what a temporary password is. Not nodemailer either —
 * this is one POST with a JSON body, and a dependency plus SMTP connection handling would buy
 * nothing over `fetch`.
 *
 * Every function here reports failure rather than throwing it. Email is the least reliable
 * part of onboarding (unverified domains, bounces, rate limits — all seen on this project),
 * and a manager creating an account must not lose the account because the mail did not go out.
 * Callers surface the temp password in the response instead, so there is always a way through.
 */

export interface EmailResult {
  sent: boolean;
  /** Present only when `sent` is false — for logging and for telling the manager what to do. */
  error?: string;
}

const REQUEST_TIMEOUT_MS = 15_000;

function isConfigured(): boolean {
  return Boolean(env.RESEND_API_KEY && env.RESEND_FROM);
}

async function send(to: string, subject: string, text: string): Promise<EmailResult> {
  if (!isConfigured()) {
    return { sent: false, error: 'Email is not configured (RESEND_API_KEY / RESEND_FROM are unset).' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      // Plain text only: this is a short operational message, and a text body renders
      // identically everywhere without a template to keep in sync.
      body: JSON.stringify({ from: env.RESEND_FROM, to: [to], subject, text }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      // Resend's own message is worth passing through verbatim — "domain is not verified" and
      // "you can only send testing emails to your own address" are the two failures this
      // project actually hits, and both tell the manager precisely what to fix.
      return { sent: false, error: body?.message ?? `Resend returned status ${response.status}.` };
    }
    return { sent: true };
  } catch (error) {
    return {
      sent: false,
      error: controller.signal.aborted ? 'The email provider did not respond in time.' : 'Could not reach the email provider.',
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * The one email this system sends. Deliberately says nothing about what the account can see or
 * do, and names no other staff member — an inbox is not a trusted place to put more than the
 * minimum needed to sign in once.
 */
export async function sendTempPasswordEmail(input: {
  to: string;
  name: string;
  tempPassword: string;
  isReset: boolean;
}): Promise<EmailResult> {
  const subject = input.isReset
    ? `Your ${env.APP_NAME} password has been reset`
    : `Your ${env.APP_NAME} account`;

  const opening = input.isReset
    ? 'Your manager has reset your password. Use the temporary password below to sign in.'
    : 'An account has been created for you. Use the temporary password below to sign in for the first time.';

  const text = [
    `Hi ${input.name},`,
    '',
    opening,
    '',
    `Email:    ${input.to}`,
    `Password: ${input.tempPassword}`,
    '',
    "You'll be asked to choose your own password as soon as you sign in. This temporary one stops working at that point.",
    '',
    "If you weren't expecting this, tell your manager — don't use the password.",
  ].join('\n');

  return send(input.to, subject, text);
}
