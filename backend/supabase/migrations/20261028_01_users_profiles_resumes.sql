-- Migration: 20261028_01_users_profiles_resumes.sql
-- Shared foundation for auth + resume parsing + candidate profiles.
-- Idempotent: safe to run more than once. Does not touch existing tables.
-- RLS is on with no policies: only the backend (service-role key) reads/writes.

create extension if not exists pgcrypto;

-- 0. shared trigger: keep updated_at fresh
create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

-- 1. users (Google sign-in)
create table if not exists public.users (
  id              uuid primary key default gen_random_uuid(),
  google_sub      text not null unique,
  email           text not null,
  email_verified  boolean not null default false,
  name            text,
  given_name      text,
  family_name     text,
  avatar_url      text,
  locale          text,
  role            text not null default 'candidate' check (role in ('candidate','admin')),
  status          text not null default 'active' check (status in ('active','disabled')),
  last_login_at   timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create unique index if not exists users_email_lower_idx on public.users (lower(email));

-- 2. auth_sessions (refresh tokens; store only a hash, rotate on use)
create table if not exists public.auth_sessions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.users(id) on delete cascade,
  family_id           uuid not null default gen_random_uuid(), -- one per login; reuse of a revoked token revokes the family
  refresh_token_hash  text not null unique,                    -- sha256 hex of the opaque refresh token
  user_agent          text,
  ip                  inet,
  expires_at          timestamptz not null,
  last_used_at        timestamptz,
  revoked_at          timestamptz,
  replaced_by         uuid references public.auth_sessions(id) on delete set null,
  created_at          timestamptz not null default now()
);
create index if not exists auth_sessions_user_idx   on public.auth_sessions (user_id, created_at desc);
create index if not exists auth_sessions_family_idx on public.auth_sessions (family_id);
create index if not exists auth_sessions_expiry_idx on public.auth_sessions (expires_at) where revoked_at is null;

-- 3. documents + extractions (contract section 5, Role 1 / Role 2)
create table if not exists public.documents (
  id            uuid primary key default gen_random_uuid(),
  kind          text not null check (kind in ('jd','resume')),
  file_name     text,
  sha256        text not null unique,
  storage_path  text,          -- Supabase Storage path talent-docs/<kind>/<sha256>.<ext>, or S3 key
  mime          text,
  text          text,
  sections      jsonb,
  page_count    int,
  created_at    timestamptz not null default now()
);

create table if not exists public.extractions (
  id              uuid primary key default gen_random_uuid(),
  document_id     uuid not null references public.documents(id) on delete cascade,
  source_type     text not null check (source_type in ('jd','resume')),
  prompt_version  text not null,
  model           text,
  result          jsonb not null,
  latency_ms      int,
  created_at      timestamptz not null default now(),
  unique (document_id, prompt_version)
);
create index if not exists extractions_document_idx on public.extractions (document_id);

-- 4. resumes (user-owned upload metadata; file lives in S3)
create table if not exists public.resumes (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.users(id) on delete cascade,
  document_id        uuid references public.documents(id) on delete set null,
  extraction_id      uuid references public.extractions(id) on delete set null,
  original_filename  text not null,
  mime               text,
  size_bytes         bigint,
  sha256             text,
  storage_provider   text not null default 's3' check (storage_provider in ('s3','supabase')),
  storage_bucket     text,
  storage_key        text not null,
  status             text not null default 'uploaded' check (status in ('uploaded','parsing','parsed','failed')),
  error              text,
  parser_version     text,
  parsed             jsonb,                 -- full ResumeExtraction (contract 3.3)
  parsed_at          timestamptz,
  is_primary         boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (storage_provider, storage_bucket, storage_key)
);
create index if not exists resumes_user_idx   on public.resumes (user_id, created_at desc);
create index if not exists resumes_sha_idx    on public.resumes (sha256);
create index if not exists resumes_doc_idx    on public.resumes (document_id);
create index if not exists resumes_extr_idx   on public.resumes (extraction_id);
create unique index if not exists resumes_one_primary_idx on public.resumes (user_id) where is_primary;

-- 5. resume_skills (flattened extraction output, one row per skill)
create table if not exists public.resume_skills (
  id            uuid primary key default gen_random_uuid(),
  resume_id     uuid not null references public.resumes(id) on delete cascade,
  skill         text not null,
  canonical_id  text,
  category_code text,                       -- one of the 12 skill_set_master.short_name codes
  level         int check (level between 1 and 10),
  confidence    text check (confidence in ('low','medium','high')),
  basis         text,
  evidence      text,
  created_at    timestamptz not null default now()
);
create index if not exists resume_skills_resume_idx on public.resume_skills (resume_id);
create index if not exists resume_skills_cat_idx    on public.resume_skills (category_code);

-- 6. user_profiles (1:1 with users; holds the active resume)
create table if not exists public.user_profiles (
  user_id               uuid primary key references public.users(id) on delete cascade,
  resume_id             uuid references public.resumes(id) on delete set null,
  display_name          text,
  phone                 text,
  headline              text,
  target_role           text,
  location              text,
  links                 jsonb not null default '{}'::jsonb,
  onboarding_completed  boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists user_profiles_resume_idx on public.user_profiles (resume_id);

-- 7. candidate_profiles (Role 3; shape read by talentCheck.service getProfile)
create table if not exists public.candidate_profiles (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid references public.users(id) on delete set null,
  email                 text unique,
  name                  text,
  profile               jsonb not null,
  version               int not null default 1,
  completeness          int,
  change_source         text,
  resume_extraction_id  uuid references public.extractions(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists candidate_profiles_user_idx on public.candidate_profiles (user_id);
create index if not exists candidate_profiles_extr_idx on public.candidate_profiles (resume_extraction_id);

create table if not exists public.candidate_profile_versions (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.candidate_profiles(id) on delete cascade,
  version       int not null,
  profile       jsonb not null,
  change_source text,
  created_at    timestamptz not null default now(),
  unique (profile_id, version)
);

-- 8. updated_at triggers
do $$
declare t text;
begin
  foreach t in array array['users','resumes','user_profiles','candidate_profiles'] loop
    if not exists (select 1 from pg_trigger where tgname = t || '_set_updated_at') then
      execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', t || '_set_updated_at', t);
    end if;
  end loop;
end $$;

-- 9. RLS on, no policies (service role only)
alter table public.users                      enable row level security;
alter table public.auth_sessions              enable row level security;
alter table public.documents                  enable row level security;
alter table public.extractions                enable row level security;
alter table public.resumes                    enable row level security;
alter table public.resume_skills              enable row level security;
alter table public.user_profiles              enable row level security;
alter table public.candidate_profiles         enable row level security;
alter table public.candidate_profile_versions enable row level security;
