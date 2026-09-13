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
  Resend's `onboarding@resend.dev` sender works — but only for mail addressed to
  the Resend account holder's own address. Anything else comes back 403, which is
  why the visitor confirmation email cannot work before launch, and why
  `INTERNAL_NOTIFICATION_EMAILS` currently has to be the signup address rather
  than the business one.
- Paste keys with a copy button, never retyped or routed through a document. A
  Resend key once arrived with a Cyrillic `М` (U+041C) in place of a Latin `M`.
  Node refuses non-ASCII in an HTTP header, so the send threw before it left the
  building, and `sendEmail` caught it and returned quietly. Nothing was visibly
  wrong: rows saved, no email, no error.
- If `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is missing the endpoint
  returns a 503 with a friendly message rather than failing silently.

## Applying the schema

Run both migrations once against the project, in order, via Supabase dashboard →
SQL Editor → paste → Run:

1. `0001_sensoria_schema.sql` — the tables
2. `0002_service_role_grants.sql` — table privileges for `service_role`

The second one is not optional. `service_role` bypasses row level security, but
that is separate from being allowed to touch a table at all, and tables created
through the SQL editor do not inherit the grants. Without it every request comes
back `42501 permission denied for table clients` and the form reports that
something went wrong saving the message.

## Before the domain goes live

- Rotate `RESEND_API_KEY`. The one in use was sent through a chat transcript.
- Verify the domain in Resend, then set `EMAIL_FROM` to an address on it. This is
  what switches on the confirmation email to whoever filled in the form.
- Move `INTERNAL_NOTIFICATION_EMAILS` from the Resend signup address back to the
  business address, or client enquiries keep landing in a personal inbox.
- Delete the `contact_submissions` table, which predates this schema and nothing
  reads.
- Remove the three `noindex` tags and open up `robots.txt`.

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
