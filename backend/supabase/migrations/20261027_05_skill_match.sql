-- Migration: Role 5 Skill Matching tables and indexes
-- Supports pure deterministic match caching and taxonomy mirrored model

create extension if not exists vector with schema extensions;

create table if not exists public.skill_taxonomy (
  canonical_id       text primary key,
  display_name       text not null,
  category_code      text not null check (category_code in
    ('COD','DSA','APTI','COMM','OOD','AI','SQL','SYSD','CLOUD','SWE','NETW','OS','OTHER')),
  aliases            text[] not null default '{}',
  kind               text null,
  parents            text[] not null default '{}',
  implies            text[] not null default '{}',
  related            text[] not null default '{}',
  distinct_from      text[] not null default '{}',
  maps_to_categories text[] not null default '{}',
  learn_hint         text null,
  taxonomy_version   text not null default 'tx-1.0',
  embedding          extensions.vector(768) null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists skill_taxonomy_aliases_gin on public.skill_taxonomy using gin (aliases);
create index if not exists skill_taxonomy_category_idx on public.skill_taxonomy (category_code);
alter table public.skill_taxonomy enable row level security;

create table if not exists public.skill_matches (
  id                   uuid primary key default gen_random_uuid(),
  profile_id           uuid references public.candidate_profiles(id) on delete cascade,
  profile_version      int null,
  resume_extraction_id uuid references public.extractions(id) on delete cascade,
  job_posting_id       uuid not null references public.job_postings(id) on delete cascade,
  result               jsonb not null,
  match_score          int not null check (match_score between 0 and 100),
  matching_version     text not null default 'sm-1.0',
  taxonomy_version     text not null default 'tx-1.0',
  input_sha256         text null,
  created_at           timestamptz not null default now(),
  constraint skill_matches_subject_chk check (profile_id is not null or resume_extraction_id is not null)
);

create index if not exists skill_matches_profile_posting_idx
  on public.skill_matches (profile_id, job_posting_id, created_at desc);
create index if not exists skill_matches_posting_idx on public.skill_matches (job_posting_id);
create index if not exists skill_matches_input_idx on public.skill_matches (input_sha256);
alter table public.skill_matches enable row level security;

