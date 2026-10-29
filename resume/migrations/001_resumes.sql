-- Resume service (Role 2): the resumes table.
-- Source of truth for this table. The service also creates it on boot
-- (SQLAlchemy create_all), so running this file by hand is optional.
-- user_id is auth_users.id from the auth service; no FK because the two
-- services own separate tables.

create extension if not exists pgcrypto;

create table if not exists public.resumes (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid null,
  file_name        text not null,
  mime             text not null,
  size_bytes       integer not null,
  sha256           varchar(64) not null,
  storage_backend  text not null check (storage_backend in ('s3', 'local')),
  storage_key      text not null,
  status           text not null default 'parsed' check (status in ('uploaded', 'parsed', 'failed')),
  error            text null,
  text             text null,
  extraction       jsonb null,          -- full ResumeExtraction contract object
  category_levels  jsonb null,          -- {"COD": 6, ...} copy for quick queries
  candidate_name   text null,
  candidate_email  text null,
  parser_version   text not null,
  levels_version   text not null,
  latency_ms       integer null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- one row per (user, file); anonymous uploads of the same file share one row
create unique index if not exists resumes_user_sha256_uq
  on public.resumes (user_id, sha256) nulls not distinct;
create index if not exists resumes_user_id_idx on public.resumes (user_id);
create index if not exists resumes_sha256_idx on public.resumes (sha256);
create index if not exists resumes_candidate_email_idx on public.resumes (lower(candidate_email));

alter table public.resumes enable row level security;
-- No anon policies: only the resume service (service role / DB user) reads and writes.
