-- Migration: 20261028_02_role1_jd_analytics.sql
-- Role 1: JD Analytics. documents, extractions, job_postings + the talent-docs bucket.
-- Owner: Sahil Sharma <sahilsharma3043@gmail.com>
-- Plan: docs/role-1-jd-analytics/plan.md section 6. Shape matches contract section 5.
--
-- The backend writes these with the service-role key (SUPABASE_SERVICE_ROLE_KEY).
-- Without that key it keeps the same rows in a local JSON store (JD_STORE=file),
-- so the demo works before this migration is applied.
-- Resumes have their own table in the resume service (resume/migrations/001_resumes.sql);
-- `documents.kind = 'resume'` is allowed so Role 2 can share this table later.

create extension if not exists pgcrypto;

create table if not exists public.documents (
  id             uuid primary key default gen_random_uuid(),
  kind           text not null check (kind in ('jd', 'resume')),
  file_name      text not null,
  sha256         text not null unique,
  storage_path   text not null,                    -- '<kind>/<sha256>.<ext>' in bucket talent-docs
  mime           text not null,
  size_bytes     int,
  text           text,
  sections       jsonb not null default '[]'::jsonb,
  pages          jsonb not null default '[]'::jsonb,  -- [[start, end], ...] char span per page
  page_count     int,
  parser_version text,
  warnings       jsonb not null default '[]'::jsonb,
  created_at     timestamptz not null default now()
);

create table if not exists public.extractions (
  id             uuid primary key default gen_random_uuid(),
  document_id    uuid not null references public.documents(id) on delete cascade,
  source_type    text not null check (source_type in ('jd', 'resume')),
  prompt_version text not null,
  model          text not null,
  result         jsonb not null,                   -- ExtractedSkillList (contract 3.2)
  latency_ms     int,
  created_at     timestamptz not null default now(),
  unique (document_id, prompt_version)
);
create index if not exists extractions_document_id_idx on public.extractions(document_id);

create table if not exists public.job_postings (
  id            uuid primary key default gen_random_uuid(),   -- = jd_id
  extraction_id uuid not null references public.extractions(id) on delete cascade,
  document_id   uuid not null unique references public.documents(id) on delete cascade,
  company_id    int references public.companies(company_id),
  company_name  text,
  role          text,
  location      text,
  skill_count   int not null default 0,
  must_count    int not null default 0,
  top_categories text[] not null default '{}',
  prompt_version text,
  is_sample     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists job_postings_extraction_id_idx on public.job_postings(extraction_id);
create index if not exists job_postings_company_id_idx on public.job_postings(company_id);

alter table public.documents    enable row level security;
alter table public.extractions  enable row level security;
alter table public.job_postings enable row level security;
-- No anon policies: only the backend (service role) reads and writes.

insert into storage.buckets (id, name, public) values ('talent-docs', 'talent-docs', false)
on conflict (id) do nothing;
