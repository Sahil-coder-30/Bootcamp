// Role 1: JD Analytics orchestration. The backend owns state (documents, extraction cache,
// job postings); the agent owns compute (/documents/parse, /extract/jd).
// Cache key = (document_id, prompt_version); document_id is unique per sha256.
import { createHash } from "node:crypto";
import { callAgent } from "./agent.service.js";
import { listCompanies } from "./companies.service.js";
import { getJdStore, type DocKind, type DocumentRow, type ExtractionRow, type JobPostingRow } from "./jdStore.js";
import { HttpError } from "../middlewares/errorHandler.js";

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

export interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype?: string;
}

interface AgentSection {
  kind: string;
  label: string;
  requirement_hint: "must" | "nice" | null;
  start: number;
  end: number;
  signal?: boolean;
  drop?: boolean;
}

interface AgentParsedDocument {
  text: string;
  page_count: number;
  pages: [number, number][];
  sections: AgentSection[];
  layout: string;
  parser_version: string;
  warnings: string[];
  sha256: string;
}

export interface JdSkill {
  skill_name: string;
  category_code: string;
  evidence: string;
  confidence: "high" | "medium" | "low";
  canonical_id?: string | null;
  level_hint?: number | null;
  requirement?: "must" | "nice" | null;
  section?: string | null;
  evidence_span?: { start: number; end: number; page?: number } | null;
}

export interface ExtractedSkillList {
  source_type: "jd";
  source_file: string;
  company: string | null;
  role: string | null;
  skills: JdSkill[];
  document_id: string | null;
  company_id: number | null;
  category_levels: Record<string, number>;
  jd_id?: string | null;
  extraction_id?: string | null;
  meta: Record<string, unknown> & { prompt_version: string; model: string; cached?: boolean; degraded?: boolean };
}

// --- helpers -------------------------------------------------------------------------

type FileType = { ext: "pdf" | "docx" | "txt"; mime: string };

