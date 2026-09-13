# Sensoria

Marketing site for Sensoria — 1:1 sex & intimacy coaching with Claire.

## Status: working, waiting on copy

The contact form is live and verified end to end — enquiries write to Supabase
and notify Claire. What remains is Claire's words and the domain.

The three concept options have been replaced by a real multi-page site. Copy,
pricing, and testimonials are still placeholders.

- `index.html` — homepage: hero, name meaning, about, process, fit, stories, FAQ, contact
- `pricing.html` — three coaching packages
- `courses.html` — placeholder page for self-paced courses
- `styles.css` — shared styles for all pages
- `script.js` — mobile nav, dropdown, FAQ accordion, intake form submit
- `api/intake.js` — serverless function behind the contact form
- `supabase/migrations/` — schema for the Sensoria Supabase project
- `docs/env-vars.md` — required environment variables and the data flow
- `vercel.json` — clean URLs and security headers
- `tests/` — contract tests for the intake endpoint

Static site with one serverless function. Open `index.html` directly to work on
the pages; the contact form needs `vercel dev` and the env vars in
`docs/env-vars.md`.

Tests stub Supabase and Resend, so they need no credentials and no network:

```bash
node --test tests/*.test.mjs
```

## Still to do before launch
- Verify the domain in Resend so visitors get a confirmation email
- Rotate the Resend API key and move notifications to the business address
- Remove the three `noindex` tags and open up `robots.txt`
- Write `llms.txt`, the sitemap and JSON-LD from the real copy
- Build the ops dashboard as a separate app against this database
- Real bio, credentials, and photo for Claire
- Claire's own words for the "where the name comes from" section
- Real pricing for the three offerings
- Real answers for the four FAQ items (including scope of practice + confidentiality)
- Real testimonials (with permission)
- Course listings once they exist
- Connect the domain once purchased
