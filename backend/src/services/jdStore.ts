// Role 1 persistence: documents, extractions and job_postings (migration
// 20261028_02_role1_jd_analytics.sql). Two interchangeable stores:
// - SupabaseJdStore: the real tables + the talent-docs Storage bucket (service-role key).
// - FileJdStore: one JSON file + the uploaded files on local disk, so the demo works
//   without the migration or the service-role key.
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";

export type DocKind = "jd" | "resume";

export interface DocumentRow {
  id: string;
  kind: DocKind;
  file_name: string;
  sha256: string;
  storage_path: string;
  mime: string;
  size_bytes: number;
  text: string;
  sections: unknown[];
  pages: unknown[];
  page_count: number;
  parser_version: string | null;
  warnings: string[];
  created_at: string;
}

export interface ExtractionRow {
  id: string;
  document_id: string;
  source_type: DocKind;
  prompt_version: string;
  model: string;
  result: Record<string, unknown>;
  latency_ms: number | null;
  created_at: string;
}

export interface JobPostingRow {
  id: string;
  extraction_id: string;
  document_id: string;
  company_id: number | null;
  company_name: string | null;
  role: string | null;
  location: string | null;
  skill_count: number;
  must_count: number;
  top_categories: string[];
  prompt_version: string | null;
  is_sample: boolean;
  created_at: string;
  updated_at: string;
}

export type NewDocument = Omit<DocumentRow, "id" | "created_at">;
export type NewExtraction = Omit<ExtractionRow, "id" | "created_at">;
export type NewJobPosting = Omit<JobPostingRow, "id" | "created_at" | "updated_at">;

export interface JdStore {
  readonly name: "supabase" | "file";
  findDocumentBySha(sha256: string): Promise<DocumentRow | null>;
  getDocument(id: string): Promise<DocumentRow | null>;
  insertDocument(doc: NewDocument, bytes: Buffer): Promise<DocumentRow>;
  findExtraction(documentId: string, promptVersion: string): Promise<ExtractionRow | null>;
  getExtraction(id: string): Promise<ExtractionRow | null>;
  upsertExtraction(row: NewExtraction): Promise<ExtractionRow>;
  upsertJobPosting(row: NewJobPosting): Promise<JobPostingRow>;
  getJobPosting(id: string): Promise<JobPostingRow | null>;
  getJobPostingByDocument(documentId: string): Promise<JobPostingRow | null>;
  listJobPostings(): Promise<JobPostingRow[]>;
}

const now = () => new Date().toISOString();

// --- file store -----------------------------------------------------------------

interface FileData {
  documents: DocumentRow[];
  extractions: ExtractionRow[];
  job_postings: JobPostingRow[];
}

export class FileJdStore implements JdStore {
  readonly name = "file" as const;
  private data: FileData | null = null;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly dir: string) {}

  private get file() {
    return path.join(this.dir, "store.json");
  }

  private async load(): Promise<FileData> {
    if (this.data) return this.data;
    try {
      this.data = JSON.parse(await readFile(this.file, "utf8")) as FileData;
    } catch {
      this.data = { documents: [], extractions: [], job_postings: [] };
    }
    return this.data;
  }

  /** Serialises writes; the file is replaced atomically (tmp + rename). */
  private write<T>(fn: (d: FileData) => T): Promise<T> {
    const run = this.queue.then(async () => {
      const d = await this.load();
      const out = fn(d);
      await mkdir(this.dir, { recursive: true });
      const tmp = `${this.file}.${process.pid}.tmp`;
      await writeFile(tmp, JSON.stringify(d));
      await rename(tmp, this.file);
      return out;
    });
    this.queue = run.catch(() => undefined);
    return run;
  }

  async findDocumentBySha(sha256: string) {
    return (await this.load()).documents.find((d) => d.sha256 === sha256) ?? null;
  }

  async getDocument(id: string) {
    return (await this.load()).documents.find((d) => d.id === id) ?? null;
  }

  async insertDocument(doc: NewDocument, bytes: Buffer) {
    const target = path.join(this.dir, "files", doc.storage_path);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes);
    return this.write((d) => {
      const existing = d.documents.find((x) => x.sha256 === doc.sha256);
      if (existing) return existing;
      const row: DocumentRow = { ...doc, id: randomUUID(), created_at: now() };
      d.documents.push(row);
      return row;
    });
  }

  async findExtraction(documentId: string, promptVersion: string) {
    return (
      (await this.load()).extractions.find((e) => e.document_id === documentId && e.prompt_version === promptVersion) ??
      null
    );
  }

  async getExtraction(id: string) {
    return (await this.load()).extractions.find((e) => e.id === id) ?? null;
  }

  upsertExtraction(row: NewExtraction) {
    return this.write((d) => {
      const i = d.extractions.findIndex(
        (e) => e.document_id === row.document_id && e.prompt_version === row.prompt_version,
      );
      const prev = d.extractions[i];
      const out: ExtractionRow = prev ? { ...prev, ...row, created_at: now() } : { ...row, id: randomUUID(), created_at: now() };
      if (prev) d.extractions[i] = out;
      else d.extractions.push(out);
      return out;
    });
  }

  upsertJobPosting(row: NewJobPosting) {
    return this.write((d) => {
      const i = d.job_postings.findIndex((j) => j.document_id === row.document_id);
      const prev = d.job_postings[i];
      const out: JobPostingRow = prev
        ? { ...prev, ...row, updated_at: now() }
        : { ...row, id: randomUUID(), created_at: now(), updated_at: now() };
      if (prev) d.job_postings[i] = out;
      else d.job_postings.push(out);
      return out;
    });
  }

  async getJobPosting(id: string) {
    return (await this.load()).job_postings.find((j) => j.id === id) ?? null;
  }

  async getJobPostingByDocument(documentId: string) {
    return (await this.load()).job_postings.find((j) => j.document_id === documentId) ?? null;
  }

  async listJobPostings() {
    return [...(await this.load()).job_postings].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }
}

