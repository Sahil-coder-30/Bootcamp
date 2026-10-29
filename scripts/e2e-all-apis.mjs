// End-to-end test verifying all APIs and Supabase persistence
import pkg from "../auth/node_modules/pg/lib/index.js";
const { Client } = pkg;

const BACKEND_URL = "http://localhost:4000";
const AUTH_URL = "http://localhost:4100";
const RESUME_URL = "http://127.0.0.1:8100";
const AGENT_URL = "http://localhost:8000";
const DB_URL = "postgresql://postgres.brpacqbtxufuxhpgoohu:8126252168%40sahil@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres";

async function main() {
  console.log("=== STARTING END-TO-END API & SUPABASE PERSISTENCE SUITE ===\n");
  const pg = new Client({ connectionString: DB_URL });
  await pg.connect();
  console.log("[DB] Connected to Supabase Postgres directly for ground-truth verification.\n");

  const results = [];

  const record = (name, passed, detail) => {
    results.push({ name, passed, detail });
    console.log(`[${passed ? "PASS" : "FAIL"}] ${name} - ${detail}`);
  };

  try {
    // 1. Health Checks
    const rHealth = await fetch(`${BACKEND_URL}/api/health`).then(r => r.json());
    record("Backend Health", rHealth.status === "ok" && rHealth.supabase === true, `Supabase flag: ${rHealth.supabase}`);

    const rAuth = await fetch(`${AUTH_URL}/readyz`).then(r => r.json());
    record("Auth Service DB Ready", rAuth.status === "ready", `Status: ${rAuth.status}`);

    const rResume = await fetch(`${RESUME_URL}/readyz`).then(r => r.json());
    record("Resume Service DB Ready", rResume.status === "ok", `Status: ${rResume.status}`);

    const rAgent = await fetch(`${AGENT_URL}/healthz`).then(r => r.json());
    record("Agent Service Health", rAgent.status === "ok", `Status: ${rAgent.status}`);

    // 2. Companies API (Supabase views & tables)
    const rCompanies = await fetch(`${BACKEND_URL}/api/companies`).then(r => r.json());
    record("GET /api/companies", Array.isArray(rCompanies) && rCompanies.length > 0, `Returned ${rCompanies.length} companies from Supabase`);

    const rSkillBar = await fetch(`${BACKEND_URL}/api/companies/4/skill-bar`).then(r => r.json());
    record("GET /api/companies/:id/skill-bar", rSkillBar?.rows?.length === 12, `Normalized 12 skill rows (source: ${rSkillBar.source})`);

    // 3. Candidate Profiles API (Role 3 -> Supabase candidate_profiles & versions)
    const testEmail = `e2e.${Date.now()}@example.com`;
    const profilePayload = {
      email: testEmail,
      name: "E2E Verified Candidate",
      skills: [],
      hackathons: [],
      internships: [],
      certifications: [],
      preferred_roles: ["Backend Engineer"],
      education_details: [],
      projects: [],
      skill_levels: {
        COD: { level: 8, source: "self", confidence: "high", basis: "Extensive coding experience" },
        DSA: { level: 7, source: "self", confidence: "high", basis: "LeetCode practice" },
        APTI: { level: 6, source: "self", confidence: "medium", basis: "Tests" },
        COMM: { level: 7, source: "self", confidence: "high", basis: "Team lead" },
        OOD: { level: 6, source: "self", confidence: "high", basis: "Architecture" },
        AI: { level: 5, source: "self", confidence: "medium", basis: "Basic ML" },
        SQL: { level: 7, source: "self", confidence: "high", basis: "Postgres schema design" },
        SYSD: { level: 7, source: "self", confidence: "high", basis: "Microservices" },
        CLOUD: { level: 6, source: "self", confidence: "medium", basis: "Docker, K8s" },
        SWE: { level: 7, source: "self", confidence: "high", basis: "Git, CI/CD" },
        NETW: { level: 5, source: "self", confidence: "medium", basis: "TCP/HTTP" },
        OS: { level: 6, source: "self", confidence: "medium", basis: "Linux administration" }
      }
    };

    const rProfileCreate = await fetch(`${BACKEND_URL}/api/profiles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profilePayload)
    });
    const profileData = await rProfileCreate.json();
    record("POST /api/profiles", rProfileCreate.status === 201 && Boolean(profileData.id), `Created profile id: ${profileData.id}`);

    const dbProfileCheck = await pg.query("SELECT id, email, name, completeness FROM public.candidate_profiles WHERE id = $1", [profileData.id]);
    record("Supabase DB: candidate_profiles row verified", dbProfileCheck.rows.length === 1, `DB Name: ${dbProfileCheck.rows[0]?.name}, Email: ${dbProfileCheck.rows[0]?.email}`);

    // Update profile to trigger versioning
    const updatedPayload = {
      ...profilePayload,
      name: "E2E Verified Candidate (Updated)"
    };
    const rProfileUpdate = await fetch(`${BACKEND_URL}/api/profiles/${profileData.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "If-Match": `"1"`
      },
      body: JSON.stringify(updatedPayload)
    });
    const updatedData = await rProfileUpdate.json();
    record("PATCH /api/profiles/:id", rProfileUpdate.status === 200 && updatedData.version === 2, `Updated to version ${updatedData.version}`);

    const dbVersionCheck = await pg.query("SELECT profile_id, version, change_source FROM public.candidate_profile_versions WHERE profile_id = $1 ORDER BY version ASC", [profileData.id]);
    record("Supabase DB: candidate_profile_versions history verified", dbVersionCheck.rows.length >= 2, `History versions saved in DB: ${dbVersionCheck.rows.map(r => r.version).join(", ")}`);

    // 4. Resumes API (Role 2 -> Supabase resumes table)
    const formData = new FormData();
    const resumeBlob = new Blob([
      `E2E Tester\nEmail: ${testEmail}\nProficient in Golang, Python, PostgreSQL and Distributed Systems.`
    ], { type: "text/plain" });
    formData.append("file", resumeBlob, "resume_test.txt");

    const rResumeUpload = await fetch(`${BACKEND_URL}/api/resumes?force=true`, {
      method: "POST",
      body: formData
    });
    const resumeUploadData = await rResumeUpload.json();
    const resumeId = resumeUploadData.resume_id || resumeUploadData.id;
    record("POST /api/resumes", rResumeUpload.status === 200 || rResumeUpload.status === 201, `Resume ID: ${resumeId}`);

    const dbResumeCheck = await pg.query("SELECT id, file_name, status FROM public.resumes WHERE id = $1", [resumeId]);
    record("Supabase DB: resumes row verified", dbResumeCheck.rows.length === 1, `Status: ${dbResumeCheck.rows[0]?.status}`);

    // 5. Documents & JDs (Role 1 -> Supabase documents, extractions, job_postings)
    const jdFormData = new FormData();
    const jdBlob = new Blob([
      `Role: Cloud Architect\nCompany: Acme Global\nRequirements: 5+ years of AWS, Kubernetes, Terraform and Python.`
    ], { type: "text/plain" });
    jdFormData.append("file", jdBlob, "cloud_architect_jd.txt");

    const rDocUpload = await fetch(`${BACKEND_URL}/api/documents`, {
      method: "POST",
      body: jdFormData
    });
    const docData = await rDocUpload.json();
    const docId = docData.document_id || docData.id;
    record("POST /api/documents", rDocUpload.status === 200 || rDocUpload.status === 201, `Doc ID: ${docId}`);

    const dbDocCheck = await pg.query("SELECT id, file_name, kind FROM public.documents WHERE id = $1", [docId]);
    record("Supabase DB: documents row verified", dbDocCheck.rows.length === 1, `File: ${dbDocCheck.rows[0]?.file_name}`);

    // 6. Talent Check API (Role 4 -> Supabase talent_checks)
    const rTalentCheck = await fetch(`${BACKEND_URL}/api/talent-check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile_id: profileData.id,
        company_id: 4,
        persist: true
      })
    });
    const tcData = await rTalentCheck.json();
    record("POST /api/talent-check", rTalentCheck.status === 200, `Verdict: ${tcData.verdict}, Score: ${tcData.readiness_score}`);

    const dbTcCheck = await pg.query("SELECT id, profile_id, company_id, verdict FROM public.talent_checks WHERE profile_id = $1", [profileData.id]);
    record("Supabase DB: talent_checks row verified", dbTcCheck.rows.length >= 1, `Saved verdict: ${dbTcCheck.rows[0]?.verdict}`);

    // 7. Skill Match API (Role 5 -> Supabase skill_matches)
    const rSkillMatch = await fetch(`${BACKEND_URL}/api/skill-match`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile_id: profileData.id,
        jd_id: "b2f4-google-swe",
        refresh: true
      })
    });
    const smData = await rSkillMatch.json();
    record("POST /api/skill-match", rSkillMatch.status === 200, `Match Score: ${smData.match_score}`);

    const dbSmCheck = await pg.query("SELECT id, profile_id, match_score FROM public.skill_matches WHERE profile_id = $1", [profileData.id]);
    record("Supabase DB: skill_matches row verified", dbSmCheck.rows.length >= 1, `Saved score: ${dbSmCheck.rows[0]?.match_score}`);

    // Clean up created test profile
    await fetch(`${BACKEND_URL}/api/profiles/${profileData.id}`, { method: "DELETE" });
    console.log("\n[Clean-up] Removed test candidate profile.");

  } catch (err) {
    console.error("Test execution error:", err);
  } finally {
    await pg.end();
  }

  console.log("\n=== TEST SUMMARY ===");
  const allPassed = results.every(r => r.passed);
  console.log(`Total: ${results.length} | Passed: ${results.filter(r => r.passed).length} | Failed: ${results.filter(r => !r.passed).length}`);
  if (!allPassed) {
    process.exit(1);
  }
}

main();
