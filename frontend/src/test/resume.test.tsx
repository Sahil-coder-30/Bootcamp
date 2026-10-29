import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ResumeUploadCard } from "@/features/resume/components/ResumeUploadCard";
import { SkillChips } from "@/features/resume/components/SkillChips";
import { FormatInvarianceCard } from "@/features/resume/components/FormatInvarianceCard";
import { HowWeGotThisDrawer } from "@/features/resume/components/HowWeGotThisDrawer";
import type { ResumeExtraction } from "@/features/resume/service/resume.api";

describe("Resume Parsing Feature Components", () => {
  const dummyExtraction: ResumeExtraction = {
    source_type: "resume",
    source_file: "ananya_rao.pdf",
    company: null,
    document_id: "doc-test-1",
    candidate: {
      name: "Ananya Rao",
      email: "[EMAIL]",
      phone: "[PHONE]",
      links: ["github.com/ananyarao"],
    },
    education: [
      {
        degree: "B.Tech Computer Science",
        institution: "IIT Bombay",
        year: "2021–2025",
        score: "9.2 CGPA",
      },
    ],
    experience: [
      {
        title: "SDE Intern",
        org: "Acme Payments",
        kind: "internship",
        start: "2024-05",
        end: "2024-08",
        highlights: ["Built Kafka pipeline reducing settlement latency by 40%"],
        skills: ["Kafka", "Go", "Distributed Systems"],
      },
    ],
    projects: [
      {
        name: "Raft KV Store",
        description: "Implemented Raft consensus in Go handling 10k ops/sec",
        skills: ["Go", "Raft", "Consensus"],
        link: "https://github.com/ananyarao/raft-kv",
      },
    ],
    hackathons: [],
    certifications: [],
    skills: [
      {
        skill_name: "Go",
        canonical_id: "go",
        category_code: "COD",
        confidence: "high",
        evidence: "Implemented Raft consensus in Go",
      },
      {
        skill_name: "Kafka",
        canonical_id: "apache_kafka",
        category_code: "SYSD",
        confidence: "high",
        evidence: "Built Kafka pipeline reducing settlement latency",
      },
    ],
    category_levels: {
      COD: 8,
      DSA: 8,
      APTI: 5,
      COMM: 4,
      OOD: 5,
      AI: 2,
      SQL: 3,
      SYSD: 6,
      CLOUD: 5,
      SWE: 6,
      NETW: 5,
      OS: 6,
    },
    category_level_details: {
      SYSD: {
        level: 6,
        bloom: "AS",
        confidence: "high",
        points: 8.25,
        basis: "1 internship + 1 project · designed, quantified → 6 AS",
        evidence_refs: ["experience[0]", "projects[0]"],
      },
    },
    field_confidence: {
      candidate: "high",
      skills: "high",
      experience: "high",
      education: "high",
    },
    meta: {
      layout: "two_column",
      sections_found: ["EDUCATION", "EXPERIENCE", "PROJECTS", "SKILLS"],
      latency_ms: 142,
      llm_calls: 0,
      grounding_rate: 0.96,
      pii_redacted: true,
      prompt_version: "resume-v1",
      levels_version: "lv-1.0",
      warnings: [],
    },
  };

  it("renders ResumeUploadCard with clean full-width dropzone", () => {
    const handleUpload = vi.fn();

    render(
      <ResumeUploadCard
        onFileUpload={handleUpload}
        isLoading={false}
        currentCandidateName="Sample Candidate"
      />,
    );

    expect(screen.getByText(/Resume Ingestion & Deterministic Parser/i)).toBeInTheDocument();
    expect(screen.getByText(/Zero PII Sent: Contacts Redacted/i)).toBeInTheDocument();
    expect(screen.getByText(/Drop candidate resume here, or browse/i)).toBeInTheDocument();
  });

  it("renders SkillChips with evidence and category badges", () => {
    const handleClick = vi.fn();

    render(
      <SkillChips
        skills={dummyExtraction.skills}
        highlightedSkill="Go"
        onSkillClick={handleClick}
      />,
    );

    const goChip = screen.getByText("Go");
    expect(goChip).toBeInTheDocument();
    const kafkaChip = screen.getByText("Kafka");
    expect(kafkaChip).toBeInTheDocument();

    fireEvent.click(kafkaChip);
    expect(handleClick).toHaveBeenCalledWith("Kafka");
  });

  it("renders FormatInvarianceCard and toggles candidate proofs", () => {
    render(<FormatInvarianceCard />);

    expect(
      screen.getByText(/Format Invariance Verification \(PDF vs\. DOCX\)/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Skill Jaccard Overlap/i)).toBeInTheDocument();
    expect(screen.getByText(/Level MAE Difference/i)).toBeInTheDocument();

    // Switch to Archetype B proof
    const archetypeBTab = screen.getByRole("button", { name: /Archetype B/i });
    fireEvent.click(archetypeBTab);
    expect(screen.getByText(/Archetype B \(Data\)/i)).toBeInTheDocument();
  });

  it("renders HowWeGotThisDrawer with privacy and telemetry audit", () => {
    const handleClose = vi.fn();

    render(<HowWeGotThisDrawer isOpen={true} onClose={handleClose} extraction={dummyExtraction} />);

    expect(screen.getByText(/Parsing Provenance & Telemetry/i)).toBeInTheDocument();
    expect(screen.getByText(/Zero PII Transmission/i)).toBeInTheDocument();
    expect(screen.getByText(/142 ms/i)).toBeInTheDocument();
    expect(screen.getByText(/Two Column Gutter/i)).toBeInTheDocument();
    expect(screen.getByText(/96% grounded/i)).toBeInTheDocument();
  });
});
