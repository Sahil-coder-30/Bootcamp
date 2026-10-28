// Role 1 JD Analytics: /api/documents and /api/jds against a fake agent, with the file store.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

interface Seen {
  method: string;
  url: string;
  body: Record<string, unknown> | null;
}

let fake: Server;
let app: Server;
let base: string;
let dir: string;
let seen: Seen[] = [];
let degraded = false;

const PARSED = {
  text: "Google LLC\nMinimum Qualifications:\n- Strong knowledge of data structures and algorithms.",
  page_count: 1,
  pages: [[0, 84]],
  sections: [
    { kind: "other", label: "Introduction", requirement_hint: null, start: 0, end: 10, signal: false, drop: false },
    { kind: "requirements", label: "Minimum Qualifications", requirement_hint: "must", start: 11, end: 84, signal: true, drop: false },
  ],
  layout: "text",
  parser_version: "doc-1.0",
  warnings: [],
  sha256: "x",
  file_name: "g.txt",
  size_bytes: 10,
};

const extraction = (body: Record<string, unknown>) => ({
  source_type: "jd",
  source_file: body["source_file"],
  company: "Google LLC",
  role: (body["role"] as string | null) ?? "Software Engineer",
  skills: [
    {
      skill_name: "Data structures and algorithms",
      category_code: "DSA",
      evidence: "Strong knowledge of data structures and algorithms",
      confidence: "high",
      canonical_id: "dsa",
      level_hint: 5,
      requirement: "must",
      section: "requirements",
      evidence_span: { start: 37, end: 87, page: 1 },
    },
    {
      skill_name: "Kubernetes",
      category_code: "CLOUD",
      evidence: "Familiarity with Kubernetes",
      confidence: "high",
      canonical_id: "kubernetes",
      level_hint: 2,
      requirement: "nice",
      section: "requirements",
    },
  ],
  document_id: body["document_id"],
  company_id: (body["company_id"] as number | null) ?? 4,
  category_levels: { DSA: 5, CLOUD: 2 },
  meta: { prompt_version: "jd-v1", model: degraded ? "keyword-baseline" : "gemini:flash", latency_ms: 7, degraded, location: "Bengaluru" },
});

const readBody = (req: IncomingMessage) =>
  new Promise<string>((resolve) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });

const listen = (server: Server) =>
  new Promise<number>((resolve) => server.listen(0, "127.0.0.1", () => resolve((server.address() as AddressInfo).port)));

const form = (bytes: Buffer | string, name: string, kind?: string) => {
  const f = new FormData();
  const data = typeof bytes === "string" ? bytes : Uint8Array.from(bytes);
  f.append("file", new Blob([data]), name);
  if (kind) f.append("kind", kind);
  return f;
};

const upload = (bytes: Buffer | string, name = "google_swe.txt", kind?: string) =>
  fetch(`${base}/documents`, { method: "POST", body: form(bytes, name, kind) });

const post = (url: string, body: unknown) =>
  fetch(`${base}${url}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "jd-store-"));
  fake = createServer(async (req, res) => {
    const raw = await readBody(req);
    const body = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
    seen.push({ method: req.method ?? "", url: req.url ?? "", body });
    res.setHeader("Content-Type", "application/json");
    if (req.url === "/extract/jd/version") return res.end(JSON.stringify({ prompt_version: "jd-v1" }));
    if (req.url === "/documents/parse") return res.end(JSON.stringify(PARSED));
    if (req.url === "/extract/jd") return res.end(JSON.stringify(extraction(body!)));
    res.statusCode = 404;
    res.end(JSON.stringify({ detail: "nope" }));
    return;
  });
  const port = await listen(fake);
  process.env["AGENT_URL"] = `http://127.0.0.1:${port}`;
  process.env["JD_STORE"] = "file";
  process.env["JD_STORE_DIR"] = dir;
  process.env["SUPABASE_URL"] = "";
  vi.resetModules();
  const { createApp } = await import("../src/app.js");
  const { resetJdMemo } = await import("../src/services/jd.service.js");
  resetJdMemo();
  app = createApp().listen(0);
  await new Promise<void>((resolve) => app.once("listening", () => resolve()));
  base = `http://127.0.0.1:${(app.address() as AddressInfo).port}/api`;
});

afterAll(async () => {
  app.close();
  fake.close();
  for (const k of ["AGENT_URL", "JD_STORE", "JD_STORE_DIR", "SUPABASE_URL"]) delete process.env[k];
  await rm(dir, { recursive: true, force: true });
});

beforeEach(() => {
  seen = [];
  degraded = false;
});

