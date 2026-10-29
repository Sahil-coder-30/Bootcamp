import { callAgent } from "./agent.service.js";
import { env } from "../config/env.js";

export interface ParseResumeParams {
  content_b64?: string;
  file_name?: string;
  mime?: string;
  sample_key?: string;
}

export const FALLBACK_SAMPLES: Record<string, any> = {
  ananya: {
    source_type: "resume",
    source_file: "Ananya_Rao.pdf",
    candidate: {
      name: "Ananya Rao",
      email: "ananya.rao@jssaten.ac.in",
      phone: "+919876543210",
      links: ["github.com/ananyarao", "linkedin.com/in/ananyarao"],
    },
    role: "Systems / Software Engineer",
    skills: [
      { skill_name: "Go", category_code: "COD", evidence: "Built Kafka-based event pipeline in Go", confidence: "high", section: "experience" },
      { skill_name: "Kafka", category_code: "SYSD", evidence: "High-throughput Kafka-based event ingestion pipeline", confidence: "high", section: "experience" },
      { skill_name: "Distributed Systems", category_code: "SYSD", evidence: "Engineered distributed locking mechanisms to prevent double-spending", confidence: "high", section: "experience" },
      { skill_name: "Raft", category_code: "SYSD", evidence: "Implemented Raft consensus algorithm from scratch in Go", confidence: "high", section: "projects" },
      { skill_name: "Data Structures", category_code: "DSA", evidence: "Implemented LSM trees and skip lists in MiniKV", confidence: "high", section: "projects" },
    ],
    education: [
      { degree: "B.Tech Computer Science and Engineering", institution: "JSS Academy of Technical Education", year: "2026", score: "8.85 CGPA" },
    ],
    experience: [
      {
        title: "Software Engineering Intern",
        org: "Acme Payments Infrastructure",
        kind: "internship",
        start: "2025-05",
        end: "2025-07",
        highlights: [
          "Engineered a high-throughput Kafka-based event ingestion pipeline in Go.",
          "Reduced cross-region transaction settlement latency by 40% under peak load.",
          "Designed Redis distributed locking mechanisms to prevent double-spending.",
        ],
        skills: ["Go", "Kafka", "Redis", "Distributed Systems", "Docker"],
      },
    ],
    projects: [
      {
        name: "Raft-KV: Distributed Key-Value Store",
        description: "Implemented the Raft consensus algorithm from scratch in Go with leader election and log replication handling 10k ops/sec.",
        skills: ["Go", "Raft", "gRPC", "Concurrency", "Linux"],
        link: "github.com/ananyarao/raft-kv",
      },
    ],
    hackathons: [{ name: "Smart India Hackathon (Hardware & Systems)", result: "Winner", year: "2024" }],
    certifications: [{ name: "AWS Certified Cloud Practitioner", issuer: "Amazon Web Services", year: "2025" }],
    category_levels: {
      COD: 7, DSA: 7, APTI: 6, COMM: 5, OOD: 6, AI: 4,
      SQL: 4, SYSD: 6, CLOUD: 5, SWE: 6, NETW: 6, OS: 7,
    },
    category_level_details: {
      SYSD: { level: 6, bloom: "EV", confidence: "high", points: 85, basis: "Raft consensus & distributed locking", evidence_refs: ["experience", "projects"] },
      DSA: { level: 7, bloom: "EV", confidence: "high", points: 90, basis: "LSM trees & competitive programming", evidence_refs: ["projects"] },
      COD: { level: 7, bloom: "EV", confidence: "high", points: 88, basis: "Go microservices & Kafka", evidence_refs: ["experience"] },
    },
    field_confidence: { candidate: "high", education: "high", experience: "high", projects: "high" },
    meta: { schema_version: "1.0", doc_sha256: "golden_ananya", latency_ms: 12.4, cached: true },
  },
  karthik: {
    source_type: "resume",
    source_file: "Karthik_Subramaniam.pdf",
    candidate: {
      name: "Karthik Subramaniam",
      email: "karthik.subramaniam@jssaten.ac.in",
      phone: "+919123456780",
      links: ["github.com/karthik-s", "linkedin.com/in/karthiksubramaniam"],
    },
    role: "Data / Backend Engineer",
    skills: [
      { skill_name: "SQL", category_code: "SQL", evidence: "Optimized complex multi-table joins and window queries", confidence: "high", section: "experience" },
      { skill_name: "PostgreSQL", category_code: "SQL", evidence: "PostgreSQL indexing and query planner tuning", confidence: "high", section: "projects" },
      { skill_name: "Python", category_code: "COD", evidence: "Data engineering pipelines in Python and Pandas", confidence: "high", section: "experience" },
      { skill_name: "Machine Learning", category_code: "AI", evidence: "Trained XGBoost models achieving 89% recall", confidence: "high", section: "projects" },
    ],
    education: [
      { degree: "B.Tech Information Technology", institution: "JSS Academy of Technical Education", year: "2026", score: "8.40 CGPA" },
    ],
    experience: [
      {
        title: "Data Engineering Intern",
        org: "DataCraft Analytics",
        kind: "internship",
        start: "2025-05",
        end: "2025-07",
        highlights: ["Automated ETL ingestion pipelines using SQL and Python."],
        skills: ["SQL", "PostgreSQL", "Python", "Airflow"],
      },
    ],
    projects: [
      {
        name: "Customer Churn Prediction Engine",
        description: "Built end-to-end ML pipeline with SQL feature store and XGBoost inference.",
        skills: ["SQL", "Python", "Scikit-learn"],
      },
    ],
    hackathons: [],
    certifications: [],
    category_levels: {
      COD: 5, DSA: 4, APTI: 7, COMM: 6, OOD: 3, AI: 6,
      SQL: 7, SYSD: 3, CLOUD: 3, SWE: 4, NETW: 2, OS: 2,
    },
    category_level_details: {
      SQL: { level: 7, bloom: "EV", confidence: "high", points: 92, basis: "ETL pipelines and database query tuning", evidence_refs: ["experience", "projects"] },
      AI: { level: 6, bloom: "AN", confidence: "high", points: 80, basis: "ML models and feature store", evidence_refs: ["projects"] },
    },
    field_confidence: { candidate: "high", education: "high", experience: "high", projects: "high" },
    meta: { schema_version: "1.0", doc_sha256: "golden_karthik", latency_ms: 10.1, cached: true },
  },
  rohan: {
    source_type: "resume",
    source_file: "Rohan_Verma.pdf",
    candidate: {
      name: "Rohan Verma",
      email: "rohan.verma@example.com",
      phone: "+919811223344",
      links: ["github.com/rohanverma"],
    },
    role: "Systems / Core Engineer",
    skills: [
      { skill_name: "Rust", category_code: "COD", evidence: "ShardDB is written in Rust", confidence: "high", section: "projects" },
      { skill_name: "Dynamic Programming", category_code: "DSA", evidence: "ICPC regionals rank 14", confidence: "high", section: "hackathons" },
      { skill_name: "Distributed Systems", category_code: "SYSD", evidence: "ShardDB consensus and partition handling", confidence: "high", section: "projects" },
    ],
    education: [
      { degree: "B.Tech CSE", institution: "LMN Institute of Technology", year: "2026", score: "9.1 CGPA" },
    ],
    experience: [],
    projects: [
      {
        name: "ShardDB",
        description: "Distributed shard manager with Raft-like partition resilience written in Rust.",
        skills: ["Rust", "Operating Systems", "Networking"],
      },
    ],
    hackathons: [{ name: "ICPC Regionals", result: "Rank 14", year: "2025" }],
    certifications: [],
    category_levels: {
      COD: 8, DSA: 8, APTI: 7, COMM: 7, OOD: 6, AI: 7,
      SQL: 6, SYSD: 7, CLOUD: 6, SWE: 6, NETW: 5, OS: 7,
    },
    category_level_details: {
      COD: { level: 8, bloom: "CR", confidence: "high", points: 95, basis: "ShardDB in Rust", evidence_refs: ["projects"] },
      DSA: { level: 8, bloom: "CR", confidence: "high", points: 94, basis: "ICPC Rank 14", evidence_refs: ["hackathons"] },
    },
    field_confidence: { candidate: "high", education: "high", experience: "high", projects: "high" },
    meta: { schema_version: "1.0", doc_sha256: "golden_rohan", latency_ms: 11.2, cached: true },
  },
  priya: {
    source_type: "resume",
    source_file: "Priya_Menon.pdf",
    candidate: {
      name: "Priya Menon",
      email: "priya.menon@jssaten.ac.in",
      phone: "+919700112233",
      links: ["linkedin.com/in/priyamenon"],
    },
    role: "Technical Support / Entry Engineer",
    skills: [
      { skill_name: "Technical Support", category_code: "COMM", evidence: "Triaged 60+ customer tickets weekly", confidence: "high", section: "experience" },
      { skill_name: "SQL", category_code: "SQL", evidence: "Ad-hoc SQL validation queries", confidence: "medium", section: "experience" },
    ],
    education: [
      { degree: "B.Tech Computer Science", institution: "JSS Academy of Technical Education", year: "2026", score: "8.10 CGPA" },
    ],
    experience: [
      {
        title: "Technical Operations Intern",
        org: "FinServ Cloud Systems",
        kind: "internship",
        start: "2025-05",
        end: "2025-07",
        highlights: ["Triaged and resolved 60+ customer database access tickets."],
        skills: ["SQL", "Customer Support", "Communication"],
      },
    ],
    projects: [],
    hackathons: [],
    certifications: [],
    category_levels: {
      COD: 4, DSA: 3, APTI: 5, COMM: 6, OOD: 3, AI: 2,
      SQL: 5, SYSD: 2, CLOUD: 3, SWE: 4, NETW: 4, OS: 4,
    },
    category_level_details: {
      COMM: { level: 6, bloom: "AP", confidence: "high", points: 75, basis: "Operations communication", evidence_refs: ["experience"] },
    },
    field_confidence: { candidate: "high", education: "high", experience: "high", projects: "medium" },
    meta: { schema_version: "1.0", doc_sha256: "golden_priya", latency_ms: 9.8, cached: true },
  },
};

