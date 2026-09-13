// TEMPORARY. Attempts one send through Resend and returns their exact response,
// so the failure can be diagnosed without access to the Resend dashboard.
// Delete once notification email is confirmed working.

const TOKEN = 'sensoria-check';

module.exports = async (req, res) => {
  if (((req.query && req.query.key) || '') !== TOKEN) {
    return res.status(404).json({ error: 'Not found' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'Sensoria <onboarding@resend.dev>';
  const to = (process.env.INTERNAL_NOTIFICATION_EMAILS || '')
    .split(',').map((s) => s.trim()).filter(Boolean);

  if (!apiKey) return res.status(200).json({ error: 'RESEND_API_KEY missing' });
  if (!to.length) return res.status(200).json({ error: 'INTERNAL_NOTIFICATION_EMAILS missing' });

  try {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to,
      subject: 'Sensoria delivery test',
      text: 'If you are reading this, notification email works.',
    }),
  });

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    sending_from: from,
    sending_to: to,
    resend_status: r.status,
    resend_response: (await r.text()).slice(0, 600),
  });
  } catch (error) {
    return res.status(200).json({
      sending_from: from,
      sending_to: to,
      threw: String(error && error.stack ? error.stack : error).slice(0, 600),
    });
  }
};
