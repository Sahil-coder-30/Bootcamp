/**
 * skillMatch.service.ts
 * Core business orchestrator for Role 5: Skill Matching.
 * Handles inputs loading, agent call proxying, DB caching, and matrix computation.
 */

import { supabase } from "./supabase.service.js";
import { callAgent } from "./agent.service.js";
import { getProfile, type CandidateProfile, GOLDEN_PROFILES } from "./talentCheck.service.js";
import { getTopicsByCategory } from "./topics.service.js";
import { HttpError } from "../middlewares/errorHandler.js";

export const MATCHING_VERSION = "sm-1.0";

// Sample Job Postings for fallback / demo
export const GOLDEN_JDS: Record<string, any> = {
  "b2f4-google-swe": {
    jd_id: "b2f4-google-swe",
    source_type: "jd",
    source_file: "google_swe.pdf",
    company: "Google LLC",
    role: "Software Engineer",
    skills: [
      {
        skill_name: "Data Structures and Algorithms",
        category_code: "DSA",
        requirement: "must",
        section: "requirements",
        confidence: "high",
        evidence: "Strong knowledge of data structures and algorithms",
      },
      {
        skill_name: "Golang",
        category_code: "COD",
        requirement: "must",
        section: "requirements",
        confidence: "high",
        evidence: "Experience with Go, Java, C++, or Python",
        alt_group: "alt_prog_lang",
      },
      {
        skill_name: "Distributed systems",
        category_code: "SYSD",
        requirement: "must",
        section: "responsibilities",
        confidence: "high",
        evidence: "Design, develop, test, deploy, maintain and improve distributed systems",
      },
      {
        skill_name: "Kubernetes",
        category_code: "CLOUD",
        requirement: "must",
        section: "requirements",
        confidence: "high",
        evidence: "Hands-on experience with Kubernetes and containerized services",
      },
      {
        skill_name: "Git",
        category_code: "SWE",
        requirement: "must",
        section: "requirements",
        confidence: "high",
        evidence: "Proficient in version control systems such as Git",
      },
      {
        skill_name: "Machine learning",
        category_code: "AI",
        requirement: "nice",
        section: "skills",
        confidence: "medium",
        evidence: "Familiarity with machine learning frameworks like TensorFlow or PyTorch is a plus",
      },
      {
        skill_name: "GCP",
        category_code: "CLOUD",
        requirement: "nice",
        section: "skills",
        confidence: "medium",
        evidence: "Experience deploying cloud workloads on Google Cloud Platform (GCP) or AWS",
      },
      {
        skill_name: "Communication",
        category_code: "COMM",
        requirement: "nice",
        section: "skills",
        confidence: "medium",
        evidence: "Effective written and verbal communication skills",
      },
    ],
    category_levels: {
      DSA: 6,
      COD: 6,
      SYSD: 5,
      OS: 5,
      NETW: 4,
      CLOUD: 4,
      SWE: 5,
    },
  },
  "c3a1-msft-data": {
    jd_id: "c3a1-msft-data",
    source_type: "jd",
    source_file: "msft_data_analyst.pdf",
    company: "Microsoft Corporation",
    role: "Data Analyst",
    skills: [
      {
        skill_name: "SQL",
        category_code: "SQL",
        requirement: "must",
        section: "requirements",
        confidence: "high",
        evidence: "Advanced SQL querying and data modeling capabilities",
      },
      {
        skill_name: "Python",
        category_code: "COD",
        requirement: "must",
        section: "requirements",
        confidence: "high",
        evidence: "Hands-on data analysis in Python using Pandas and NumPy",
      },
      {
        skill_name: "Machine learning",
        category_code: "AI",
        requirement: "must",
        section: "requirements",
        confidence: "high",
        evidence: "Predictive modeling and statistical evaluation methods",
      },
      {
        skill_name: "Communication",
        category_code: "COMM",
        requirement: "nice",
        section: "skills",
        confidence: "medium",
        evidence: "Ability to present analytical findings to cross-functional stakeholders",
      },
    ],
    category_levels: {
      SQL: 7,
      AI: 6,
      COD: 5,
      APTI: 6,
      COMM: 5,
    },
  },
  "d4e2-oracle-fss": {
    jd_id: "d4e2-oracle-fss",
    source_type: "jd",
    source_file: "oracle_fss_analyst.pdf",
    company: "Oracle Financial Services Software",
    role: "Application Support Analyst",
    skills: [
      {
        skill_name: "SQL",
        category_code: "SQL",
        requirement: "must",
        section: "requirements",
        confidence: "high",
        evidence: "Strong relational database SQL troubleshooting skills",
      },
      {
        skill_name: "Operating Systems",
        category_code: "OS",
        requirement: "must",
        section: "requirements",
        confidence: "high",
        evidence: "Linux shell scripting and system log analysis",
      },
      {
        skill_name: "Computer Networking",
        category_code: "NETW",
        requirement: "must",
        section: "requirements",
        confidence: "high",
        evidence: "TCP/IP socket communication and network diagnostic tools",
      },
      {
        skill_name: "Communication",
        category_code: "COMM",
        requirement: "must",
        section: "requirements",
        confidence: "high",
        evidence: "Clear client communication and issue escalation management",
      },
    ],
    category_levels: {
      SQL: 5,
      OS: 4,
      NETW: 4,
      COMM: 6,
      SWE: 4,
    },
  },
};

