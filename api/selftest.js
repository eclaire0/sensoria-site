// TEMPORARY diagnostic endpoint. Delete this file once the contact form works.
// Reports whether each variable is present and what Supabase actually says back.
// Never returns a full key - only a short prefix, enough to tell a publishable
// key from a secret one.

const TOKEN = 'sensoria-check';

function describe(value, { prefix = 0 } = {}) {
  if (!value) return 'MISSING';
  const head = prefix ? `, starts "${value.slice(0, prefix)}"` : '';
  return `set (${value.length} chars${head})`;
}

module.exports = async (req, res) => {
  const key = (req.query && req.query.key) || '';
  if (key !== TOKEN) return res.status(404).json({ error: 'Not found' });

  const url = process.env.SUPABASE_URL || '';
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  const out = {
    env: {
      SUPABASE_URL: url ? `set -> ${url}` : 'MISSING',
      SUPABASE_SERVICE_ROLE_KEY: describe(secret, { prefix: 10 }),
      RESEND_API_KEY: describe(process.env.RESEND_API_KEY, { prefix: 3 }),
      EMAIL_FROM: process.env.EMAIL_FROM || '(using default)',
      INTERNAL_NOTIFICATION_EMAILS: process.env.INTERNAL_NOTIFICATION_EMAILS || 'MISSING',
    },
    warnings: [],
  };

  if (url.endsWith('/')) out.warnings.push('SUPABASE_URL has a trailing slash - remove it');
  if (secret.startsWith('sb_publishable') || secret.includes('"role":"anon"')) {
    out.warnings.push('SUPABASE_SERVICE_ROLE_KEY looks like the PUBLISHABLE key - RLS will block every write');
  }
  if (secret !== secret.trim()) out.warnings.push('SUPABASE_SERVICE_ROLE_KEY has leading/trailing whitespace');

  if (url && secret) {
    for (const table of ['clients', 'inquiries', 'inquiry_events']) {
      try {
        const r = await fetch(`${url.replace(/\/$/, '')}/rest/v1/${table}?select=*&limit=1`, {
          headers: { apikey: secret, Authorization: `Bearer ${secret}` },
        });
        const body = await r.text();
        out[table] = { status: r.status, response: body.slice(0, 300) };
      } catch (error) {
        out[table] = { error: String(error).slice(0, 300) };
      }
    }
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json(out);
};
