-- Migration: 20261028_01_users_profiles_resumes.sql
-- Shared foundation: auth_users/auth_refresh_tokens (Google auth service), resumes (resume service),
-- candidate_profiles (+versions, Role 3). Auth + resume blocks mirror those services' own migrations
-- (auth/migrations/001_auth_init.sql, resume/migrations/001_resumes.sql); all are IF NOT EXISTS so either order is safe.
-- Idempotent: safe to run more than once. Does not touch existing tables.
-- RLS is on with no policies: only the backend (service-role key) reads/writes.

create extension if not exists pgcrypto;

-- 0. shared trigger: keep updated_at fresh
create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

-- 1. auth_users (Google sign-in; also holds the user profile fields)
create table if not exists public.auth_users (
  id                    uuid primary key default gen_random_uuid(),
  google_sub            text not null unique,
  email                 text not null unique,
  email_verified        boolean not null default false,
  name                  text,
  picture               text,
  role                  text not null default 'student' check (role in ('student','admin')),
  phone                 text,
  college               text,
  branch                text,
  graduation_year       int,
  resume_id             text,   -- active resume (resumes.id), no FK: separate service
  candidate_profile_id  text,   -- candidate_profiles.id, no FK
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  last_login_at         timestamptz
);

-- 2. auth_refresh_tokens (store sha256 of opaque token; rotate on use)
create table if not exists public.auth_refresh_tokens (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.auth_users(id) on delete cascade,
  family_id    uuid not null,
  token_hash   text not null unique,
  expires_at   timestamptz not null,
  revoked_at   timestamptz,
  replaced_by  uuid,
  created_at   timestamptz not null default now()
);
create index if not exists auth_refresh_tokens_user_idx   on public.auth_refresh_tokens (user_id);
create index if not exists auth_refresh_tokens_family_idx on public.auth_refresh_tokens (family_id);

-- 3. resumes (resume service; file in S3, parsed output in extraction jsonb)
create table if not exists public.resumes (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid,        -- = auth_users.id, no FK (separate service)
  file_name        text not null,
  mime             text not null,
  size_bytes       int not null,
  sha256           text not null,
  storage_backend  text not null check (storage_backend in ('s3','local')),
  storage_key      text not null,
  status           text not null default 'parsed' check (status in ('uploaded','parsed','failed')),
  error            text,
  text             text,
  extraction       jsonb,
  category_levels  jsonb,
  candidate_name   text,
  candidate_email  text,
  parser_version   text not null,
  levels_version   text not null,
  latency_ms       int,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create unique index if not exists resumes_user_sha_idx on public.resumes (user_id, sha256) nulls not distinct;
create index if not exists resumes_user_idx  on public.resumes (user_id);
create index if not exists resumes_email_idx on public.resumes (candidate_email);

-- 4. candidate_profiles (Role 3; shape read by talentCheck.service getProfile)
create table if not exists public.candidate_profiles (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid references public.auth_users(id) on delete set null,
  email                 text unique,
  name                  text,
  profile               jsonb not null,
  version               int not null default 1,
  completeness          int,
  change_source         text,
  resume_extraction_id  uuid,   -- resumes.id of the source parse, no FK
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists candidate_profiles_user_idx on public.candidate_profiles (user_id);

create table if not exists public.candidate_profile_versions (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.candidate_profiles(id) on delete cascade,
  version       int not null,
  profile       jsonb not null,
  change_source text,
  created_at    timestamptz not null default now(),
  unique (profile_id, version)
);

-- 5. updated_at triggers
do $$
declare t text;
begin
  foreach t in array array['auth_users','resumes','candidate_profiles'] loop
    if not exists (select 1 from pg_trigger where tgname = t || '_set_updated_at') then
      execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', t || '_set_updated_at', t);
    end if;
  end loop;
end $$;

-- 6. RLS on, no policies (service role only)
alter table public.auth_users enable row level security;
alter table public.auth_refresh_tokens enable row level security;
alter table public.resumes enable row level security;
alter table public.candidate_profiles enable row level security;
alter table public.candidate_profile_versions enable row level security;