export async function getJdExtraction(jdId: string): Promise<any> {
  // 1. Try DB lookup
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("job_postings")
        .select("id, company_name, role, extractions(result)")
        .eq("id", jdId)
        .maybeSingle();

      if (!error && data?.extractions) {
        const ext = Array.isArray(data.extractions) ? data.extractions[0] : data.extractions;
        if (ext?.result) {
          return {
            ...ext.result,
            jd_id: data.id,
            company: data.company_name || ext.result.company,
            role: data.role || ext.result.role,
          };
        }
      }
    } catch {
      // Fallback
    }
  }

  // 2. Fallback to golden
  const golden = GOLDEN_JDS[jdId];
  if (golden) return golden;

  // Search by partial match
  const match = Object.values(GOLDEN_JDS).find((j) => j.jd_id.includes(jdId) || jdId.includes(j.jd_id));
  if (match) return match;

  throw new HttpError(404, `Job posting '${jdId}' not found`);
}

export async function runSkillMatch(params: {
  profileId: string;
  jdId: string;
  refresh?: boolean;
}): Promise<any> {
  const { profileId, jdId, refresh } = params;

  // Check cached result in DB
  if (!refresh && supabase) {
    try {
      const { data, error } = await supabase
        .from("skill_matches")
        .select("result, match_score, created_at")
        .eq("profile_id", profileId)
        .eq("job_posting_id", jdId)
        .eq("matching_version", MATCHING_VERSION)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data?.result) {
        return {
          ...data.result,
          meta: {
            ...data.result.meta,
            cached: true,
          },
        };
      }
    } catch {
      // continue to agent call
    }
  }

  // Load inputs
  const profile = await getProfile(profileId);
  const jd = await getJdExtraction(jdId);
  const topics = await getTopicsByCategory();

  // Call Agent
  const agentPayload = {
    jd,
    profile: {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      version: profile.version,
      skill_levels: profile.skill_levels,
      skills: (profile as any).skills || [],
      projects: (profile as any).projects || [],
      internships: (profile as any).internships || [],
      certifications: (profile as any).certifications || [],
    },
    topics,
    options: {
      use_llm: true,
      use_embeddings: true,
    },
  };

  const result = await callAgent<any>("skill-match", agentPayload);

  // Cache in DB if available
  if (supabase) {
    try {
      await supabase.from("skill_matches").insert({
        profile_id: profile.id,
        profile_version: profile.version,
        job_posting_id: jd.jd_id || jdId,
        result,
        match_score: result.match_score,
        matching_version: MATCHING_VERSION,
      });
    } catch {
      // Non-blocking
    }
  }

  return result;
}

export async function getSkillMatchMatrix(params: {
  profileIds?: string[];
  jdIds?: string[];
  refresh?: boolean;
}): Promise<any> {
  const pIds = params.profileIds && params.profileIds.length > 0 ? params.profileIds : Object.keys(GOLDEN_PROFILES);
  const jIds = params.jdIds && params.jdIds.length > 0 ? params.jdIds : Object.keys(GOLDEN_JDS);

  const candidates = await Promise.all(pIds.map((id) => getProfile(id)));
  const jds = await Promise.all(jIds.map((id) => getJdExtraction(id)));
  const topics = await getTopicsByCategory();

  const agentBatchPayload = {
    jds,
    candidates: candidates.map((p) => ({
      id: p.id,
      name: p.name,
      profile: {
        id: p.id,
        name: p.name,
        email: p.email,
        version: p.version,
        skill_levels: p.skill_levels,
      },
    })),
    topics,
    options: {
      use_llm: false, // fast batch for matrix
      use_embeddings: true,
    },
  };

  return await callAgent<any>("skill-match/batch", agentBatchPayload);
}

