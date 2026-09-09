# Environment variables

Set these in Vercel → Project → Settings → Environment Variables, and in a local
`.env.local` if you run the function locally with `vercel dev`.

Sensoria uses its own Supabase project, deliberately separate from the shared
Adventure Therapy project that 8 Lakes Tours writes into. Intake messages here
are far more sensitive than tour bookings, and the two client lists should not
share a database, an access list, or an email-keyed identity.

```bash
SUPABASE_URL=https://<your-sensoria-project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
EMAIL_FROM="Sensoria <hello@yourdomain.com>"
INTERNAL_NOTIFICATION_EMAILS=claire@example.com
```

Notes:

- `SUPABASE_SERVICE_ROLE_KEY` and `RESEND_API_KEY` are server-only. They are read
  inside `api/intake.js` and must never appear in page markup or `script.js`.
- Every table has row level security on with no anon policies, so the service
  role key is the only way in. Treat it like a password.
- `INTERNAL_NOTIFICATION_EMAILS` is comma-separated if more than one person
  should be notified.
- `EMAIL_FROM` must be a domain verified in Resend. Until the domain is verified,
  Resend's `onboarding@resend.dev` sender works for testing.
- If `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is missing the endpoint
  returns a 503 with a friendly message rather than failing silently.

## Applying the schema

Run `supabase/migrations/0001_sensoria_schema.sql` once against the new project
(Supabase dashboard → SQL Editor → paste → Run).

## Data flow

```txt
contact form (index.html)
  -> POST /api/intake
    -> clients   (looked up by email, updated or inserted)
    -> inquiries (one row per submission, with a SEN- reference)
    -> inquiry_events (timeline entry, created_by = website-form)
  -> Resend: internal notification to Claire (reply-to = the sender)
  -> Resend: discreet confirmation to the sender
```
