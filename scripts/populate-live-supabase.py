import json
import psycopg

conn = psycopg.connect(
    host="aws-0-ap-southeast-2.pooler.supabase.com",
    port=5432,
    user="postgres.brpacqbtxufuxhpgoohu",
    password="8126252168@sahil",
    dbname="postgres",
    autocommit=True
)

cur = conn.cursor()

print("1. Creating public RLS SELECT policies...")
rls_sql = """
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'companies' AND policyname = 'Allow public read access') THEN
    CREATE POLICY "Allow public read access" ON public.companies FOR SELECT TO anon, authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'company_json' AND policyname = 'Allow public read access') THEN
    CREATE POLICY "Allow public read access" ON public.company_json FOR SELECT TO anon, authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'company_skill_levels' AND policyname = 'Allow public read access') THEN
    CREATE POLICY "Allow public read access" ON public.company_skill_levels FOR SELECT TO anon, authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'proficiency_levels' AND policyname = 'Allow public read access') THEN
    CREATE POLICY "Allow public read access" ON public.proficiency_levels FOR SELECT TO anon, authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'skill_set_master' AND policyname = 'Allow public read access') THEN
    CREATE POLICY "Allow public read access" ON public.skill_set_master FOR SELECT TO anon, authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'skill_set_topics' AND policyname = 'Allow public read access') THEN
    CREATE POLICY "Allow public read access" ON public.skill_set_topics FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;
"""
cur.execute(rls_sql)
cur.execute("GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;")
print("RLS policies & grants active!")

print("2. Reading seed companies...")
with open("scratch/seed_companies.json", "r") as f:
    seed_companies = json.load(f)

# Skill mapping from seed name to skill_set_master ID
skill_map = {
    "Data Structures & Algorithms": 2,
    "Object-Oriented Programming": 5,
    "SQL & Databases": 7,
    "Cloud Fundamentals (AWS/Azure)": 9,
    "Operating Systems": 12,
    "Computer Networks": 11,
    "Aptitude & Logical Reasoning": 3,
    "Communication & Behavioral": 4,
    "Web Development Basics": 1,
    "System Design (Intro)": 8,
    "Git & Version Control": 10,
    "Generative AI Basics": 6,
}

print(f"3. Inserting {len(seed_companies)} companies into public.companies and public.company_json...")
for company in seed_companies:
    cid = company["company_id"]
    s = company["short_json"]
    f = company["full_json"]

    # 3a. Insert into public.companies
    cur.execute("""
        INSERT INTO public.companies (
            company_id, name, short_name, category, incorporation_year,
            nature_of_company, headquarters_address, office_count, employee_size,
            website_url, linkedin_url, twitter_handle, facebook_url, instagram_url,
            primary_contact_email, primary_phone_number, overview_text,
            vision_statement, mission_statement, legal_issues, carbon_footprint
        ) VALUES (
            %s, %s, %s, %s, %s,
            %s, %s, %s, %s,
            %s, %s, %s, %s, %s,
            %s, %s, %s,
            %s, %s, %s, %s
        )
        ON CONFLICT (company_id) DO UPDATE SET
            name = EXCLUDED.name,
            short_name = EXCLUDED.short_name,
            category = EXCLUDED.category,
            website_url = EXCLUDED.website_url;
    """, (
        cid,
        s.get("name"),
        s.get("short_name"),
        s.get("category"),
        str(s.get("incorporation_year", "")),
        f.get("nature_of_company"),
        s.get("headquarters_address"),
        f.get("office_count"),
        s.get("employee_size"),
        s.get("website_url"),
        f.get("linkedin_url"),
        f.get("twitter_handle"),
        f.get("facebook_url"),
        f.get("instagram_url"),
        f.get("primary_contact_email"),
        f.get("primary_phone_number"),
        f.get("overview_text"),
        f.get("vision_statement"),
        f.get("mission_statement"),
        f.get("legal_issues"),
        f.get("carbon_footprint")
    ))

    # 3b. Insert into public.company_json
    cur.execute("""
        INSERT INTO public.company_json (company_id, short_json, full_json)
        VALUES (%s, %s::jsonb, %s::jsonb)
        ON CONFLICT (company_id) DO UPDATE SET
            short_json = EXCLUDED.short_json,
            full_json = EXCLUDED.full_json;
    """, (cid, json.dumps(s), json.dumps(f)))

    # 3c. Insert into public.company_skill_levels
    for sk in company.get("skill_levels", []):
        sk_name = sk["skill_set_name"]
        target_skill_id = skill_map.get(sk_name, sk.get("skill_set_id", 1))
        req_level = max(1, min(10, int(sk.get("required_level", 5))))
        # Proficiency level ID is 1..10
        prof_id = req_level

        cur.execute("""
            INSERT INTO public.company_skill_levels (company_id, skill_set_id, required_level, required_proficiency_level_id)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (company_id, skill_set_id) DO UPDATE SET
                required_level = EXCLUDED.required_level,
                required_proficiency_level_id = EXCLUDED.required_proficiency_level_id;
        """, (cid, target_skill_id, req_level, prof_id))

print("4. Verification of database counts:")
for table in ["companies", "company_json", "company_skill_levels", "skill_set_master", "proficiency_levels", "skill_set_topics"]:
    cur.execute(f"SELECT COUNT(*) FROM public.{table};")
    count = cur.fetchone()[0]
    print(f"  - public.{table}: {count} rows")

print("Database population completed successfully!")
