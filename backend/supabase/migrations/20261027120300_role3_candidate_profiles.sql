-- Role 3 (Profile Builder): candidate profiles, version history, triggers, RLS.
-- Idempotent: safe to apply twice. Does not modify any existing table.
-- The backend uses the service-role key; there is deliberately no anon policy.

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create table if not exists public.candidate_profiles (
  id                   uuid primary key default gen_random_uuid(),
  email                text not null unique check (email = lower(email)),
  name                 text generated always as (profile->>'name') stored,
  profile              jsonb not null check (jsonb_typeof(profile) = 'object' and profile ? 'skill_levels'),
  version              int  not null default 1 check (version >= 1),
  resume_extraction_id uuid null,               -- FK added below once `extractions` exists (Role 1)
  completeness         smallint not null default 0 check (completeness between 0 and 100),
  change_source        text not null default 'form'
                       check (change_source in ('form','resume_import','json_import','seed','calibration')),
  owner_id             uuid null,               -- auth-ready: RLS `owner_id = auth.uid()` later
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint profile_size check (pg_column_size(profile) < 262144)
);

create index if not exists candidate_profiles_updated_idx
  on public.candidate_profiles (updated_at desc, id desc);
create index if not exists candidate_profiles_extraction_idx
  on public.candidate_profiles (resume_extraction_id);
-- name search (`GET /api/profiles?q=`)
create index if not exists candidate_profiles_name_trgm_idx
  on public.candidate_profiles using gin (name gin_trgm_ops);

do $$ begin
  if to_regclass('public.extractions') is not null and not exists
     (select 1 from pg_constraint where conname = 'candidate_profiles_extraction_fk') then
    alter table public.candidate_profiles add constraint candidate_profiles_extraction_fk
      foreign key (resume_extraction_id) references public.extractions(id) on delete set null;
  end if;
end $$;

create table if not exists public.candidate_profile_versions (
  profile_id    uuid not null references public.candidate_profiles(id) on delete cascade,
  version       int  not null,
  profile       jsonb not null,
  change_source text not null,
  created_at    timestamptz not null default now(),
  primary key (profile_id, version)
);

-- Keep the stored JSON identical to the row (Roles 4/5 may read the jsonb directly).
create or replace function public.tg_candidate_profiles_sync() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  new.profile := new.profile || jsonb_build_object(
    'id', new.id, 'version', new.version,
    'updated_at', to_jsonb(new.updated_at), 'email', new.email);
  return new;
end $$;

create or replace function public.tg_candidate_profiles_snapshot() returns trigger
language plpgsql as $$
begin
  insert into public.candidate_profile_versions (profile_id, version, profile, change_source)
  values (new.id, new.version, new.profile, new.change_source)
  on conflict do nothing;
  return null;
end $$;

drop trigger if exists candidate_profiles_sync on public.candidate_profiles;
create trigger candidate_profiles_sync before insert or update on public.candidate_profiles
  for each row execute function public.tg_candidate_profiles_sync();

drop trigger if exists candidate_profiles_snapshot on public.candidate_profiles;
create trigger candidate_profiles_snapshot after insert or update on public.candidate_profiles
  for each row execute function public.tg_candidate_profiles_snapshot();

-- History retention: keep the last 20 versions, but never delete a version that a Talent Check
-- or a Skill Match refers to (those tables belong to Roles 4/5 and may not exist yet, hence the
-- dynamic SQL).
create or replace function public.tg_candidate_profile_versions_retention() returns trigger
language plpgsql as $$
declare
  keep int[] := array[]::int[];
  referenced int[];
begin
  if to_regclass('public.talent_checks') is not null then
    execute 'select coalesce(array_agg(distinct profile_version), array[]::int[])
             from public.talent_checks where profile_id = $1'
      into referenced using new.profile_id;
    keep := keep || referenced;
  end if;
  if to_regclass('public.skill_matches') is not null then
    execute 'select coalesce(array_agg(distinct profile_version), array[]::int[])
             from public.skill_matches where profile_id = $1'
      into referenced using new.profile_id;
    keep := keep || referenced;
  end if;
  delete from public.candidate_profile_versions
   where profile_id = new.profile_id
     and version <= new.version - 20
     and not (version = any (keep));
  return null;
end $$;

drop trigger if exists candidate_profile_versions_retention on public.candidate_profile_versions;
create trigger candidate_profile_versions_retention after insert on public.candidate_profile_versions
  for each row execute function public.tg_candidate_profile_versions_retention();

alter table public.candidate_profiles enable row level security;
alter table public.candidate_profile_versions enable row level security;
-- Auth-ready sketch (not enabled): create policy own_profile on public.candidate_profiles
--   for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