/** Magic bytes, not the file name: %PDF-, a ZIP with word/document.xml, or UTF-8 text. */
export function sniffFileType(buf: Buffer, name: string): FileType | null {
  if (buf.subarray(0, 5).toString("latin1") === "%PDF-") return { ext: "pdf", mime: "application/pdf" };
  if (buf[0] === 0x50 && buf[1] === 0x4b) {
    return buf.includes("word/document.xml", 0, "latin1")
      ? { ext: "docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }
      : null;
  }
  if (/\.(txt|md)$/i.test(name)) {
    const text = buf.toString("utf8");
    if (!text.includes("�")) return { ext: "txt", mime: "text/plain" };
  }
  return null;
}

const sectionSummary = (sections: unknown[]) =>
  (sections as AgentSection[]).map((s) => ({ kind: s.kind, label: s.label, requirement_hint: s.requirement_hint }));

function documentResponse(doc: DocumentRow, cached: boolean) {
  return {
    document_id: doc.id,
    sha256: doc.sha256,
    cached,
    kind: doc.kind,
    file_name: doc.file_name,
    storage_path: doc.storage_path,
    page_count: doc.page_count,
    char_count: doc.text.length,
    sections: sectionSummary(doc.sections),
    warnings: doc.warnings,
  };
}

let versionMemo: { value: string; at: number } | null = null;

/** Current JD prompt version from the agent (the cache key), memoised for 5 minutes. */
export async function promptVersion(): Promise<string> {
  if (versionMemo && Date.now() - versionMemo.at < 300_000) return versionMemo.value;
  const v = await callAgent<{ prompt_version: string }>("extract/jd/version");
  versionMemo = { value: v.prompt_version, at: Date.now() };
  return v.prompt_version;
}

let companyMemo: { value: { company_id: number; name: string }[]; at: number } | null = null;

async function companyRefs() {
  if (companyMemo && Date.now() - companyMemo.at < 600_000) return companyMemo.value;
  try {
    const value = (await listCompanies()).map((c) => ({ company_id: c.id, name: c.name }));
    companyMemo = { value, at: Date.now() };
    return value;
  } catch (err) {
    // The agent still pins Google / Microsoft / Oracle FSS without the list.
    console.warn(`[jd] company list unavailable: ${(err as Error).message}`);
    return [];
  }
}

/** Test hook: forget memoised agent version and company list. */
export function resetJdMemo() {
  versionMemo = null;
  companyMemo = null;
}

function withIds(ex: ExtractionRow, jp: JobPostingRow | null, cached: boolean): ExtractedSkillList {
  const result = ex.result as unknown as ExtractedSkillList;
  return {
    ...result,
    jd_id: jp?.id ?? null,
    extraction_id: ex.id,
    meta: { ...result.meta, cached },
  };
}

function topCategories(skills: JdSkill[], levels: Record<string, number>): string[] {
  const count: Record<string, number> = {};
  for (const s of skills) {
    if (s.category_code === "OTHER") continue;
    count[s.category_code] = (count[s.category_code] ?? 0) + (s.requirement === "nice" ? 0.5 : 1);
  }
  return Object.keys(count)
    .sort((a, b) => (count[b] ?? 0) - (count[a] ?? 0) || (levels[b] ?? 0) - (levels[a] ?? 0))
    .slice(0, 3);
}

// --- documents --------------------------------------------------------------------------

export async function uploadDocument(file: UploadedFile | undefined, kind: DocKind) {
  if (!file || file.buffer.length === 0) throw new HttpError(400, "no file: send multipart field `file`");
  if (file.buffer.length > MAX_DOCUMENT_BYTES) throw new HttpError(413, "File larger than 10 MB");
  const type = sniffFileType(file.buffer, file.originalname);
  if (!type) throw new HttpError(415, "Only PDF, DOCX or TXT files are supported");

  const store = getJdStore();
  const sha256 = createHash("sha256").update(file.buffer).digest("hex");
  const existing = await store.findDocumentBySha(sha256);
  if (existing) return { status: 200, body: documentResponse(existing, true) };

  const parsed = await callAgent<AgentParsedDocument>("documents/parse", {
    file_name: file.originalname,
    mime: type.mime,
    content_b64: file.buffer.toString("base64"),
  });
  const doc = await store.insertDocument(
    {
      kind,
      file_name: file.originalname,
      sha256,
      storage_path: `${kind}/${sha256}.${type.ext}`,
      mime: type.mime,
      size_bytes: file.buffer.length,
      text: parsed.text,
      sections: parsed.sections,
      pages: parsed.pages,
      page_count: parsed.page_count,
      parser_version: parsed.parser_version,
      warnings: parsed.warnings,
    },
    file.buffer,
  );
  return { status: 201, body: documentResponse(doc, false) };
}

export async function getDocument(id: string) {
  const doc = await getJdStore().getDocument(id);
  if (!doc) throw new HttpError(404, "document not found");
  return { ...documentResponse(doc, false), text: doc.text, sections: doc.sections, pages: doc.pages };
}

// --- JD extraction -------------------------------------------------------------------------

export interface ExtractInput {
  document_id: string;
  company_id?: number;
  role?: string;
  force?: boolean;
}

export async function extractJd(input: ExtractInput): Promise<ExtractedSkillList> {
  const store = getJdStore();
  const doc = await store.getDocument(input.document_id);
  if (!doc) throw new HttpError(404, "document not found");
  if (doc.kind !== "jd") throw new HttpError(409, `document kind is ${doc.kind}`);

  const version = await promptVersion();
  if (!input.force) {
    const hit = await store.findExtraction(doc.id, version);
    const result = hit?.result as unknown as ExtractedSkillList | undefined;
    const sameAsked =
      (input.company_id === undefined || input.company_id === result?.company_id) &&
      (input.role === undefined || input.role === result?.role);
    // A degraded (keyword-only) answer is kept but never served from cache: retry the LLM.
    if (hit && result && sameAsked && !result.meta?.degraded) {
      return withIds(hit, await store.getJobPostingByDocument(doc.id), true);
    }
  }

  const result = await callAgent<ExtractedSkillList>("extract/jd", {
    source_file: doc.file_name,
    document_id: doc.id,
    doc_sha256: doc.sha256,
    company_id: input.company_id ?? null,
    role: input.role ?? null,
    companies: await companyRefs(),
    document: {
      text: doc.text,
      page_count: doc.page_count,
      pages: doc.pages,
      sections: doc.sections,
      parser_version: doc.parser_version ?? "doc-1.0",
      warnings: doc.warnings,
    },
  });

  const extraction = await store.upsertExtraction({
    document_id: doc.id,
    source_type: "jd",
    prompt_version: result.meta.prompt_version,
    model: result.meta.model,
    result: result as unknown as Record<string, unknown>,
    latency_ms: typeof result.meta.latency_ms === "number" ? result.meta.latency_ms : null,
  });
  const posting = await store.upsertJobPosting({
    extraction_id: extraction.id,
    document_id: doc.id,
    company_id: result.company_id,
    company_name: result.company,
    role: result.role,
    location: typeof result.meta.location === "string" ? result.meta.location : null,
    skill_count: result.skills.length,
    must_count: result.skills.filter((s) => s.requirement !== "nice").length,
    top_categories: topCategories(result.skills, result.category_levels),
    prompt_version: result.meta.prompt_version,
    is_sample: false,
  });
  console.log(
    `[jd] extract doc=${doc.id} model=${result.meta.model} skills=${result.skills.length} ms=${result.meta.latency_ms}`,
  );
  return withIds(extraction, posting, false);
}

export async function listJds() {
  const store = getJdStore();
  const postings = await store.listJobPostings();
  return Promise.all(
    postings.map(async (jp) => {
      const doc = await store.getDocument(jp.document_id);
      return {
        jd_id: jp.id,
        document_id: jp.document_id,
        file_name: doc?.file_name ?? null,
        company_id: jp.company_id,
        company_name: jp.company_name,
        role: jp.role,
        location: jp.location,
        skill_count: jp.skill_count,
        must_count: jp.must_count,
        top_categories: jp.top_categories,
        prompt_version: jp.prompt_version,
        is_sample: jp.is_sample,
        created_at: jp.created_at,
        updated_at: jp.updated_at,
      };
    }),
  );
}

export async function getJd(jdId: string) {
  const store = getJdStore();
  const jp = await store.getJobPosting(jdId);
  if (!jp) throw new HttpError(404, "JD not found");
  const [ex, doc] = await Promise.all([store.getExtraction(jp.extraction_id), store.getDocument(jp.document_id)]);
  if (!ex || !doc) throw new HttpError(404, "JD extraction not found");
  return {
    jd_id: jp.id,
    extraction: withIds(ex, jp, true),
    job_posting: jp,
    document: {
      document_id: doc.id,
      file_name: doc.file_name,
      kind: doc.kind,
      text: doc.text,
      sections: doc.sections,
      pages: doc.pages,
      page_count: doc.page_count,
    },
  };
}
