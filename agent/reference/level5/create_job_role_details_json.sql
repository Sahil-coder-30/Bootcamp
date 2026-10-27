-- ============================================================================
-- job_role_details_json
-- Stores the hiring-rounds JSON produced by the Level-5 `hiring` node
-- (see prompts/hiring.md and db.insert_hiring). None of the Level-2 scripts
-- create this table, so run this once in the Supabase SQL Editor.
-- db.insert_hiring also runs the same CREATE TABLE IF NOT EXISTS, so it is
-- safe to run more than once.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.job_role_details_json (
    id            SERIAL PRIMARY KEY,
    company_id    INTEGER NOT NULL,
    company_name  TEXT    NOT NULL,
    job_role_json JSONB   NOT NULL,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_role_details_json_company
    ON public.job_role_details_json(company_id);

-- Read-only access for the portal (anon key), matching the other public tables.
ALTER TABLE public.job_role_details_json ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE tablename = 'job_role_details_json'
                   AND policyname = 'Allow public read access') THEN
    CREATE POLICY "Allow public read access" ON public.job_role_details_json
      FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;