describe("POST /api/documents", () => {
  it("parses once, then dedupes by sha256", async () => {
    const text = "Google LLC\nMinimum Qualifications:\n- Strong knowledge of data structures and algorithms.";
    const first = await upload(text);
    expect(first.status).toBe(201);
    const a = (await first.json()) as Record<string, unknown>;
    expect(a).toMatchObject({ cached: false, kind: "jd", file_name: "google_swe.txt", page_count: 1 });
    expect(a["storage_path"]).toMatch(/^jd\/[0-9a-f]{64}\.txt$/);
    expect(a["sections"]).toEqual([
      { kind: "other", label: "Introduction", requirement_hint: null },
      { kind: "requirements", label: "Minimum Qualifications", requirement_hint: "must" },
    ]);
    const call = seen.find((s) => s.url === "/documents/parse")!;
    expect(Buffer.from(call.body!["content_b64"] as string, "base64").toString()).toBe(text);

    seen = [];
    const again = await upload(text, "copy.txt");
    expect(again.status).toBe(200);
    expect(await again.json()).toMatchObject({ cached: true, document_id: a["document_id"] });
    expect(seen).toHaveLength(0);

    const doc = await fetch(`${base}/documents/${a["document_id"] as string}`);
    expect(await doc.json()).toMatchObject({ text: PARSED.text, document_id: a["document_id"] });
  });

  it("rejects bad uploads", async () => {
    expect((await fetch(`${base}/documents`, { method: "POST", body: new FormData() })).status).toBe(400);
    expect((await upload(Buffer.from([0x50, 0x4b, 3, 4, 1, 2]), "x.docx")).status).toBe(415);
    expect((await upload("plain", "x.exe")).status).toBe(415);
    expect((await upload("%PDF-1.4", "a.pdf", "cv")).status).toBe(400);
    expect((await upload(Buffer.alloc(10 * 1024 * 1024 + 10, 0x41), "big.txt")).status).toBe(413);
    expect((await fetch(`${base}/documents/not-a-uuid`)).status).toBe(400);
    expect((await fetch(`${base}/documents/3f2b8c1e-9a4d-4c7e-8f10-2b6a5d9e7c01`)).status).toBe(404);
  });
});

describe("POST /api/jds/extract", () => {
  it("extracts, caches by (document_id, prompt_version) and lists the JD", async () => {
    const up = (await (await upload("%PDF-1.4 a google jd", "google.pdf")).json()) as { document_id: string };
    const r1 = await post("/jds/extract", { document_id: up.document_id });
    expect(r1.status).toBe(200);
    const a = (await r1.json()) as Record<string, any>;
    expect(a).toMatchObject({ source_type: "jd", company_id: 4, document_id: up.document_id });
    expect(a["jd_id"]).toMatch(/^[0-9a-f-]{36}$/);
    expect(a["meta"].cached).toBe(false);
    const call = seen.find((s) => s.url === "/extract/jd")!;
    expect(call.body!["document"]).toMatchObject({ text: PARSED.text, parser_version: "doc-1.0" });
    expect(call.body!["source_file"]).toBe("google.pdf");

    seen = [];
    const b = (await (await post("/jds/extract", { document_id: up.document_id })).json()) as Record<string, any>;
    expect(b["meta"].cached).toBe(true);
    expect(b["jd_id"]).toBe(a["jd_id"]);
    expect(seen.some((s) => s.url === "/extract/jd")).toBe(false);

    const forced = (await (await post("/jds/extract", { document_id: up.document_id, force: true })).json()) as Record<string, any>;
    expect(forced["meta"].cached).toBe(false);
    expect(forced["jd_id"]).toBe(a["jd_id"]);

    // a different company override is a cache miss
    const other = (await (await post("/jds/extract", { document_id: up.document_id, company_id: 78 })).json()) as Record<string, any>;
    expect(other["company_id"]).toBe(78);

    const list = (await (await fetch(`${base}/jds`)).json()) as Record<string, any>[];
    const row = list.find((j) => j["jd_id"] === a["jd_id"])!;
    expect(row).toMatchObject({ file_name: "google.pdf", skill_count: 2, must_count: 1, location: "Bengaluru" });
    expect(row["top_categories"][0]).toBe("DSA");

    const detail = (await (await fetch(`${base}/jds/${a["jd_id"] as string}`)).json()) as Record<string, any>;
    expect(detail["extraction"]["jd_id"]).toBe(a["jd_id"]);
    expect(detail["document"]["text"]).toBe(PARSED.text);
  });

  it("never serves a degraded answer from cache", async () => {
    const up = (await (await upload("%PDF-1.4 degraded jd", "d.pdf")).json()) as { document_id: string };
    degraded = true;
    await post("/jds/extract", { document_id: up.document_id });
    degraded = false;
    seen = [];
    const r = (await (await post("/jds/extract", { document_id: up.document_id })).json()) as Record<string, any>;
    expect(r["meta"].cached).toBe(false);
    expect(seen.some((s) => s.url === "/extract/jd")).toBe(true);
  });

  it("validates input and document kind", async () => {
    expect((await post("/jds/extract", {})).status).toBe(400);
    expect((await post("/jds/extract", { document_id: "3f2b8c1e-9a4d-4c7e-8f10-2b6a5d9e7c01" })).status).toBe(404);
    const cv = (await (await upload("%PDF-1.4 a resume", "cv.pdf", "resume")).json()) as { document_id: string };
    const r = await post("/jds/extract", { document_id: cv.document_id });
    expect(r.status).toBe(409);
    expect(await r.json()).toEqual({ error: "document kind is resume" });
    expect((await fetch(`${base}/jds/3f2b8c1e-9a4d-4c7e-8f10-2b6a5d9e7c01`)).status).toBe(404);
  });
});