// --- Supabase store ---------------------------------------------------------------

const BUCKET = "talent-docs";

export class SupabaseJdStore implements JdStore {
  readonly name = "supabase" as const;

  constructor(private readonly db: SupabaseClient) {}

  private async one<T>(query: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T | null> {
    const { data, error } = await query;
    if (error) throw new Error(`Supabase: ${error.message}`);
    return (data as T | null) ?? null;
  }

  findDocumentBySha(sha256: string) {
    return this.one<DocumentRow>(this.db.from("documents").select("*").eq("sha256", sha256).maybeSingle());
  }

  getDocument(id: string) {
    return this.one<DocumentRow>(this.db.from("documents").select("*").eq("id", id).maybeSingle());
  }

  async insertDocument(doc: NewDocument, bytes: Buffer) {
    const up = await this.db.storage.from(BUCKET).upload(doc.storage_path, bytes, { contentType: doc.mime, upsert: true });
    // The text is what every later step needs; a missing bucket must not block the upload.
    if (up.error) console.warn(`[jd] storage upload failed (${doc.storage_path}): ${up.error.message}`);
    const row = await this.one<DocumentRow>(
      this.db.from("documents").upsert(doc, { onConflict: "sha256" }).select("*").single(),
    );
    return row!;
  }

  findExtraction(documentId: string, promptVersion: string) {
    return this.one<ExtractionRow>(
      this.db
        .from("extractions")
        .select("*")
        .eq("document_id", documentId)
        .eq("prompt_version", promptVersion)
        .maybeSingle(),
    );
  }

  getExtraction(id: string) {
    return this.one<ExtractionRow>(this.db.from("extractions").select("*").eq("id", id).maybeSingle());
  }

  async upsertExtraction(row: NewExtraction) {
    const out = await this.one<ExtractionRow>(
      this.db.from("extractions").upsert(row, { onConflict: "document_id,prompt_version" }).select("*").single(),
    );
    return out!;
  }

  async upsertJobPosting(row: NewJobPosting) {
    const out = await this.one<JobPostingRow>(
      this.db
        .from("job_postings")
        .upsert({ ...row, updated_at: now() }, { onConflict: "document_id" })
        .select("*")
        .single(),
    );
    return out!;
  }

  getJobPosting(id: string) {
    return this.one<JobPostingRow>(this.db.from("job_postings").select("*").eq("id", id).maybeSingle());
  }

  getJobPostingByDocument(documentId: string) {
    return this.one<JobPostingRow>(this.db.from("job_postings").select("*").eq("document_id", documentId).maybeSingle());
  }

  async listJobPostings() {
    return (
      (await this.one<JobPostingRow[]>(
        this.db.from("job_postings").select("*").order("updated_at", { ascending: false }).limit(200),
      )) ?? []
    );
  }
}

let store: JdStore | null = null;

export function getJdStore(): JdStore {
  if (store) return store;
  if (env.jdStore === "supabase" && env.supabaseUrl && env.supabaseKey) {
    store = new SupabaseJdStore(createClient(env.supabaseUrl, env.supabaseKey, { auth: { persistSession: false } }));
  } else {
    store = new FileJdStore(path.resolve(env.jdStoreDir));
  }
  console.log(`[jd] store: ${store.name}`);
  return store;
}

/** Tests swap in a fresh store. */
export function setJdStore(s: JdStore | null) {
  store = s;
}