export async function parseResume(params: ParseResumeParams): Promise<any> {
  if (params.content_b64) {
    try {
      const buf = Buffer.from(params.content_b64, "base64");
      const form = new FormData();
      form.append("file", new Blob([buf], { type: params.mime || "application/pdf" }), params.file_name || "resume.pdf");
      const res = await fetch(`${env.resumeUrl}/parse`, { method: "POST", body: form });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // fall back to agent
    }
  }
  if (params.sample_key) {
    const key = params.sample_key.toLowerCase();
    try {
      return await callAgent(`extract/resume/sample/${encodeURIComponent(params.sample_key)}`);
    } catch (err: any) {
      if (err?.status === 502 && FALLBACK_SAMPLES[key]) {
        return FALLBACK_SAMPLES[key];
      }
      throw err;
    }
  }
  return callAgent("extract/resume/json", {
    content_b64: params.content_b64,
    file_name: params.file_name || "resume.pdf",
    mime: params.mime || "application/pdf",
  });
}

export async function getSampleResume(candidateKey: string): Promise<any> {
  const key = candidateKey.toLowerCase();
  try {
    return await callAgent(`extract/resume/sample/${encodeURIComponent(candidateKey)}`);
  } catch (err: any) {
    if (err?.status === 502 && FALLBACK_SAMPLES[key]) {
      return FALLBACK_SAMPLES[key];
    }
    throw err;
  }
}

export async function inferLevels(extraction: any): Promise<any> {
  try {
    const res = await fetch(`${env.resumeUrl}/levels/infer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(extraction),
    });
    if (res.ok) {
      const data = await res.json();
      return {
        category_levels: data.category_levels || {},
        category_level_details: data.category_level_details || {},
        latency_ms: data.meta?.latency_ms ?? 1.0,
      };
    }
  } catch {
    // fall back to agent
  }
  try {
    return await callAgent("levels/infer", { extraction });
  } catch (err: any) {
    if (err?.status === 502 && extraction?.category_levels) {
      return {
        category_levels: extraction.category_levels,
        category_level_details: extraction.category_level_details || {},
        latency_ms: 1.0,
      };
    }
    throw err;
  }
}
