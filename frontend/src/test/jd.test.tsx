import { fireEvent, renderHook, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("@/services/apiClient", () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
  toErrorMessage: vi.fn((err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback,
  ),
}));

import { apiClient } from "@/services/apiClient";
import { JdPage } from "@/features/jd/components/JdPage";
import { useGroupedSkills } from "@/features/jd/Hooks/jd.hooks";
import type { ExtractedSkillList, JdDetail, JdSummary } from "@/features/jd/service/jd.api";
import { renderPage } from "./utils";

const TEXT =
  "Google LLC\nMinimum Qualifications:\n- Strong knowledge of data structures and algorithms.\n- Familiarity with Kubernetes.";
const ev = (s: string) => ({ start: TEXT.indexOf(s), end: TEXT.indexOf(s) + s.length, page: 1 });

const EXTRACTION: ExtractedSkillList = {
  source_type: "jd",
  source_file: "google.pdf",
  company: "Google LLC",
  role: "Software Engineer",
  document_id: "doc-1",
  company_id: 4,
  jd_id: "jd-1",
  category_levels: { DSA: 5, CLOUD: 2 },
  skills: [
    {
      skill_name: "Data structures and algorithms",
      category_code: "DSA",
      evidence: "Strong knowledge of data structures and algorithms",
      evidence_span: ev("Strong knowledge of data structures and algorithms"),
      confidence: "high",
      level_hint: 5,
      requirement: "must",
    },
    {
      skill_name: "Kubernetes",
      category_code: "CLOUD",
      evidence: "Familiarity with Kubernetes",
      evidence_span: ev("Familiarity with Kubernetes"),
      confidence: "medium",
      level_hint: 2,
      requirement: "nice",
    },
  ],
  meta: {
    prompt_version: "jd-v1",
    model: "gemini:flash",
    cached: true,
    latency_ms: 7000,
    seniority: "fresher",
  },
};

const SUMMARY: JdSummary = {
  jd_id: "jd-1",
  document_id: "doc-1",
  file_name: "google.pdf",
  company_id: 4,
  company_name: "Google LLC",
  role: "Software Engineer",
  location: "Bengaluru",
  skill_count: 2,
  must_count: 1,
  top_categories: ["DSA", "CLOUD"],
  prompt_version: "jd-v1",
  is_sample: false,
  created_at: "",
  updated_at: "",
};

const DETAIL: JdDetail = {
  jd_id: "jd-1",
  extraction: EXTRACTION,
  document: {
    document_id: "doc-1",
    file_name: "google.pdf",
    text: TEXT,
    sections: [],
    page_count: 1,
  },
};

const get = vi.mocked(apiClient.get);
const post = vi.mocked(apiClient.post);

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  get.mockImplementation(async (url: string) => ({ data: url === "/jds" ? [SUMMARY] : DETAIL }));
});

describe("JD Analytics page", () => {
  it("opens the newest JD, groups skills by category and highlights evidence on click", async () => {
    renderPage(JdPage, "/jd");
    expect(await screen.findByRole("heading", { name: "Software Engineer" })).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Data Structures & Algorithms" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/required level 5 \(AS\)/)).toBeInTheDocument();
    expect(screen.getByText("cached")).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith("/jds/jd-1");

    fireEvent.click(screen.getByRole("button", { name: /Kubernetes/ }));
    const mark = screen.getByTestId("jd-text").querySelector("mark");
    expect(mark?.textContent).toBe("Familiarity with Kubernetes");
    expect(screen.getByText(/Evidence for Kubernetes/)).toBeInTheDocument();
  });

  it("uploads a file, extracts it and shows the result", async () => {
    get.mockImplementation(async (url: string) => ({ data: url === "/jds" ? [] : DETAIL }));
    post.mockImplementation(async (url: string) => ({
      data: url === "/documents" ? { document_id: "doc-1", cached: false } : EXTRACTION,
    }));
    renderPage(JdPage, "/jd");
    expect(await screen.findByText(/No JDs yet/)).toBeInTheDocument();

    const file = new File(["%PDF-1.4"], "google.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByTestId("jd-file-input"), { target: { files: [file] } });

    expect(await screen.findByRole("heading", { name: "Software Engineer" })).toBeInTheDocument();
    expect(post.mock.calls[0]![0]).toBe("/documents");
    expect(post.mock.calls[1]![0]).toBe("/jds/extract");
    expect(post.mock.calls[1]![1]).toEqual({ document_id: "doc-1" });
  });

  it("shows the upload error", async () => {
    post.mockRejectedValue(new Error("Only PDF, DOCX or TXT files are supported"));
    renderPage(JdPage, "/jd");
    const file = new File(["x"], "a.exe");
    fireEvent.change(await screen.findByTestId("jd-file-input"), { target: { files: [file] } });
    expect(await screen.findByRole("alert")).toHaveTextContent("Only PDF, DOCX or TXT");
  });
});

describe("useGroupedSkills", () => {
  it("orders groups by category and splits must / nice", () => {
    const skills = [
      { ...EXTRACTION.skills[1]!, requirement: "must" as const },
      EXTRACTION.skills[0]!,
      {
        skill_name: "Banking",
        category_code: "XYZ",
        evidence: "b",
        confidence: "low" as const,
        requirement: "nice" as const,
      },
    ];
    const { result } = renderHook(() => useGroupedSkills(skills, { DSA: 5 }));
    expect(result.current.map((g) => g.code)).toEqual(["DSA", "CLOUD", "OTHER"]);
    expect(result.current[0]!.level).toBe(5);
    expect(result.current[2]!.nice).toHaveLength(1);
  });
});
