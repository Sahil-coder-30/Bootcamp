-- Migration: 20261027_04_talent_check.sql
-- Role 4: Talent Check views and persistence table
-- Owner: Aryan Singh <aryansingh9c@gmail.com>

-- 1. View: v_company_skill_bar
-- Normalizes the company skill bar to 12 rows per company.
-- Canonical truth is numeric required_level; bloom_code is derived from it.
-- Raw staging bloom code is preserved for data provenance/auditing in the UI.
create or replace view public.v_company_skill_bar
with (security_invoker = true) as
select distinct on (csl.company_id, csl.skill_set_id)
  csl.company_id,
  c.name                        as company_name,
  csl.skill_set_id,
  sm.short_name                 as category_code,
  sm.skill_set_name,
  csl.required_level,
  band.proficiency_code         as bloom_code,      -- derived from level (source of truth)
  raw.proficiency_code          as raw_bloom_code,  -- as typed in staging
  (band.proficiency_code is distinct from raw.proficiency_code) as bloom_mismatch
from public.company_skill_levels csl
join public.companies          c    on c.company_id = csl.company_id
join public.skill_set_master   sm   on sm.skill_set_id = csl.skill_set_id
join public.proficiency_levels band on band.proficiency_level_id = csl.required_level
left join public.proficiency_levels raw on raw.proficiency_level_id = csl.required_proficiency_level_id
order by csl.company_id, csl.skill_set_id, csl.created_at desc;

-- 2. View: v_skill_topics
-- Assembles the 10-level topic ladder per skill.
-- Includes fallback for SQL and Design (skill_set_id 7) from staging_skill_topics
-- until upstream trigger spelling mismatch is fixed.
create or replace view public.v_skill_topics with (security_invoker = true) as
select skill_set_id, level_number, string_agg(btrim(topics), '; ' order by topic_id) as topics, 'skill_set_topics'::text as source
from public.skill_set_topics group by skill_set_id, level_number
union all
select 7, nullif(regexp_replace(levels, '\D', '', 'g'), '')::int, btrim(topics), 'staging_skill_topics'
from public.staging_skill_topics
where skill_area ilike 'SQL%Design%'
  and not exists (select 1 from public.skill_set_topics t where t.skill_set_id = 7);

-- 3. Table: talent_checks
-- Stores evaluated talent checks with idempotent deduplication.
create table if not exists public.talent_checks (
  id               uuid primary key default gen_random_uuid(),
  profile_id       uuid not null,
  profile_version  int  not null default 1,
  company_id       int  not null,
  result           jsonb not null,
  readiness_score  int  not null check (readiness_score between 0 and 100),
  verdict          text not null check (verdict in ('ready','almost','not_yet')),
  scoring_version  text not null default 'tc-1.0',
  bar_source       text not null default 'db' check (bar_source in ('db','cache','snapshot')),
  created_at       timestamptz not null default now()
);

create index if not exists talent_checks_profile_company_idx on public.talent_checks (profile_id, company_id, created_at desc);
create unique index if not exists talent_checks_idem_idx on public.talent_checks (profile_id, profile_version, company_id, scoring_version);

-- Enable RLS (service role bypasses, anon disallowed)
alter table public.talent_checks enable row level security;
