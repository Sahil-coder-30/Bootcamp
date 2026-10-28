-- Auth service tables. Owned by the auth microservice only.
-- NOTE: resume_id and candidate_profile_id are plain references (no foreign keys) because
-- the resumes table belongs to the resume microservice and candidate_profiles to Role 3.
create extension if not exists pgcrypto;

create table if not exists auth_users (
  id                   uuid primary key default gen_random_uuid(),
  google_sub           text not null unique,
  email                text not null unique,
  email_verified       boolean not null default true,
  name                 text not null default '',
  picture              text,
  role                 text not null default 'student' check (role in ('student', 'admin')),
  phone                text,
  college              text,
  branch               text,
  graduation_year      int check (graduation_year is null or graduation_year between 1990 and 2100),
  resume_id            text,
  candidate_profile_id text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  last_login_at        timestamptz
);

create table if not exists auth_refresh_tokens (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth_users(id) on delete cascade,
  family_id    uuid not null,
  token_hash   text not null unique,
  expires_at   timestamptz not null,
  revoked_at   timestamptz,
  replaced_by  uuid,
  created_at   timestamptz not null default now()
);

create index if not exists auth_refresh_tokens_user_idx on auth_refresh_tokens (user_id);
create index if not exists auth_refresh_tokens_family_idx on auth_refresh_tokens (family_id);

-- Backend uses a server-side connection; block direct PostgREST access.
alter table auth_users enable row level security;
alter table auth_refresh_tokens enable row level security;
