-- Sensoria coaching records schema
-- Deliberately a separate Supabase project from Adventure Therapy: intake
-- messages here are far more sensitive than tour bookings, and the two client
-- lists should not share a database, an access list, or an email-keyed identity.

create extension if not exists pgcrypto;

create type inquiry_status as enum (
  'new',
  'replied',
  'call_booked',
  'client',
  'archived'
);

create type session_status as enum (
  'scheduled',
  'completed',
  'cancelled',
  'no_show'
);

-- Email is stored already lowercased by the intake function so this plain
-- unique constraint is enough, and PostgREST can target it with on_conflict.
create table clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table inquiries (
  id uuid primary key default gen_random_uuid(),
  public_reference text not null unique,
  client_id uuid not null references clients(id) on delete cascade,
  message text,
  status inquiry_status not null default 'new',
  source text not null default 'website',
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index inquiries_client_idx on inquiries (client_id);
create index inquiries_status_idx on inquiries (status, submitted_at desc);

-- Session notes are the most sensitive rows in this database. They are split
-- out from inquiries so the dashboard can grant intake access without
-- necessarily exposing what was discussed in a session.
create table sessions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  package text,
  scheduled_at timestamptz,
  duration_minutes integer not null default 75,
  status session_status not null default 'scheduled',
  private_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sessions_client_idx on sessions (client_id);
create index sessions_scheduled_idx on sessions (scheduled_at desc);

alter table clients enable row level security;
alter table inquiries enable row level security;
alter table sessions enable row level security;

-- No policies are opened to anon or authenticated on purpose. The public site
-- writes through a service-role client in /api/intake, and the dashboard should
-- read through authenticated allow-listed admins once it exists.

-- Mirrors booking_events in the Adventure Therapy schema: a general timeline
-- for notes, calls, emails, and status changes against a single inquiry.
create table inquiry_events (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references inquiries(id) on delete cascade,
  event_type text not null check (event_type in ('note','email','call','session','status','task','system')),
  direction text not null check (direction in ('inbound','outbound','internal','system')),
  title text not null,
  body text,
  metadata jsonb not null default '{}'::jsonb,
  created_by text not null default 'ops',
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index inquiry_events_inquiry_occurred_idx on inquiry_events (inquiry_id, occurred_at desc);

alter table inquiry_events enable row level security;
