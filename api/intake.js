// Sensoria intake endpoint.
//
// Mirrors the 8 Lakes /api/bookings flow — look the person up by email, update
// or insert, write the record, log a timeline event, then notify — but talks to
// Supabase and Resend over plain REST so the public site stays a dependency-free
// static build. Runs as a Vercel serverless function.

const { randomInt } = require('node:crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'Sensoria <onboarding@resend.dev>';
const NOTIFY = (process.env.INTERNAL_NOTIFICATION_EMAILS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const isConfigured = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

function reference() {
  const d = new Date();
  const stamp = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
  return `SEN-${stamp}-${String(randomInt(0, 10000)).padStart(4, '0')}`;
}

async function sb(path, { method = 'GET', body, prefer } = {}) {
  const headers = {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };
  if (prefer) headers.Prefer = prefer;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message = (data && (data.message || data.error)) || `Supabase responded ${res.status}`;
    throw new Error(message);
  }
  return data;
}

async function sendEmail({ to, subject, text, replyTo }) {
  if (!RESEND_API_KEY || !to || (Array.isArray(to) && !to.length)) return { sent: false };
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: Array.isArray(to) ? to : [to],
        subject,
        text,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });
    if (!res.ok) {
      console.warn('Resend send failed', res.status, await res.text());
      return { sent: false };
    }
    return { sent: true };
  } catch (error) {
    console.warn('Resend send threw', error);
    return { sent: false };
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed.' });
  }

  if (!isConfigured) {
    return res.status(503).json({ ok: false, error: 'The contact form is temporarily unavailable. Please email us directly.' });
  }

  let payload = req.body;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch {
      return res.status(400).json({ ok: false, error: 'Invalid submission.' });
    }
  }
  payload = payload || {};

  // Honeypot: bots fill every field, people never see this one.
  if (clean(payload.website)) {
    return res.status(200).json({ ok: true, reference: null });
  }

  const fullName = clean(payload.name);
  const email = clean(payload.email).toLowerCase();
  const message = clean(payload.message);

  if (!fullName) return res.status(400).json({ ok: false, error: 'Please tell us your name.' });
  if (!isValidEmail(email)) return res.status(400).json({ ok: false, error: 'Please enter a valid email address.' });
  if (!message) return res.status(400).json({ ok: false, error: 'Please add a short message.' });
  if (message.length > 5000) return res.status(400).json({ ok: false, error: 'That message is a little too long — please shorten it.' });

  try {
    const now = new Date().toISOString();

    const existing = await sb(`clients?email=eq.${encodeURIComponent(email)}&select=id&limit=1`);
    const client = existing && existing.length
      ? (await sb(`clients?id=eq.${existing[0].id}`, {
          method: 'PATCH',
          body: { full_name: fullName, updated_at: now },
          prefer: 'return=representation',
        }))[0]
      : (await sb('clients', {
          method: 'POST',
          body: { full_name: fullName, email },
          prefer: 'return=representation',
        }))[0];

    const publicReference = reference();
    const inquiry = (await sb('inquiries', {
      method: 'POST',
      body: {
        public_reference: publicReference,
        client_id: client.id,
        message,
        source: clean(payload.source) || 'website',
      },
      prefer: 'return=representation',
    }))[0];

    await sb('inquiry_events', {
      method: 'POST',
      body: {
        inquiry_id: inquiry.id,
        event_type: 'system',
        direction: 'system',
        title: 'Website inquiry submitted',
        body: `${fullName} submitted the contact form.`,
        created_by: 'website-form',
      },
    });

    await sendEmail({
      to: NOTIFY,
      replyTo: email,
      subject: `New Sensoria inquiry — ${fullName}`,
      text: `Reference: ${publicReference}\nName: ${fullName}\nEmail: ${email}\n\nMessage:\n${message}\n\nReply directly to this email to reach them.`,
    });

    // Deliberately discreet: no subject line or body that discloses what this
    // is about, since inboxes are not always private.
    await sendEmail({
      to: email,
      subject: 'Sensoria — I got your message',
      text: `Hi ${fullName},\n\nThank you for reaching out. I read every message myself and I'll get back to you within a couple of days.\n\n— Claire\nSensoria`,
    });

    return res.status(200).json({ ok: true, reference: publicReference });
  } catch (error) {
    console.error('Intake submission failed', error);
    return res.status(500).json({ ok: false, error: 'Something went wrong saving your message. Please try again, or email us directly.' });
  }
};
