// Daily keep-alive for the Sensoria Supabase project.
//
// Free Supabase projects pause after about a week without activity, and while
// paused the contact form cannot save enquiries. A Vercel cron calls this once
// a day and runs one tiny read, which counts as activity.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

module.exports = async (req, res) => {
  if (CRON_SECRET && req.headers.authorization !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ ok: false });
  }
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return res.status(503).json({ ok: false, error: 'Supabase is not configured.' });
  }
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/clients?select=id&limit=1`, {
      headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
    });
    if (!r.ok) {
      console.error('Supabase keep-alive failed', r.status);
      return res.status(502).json({ ok: false, status: r.status });
    }
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Supabase keep-alive threw', error);
    return res.status(502).json({ ok: false });
  }
};
