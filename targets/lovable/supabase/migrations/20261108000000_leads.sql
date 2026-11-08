-- Lead capture for a 10K site. Template: review, then apply with an approved Lovable prompt
-- ("Apply pending Supabase migrations") or `supabase db push` on an owned project.
--
-- Security model:
--   * RLS on and NO policies: the public (anon) and authenticated keys cannot read or write this table.
--   * Inserts go only through the submit-lead Edge Function (service role, server side), which enforces
--     the honeypot, consent and rate limit. A direct anon insert policy would bypass all three.
--   * Reads happen in the Supabase dashboard or through a server-side function.
--   * Size and format limits live in the database, so a bypassed client cannot store junk.

create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null check (char_length(name) between 1 and 120),
  email       text not null check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  message     text check (message is null or char_length(message) <= 4000),
  source_page text check (source_page is null or char_length(source_page) <= 300),
  consent     boolean not null default false,
  user_agent  text check (user_agent is null or char_length(user_agent) <= 500)
);

comment on table public.leads is 'Contact form submissions. Written only by the submit-lead Edge Function; no public access.';

alter table public.leads enable row level security;

-- No policies on purpose: with RLS on, every operation is denied to anon and authenticated.
-- The service role bypasses RLS, which is why it must never reach the browser.
-- Consent is enforced here too, so even a server-side bug cannot store a lead without it.
alter table public.leads drop constraint if exists leads_consent_required;
alter table public.leads add constraint leads_consent_required check (consent = true);

create index if not exists leads_created_at_idx on public.leads (created_at desc);
