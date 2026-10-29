-- Telegram bot: which chat belongs to which profile, and the one-time codes that link them.
-- Idempotent. Only the backend (service-role key) reads or writes these; there is no anon policy.

create table if not exists public.telegram_link_codes (
  code        text primary key,
  profile_id  uuid not null references public.candidate_profiles(id) on delete cascade,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.telegram_links (
  chat_id     bigint primary key,
  profile_id  uuid not null references public.candidate_profiles(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create index if not exists telegram_links_profile_idx on public.telegram_links (profile_id);
create index if not exists telegram_link_codes_expiry_idx on public.telegram_link_codes (expires_at);

alter table public.telegram_link_codes enable row level security;
alter table public.telegram_links enable row level security;
