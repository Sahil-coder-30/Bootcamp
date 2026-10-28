// The backend -> resume service proxy, tested against a fake resume service on a random port.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { SignJWT } from "jose";

const SECRET = "test-secret-test-secret-test-secret-123";
const ID = "3f2b8c1e-9a4d-4c7e-8f10-2b6a5d9e7c01";

interface Seen {
  method: string;
  url: string;
  headers: IncomingMessage["headers"];
  body: string;
}

let fake: Server;
let app: Server;
let base: string;
let seen: Seen[] = [];
let reply: (req: Seen) => { status: number; body?: unknown; headers?: Record<string, string>; raw?: Buffer } = () => ({
  status: 200,
  body: { ok: true },
});

const readBody = (req: IncomingMessage) =>
  new Promise<string>((resolve) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("latin1")));
  });

const listen = (server: Server) =>
  new Promise<number>((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve((server.address() as AddressInfo).port)),
  );

const token = (role = "student") =>
  new SignJWT({ email: "a@b.c", role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("user-1")
    .setIssuer("placeintel-auth")
    .setAudience("placeintel")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(new TextEncoder().encode(SECRET));

const pdfForm = () => {
  const form = new FormData();
  form.append("file", new Blob([Buffer.from("%PDF-1.4 resume bytes")], { type: "application/pdf" }), "cv.pdf");
  return form;
};

beforeAll(async () => {
  fake = createServer(async (req, res) => {
    const call = { method: req.method ?? "", url: req.url ?? "", headers: req.headers, body: await readBody(req) };
    seen.push(call);
    const { status, body, headers, raw } = reply(call);
    res.writeHead(status, headers ?? { "Content-Type": "application/json" });
    res.end(raw ?? (body === undefined ? undefined : JSON.stringify(body)));
  });
  const port = await listen(fake);
  process.env["RESUME_URL"] = `http://127.0.0.1:${port}/`;
  process.env["RESUME_API_KEY"] = "internal-key";
  process.env["JWT_SECRET"] = SECRET;
  vi.resetModules();
  const { createApp } = await import("../src/app.js");
  app = createApp().listen(0);
  await new Promise<void>((resolve) => app.once("listening", () => resolve()));
  base = `http://127.0.0.1:${(app.address() as AddressInfo).port}/api/resumes`;
});

afterAll(() => {
  app.close();
  fake.close();
  delete process.env["RESUME_URL"];
  delete process.env["RESUME_API_KEY"];
});

beforeEach(() => {
  seen = [];
  reply = () => ({ status: 200, body: { ok: true } });
});

describe("upload", () => {
  it("streams the multipart body and forwards the signed-in user", async () => {
    reply = () => ({ status: 201, body: { resume_id: ID, cached: false } });
    const res = await fetch(`${base}?force=true`, {
      method: "POST",
      body: pdfForm(),
      headers: { Authorization: `Bearer ${await token()}` },
    });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ resume_id: ID, cached: false });
    const call = seen[0]!;
    expect(call.method).toBe("POST");
    expect(call.url).toBe("/resumes?force=true");
    expect(call.headers["content-type"]).toMatch(/^multipart\/form-data; boundary=/);
    expect(call.headers["x-user-id"]).toBe("user-1");
    expect(call.headers["x-resume-key"]).toBe("internal-key");
    expect(call.body).toContain("%PDF-1.4 resume bytes");
    expect(call.body).toContain('filename="cv.pdf"');
  });

  it("anonymous uploads send no user headers; cached parses keep status 200", async () => {
    reply = () => ({ status: 200, body: { resume_id: ID, cached: true } });
    const res = await fetch(base, { method: "POST", body: pdfForm() });
    expect(res.status).toBe(200);
    expect(seen[0]!.headers["x-user-id"]).toBeUndefined();
  });

  it("rejects non-multipart bodies and oversized uploads before calling the service", async () => {
    const json = await fetch(base, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    expect(json.status).toBe(415);
    const big = await fetch(base, {
      method: "POST",
      headers: { "Content-Type": "multipart/form-data; boundary=x", "Content-Length": String(7 * 1024 * 1024) },
      body: "x".repeat(10),
    }).catch(() => null);
    expect(big === null || big.status === 413).toBe(true);
    expect(seen).toHaveLength(0);
  });

  it("passes parse errors through with the service's message", async () => {
    reply = () => ({ status: 422, body: { detail: "Upload a PDF, DOCX or TXT resume.", code: "unsupported_format" } });
    const res = await fetch(`${base}/parse`, { method: "POST", body: pdfForm() });
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: "Upload a PDF, DOCX or TXT resume." });
    expect(seen[0]!.url).toBe("/parse");
  });
});

describe("json routes", () => {
  it("parse-text and levels forward the JSON body", async () => {
    await fetch(`${base}/parse-text`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Jane Doe" }),
    });
    await fetch(`${base}/levels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_file: "x" }),
    });
    expect(seen.map((s) => [s.method, s.url, JSON.parse(s.body)])).toEqual([
      ["POST", "/parse/text", { text: "Jane Doe" }],
      ["POST", "/levels/infer", { source_file: "x" }],
    ]);
  });

  it("get, profile-draft, reparse and health", async () => {
    await fetch(`${base}/${ID}`);
    await fetch(`${base}/${ID}/profile-draft`);
    await fetch(`${base}/${ID}/reparse`, { method: "POST" });
    await fetch(`${base}/health`);
    expect(seen.map((s) => `${s.method} ${s.url}`)).toEqual([
      `GET /resumes/${ID}`,
      `GET /resumes/${ID}/profile-draft`,
      `POST /resumes/${ID}/reparse`,
      "GET /health",
    ]);
  });

  it("rejects ids that are not UUIDs", async () => {
    const res = await fetch(`${base}/abc`);
    expect(res.status).toBe(400);
    expect(seen).toHaveLength(0);
  });

  it("maps 404 and unreachable errors", async () => {
    reply = () => ({ status: 404, body: { detail: "resume not found" } });
    expect((await fetch(`${base}/${ID}`)).status).toBe(404);
    reply = () => ({ status: 500, raw: Buffer.from("boom"), headers: { "Content-Type": "text/plain" } });
    const res = await fetch(`${base}/${ID}`);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Resume service error 500" });
  });
});

describe("signed-in routes", () => {
  it("list needs a user; students cannot filter by email", async () => {
    expect((await fetch(base)).status).toBe(401);
    reply = () => ({ status: 200, body: { items: [], total: 0 } });
    const res = await fetch(`${base}?limit=5&email=x@y.z`, { headers: { Authorization: `Bearer ${await token()}` } });
    expect(res.status).toBe(200);
    expect(seen[0]!.url).toBe("/resumes?limit=5");
    expect(seen[0]!.headers["x-user-id"]).toBe("user-1");
    await fetch(`${base}?email=x@y.z`, { headers: { Authorization: `Bearer ${await token("admin")}` } });
    expect(seen[1]!.url).toBe("/resumes?email=x%40y.z");
  });

  it("claim attaches the resume to the caller, delete returns 204", async () => {
    const auth = { Authorization: `Bearer ${await token()}` };
    expect((await fetch(`${base}/${ID}/claim`, { method: "PATCH" })).status).toBe(401);
    await fetch(`${base}/${ID}/claim`, { method: "PATCH", headers: auth });
    expect(seen[0]!.method).toBe("PATCH");
    expect(JSON.parse(seen[0]!.body)).toEqual({ user_id: "user-1" });

    reply = () => ({ status: 204 });
    const del = await fetch(`${base}/${ID}`, { method: "DELETE", headers: auth });
    expect(del.status).toBe(204);
    reply = () => ({ status: 404, body: { detail: "resume not found" } });
    expect((await fetch(`${base}/${ID}`, { method: "DELETE", headers: auth })).status).toBe(404);
  });
});

describe("download", () => {
  it("redirects to the presigned S3 URL", async () => {
    reply = () => ({ status: 307, headers: { Location: "https://bucket.s3.amazonaws.com/k?X-Amz-Signature=abc" } });
    const res = await fetch(`${base}/${ID}/file`, { redirect: "manual" });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("X-Amz-Signature");
    expect(seen[0]!.url).toBe(`/resumes/${ID}/file?redirect=true`);
  });

  it("streams local files with their headers", async () => {
    reply = () => ({
      status: 200,
      raw: Buffer.from("%PDF-bytes"),
      headers: { "Content-Type": "application/pdf", "Content-Disposition": 'inline; filename="cv.pdf"' },
    });
    const res = await fetch(`${base}/${ID}/file`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toBe('inline; filename="cv.pdf"');
    expect(Buffer.from(await res.arrayBuffer()).toString()).toBe("%PDF-bytes");
  });

  it("propagates a missing file", async () => {
    reply = () => ({ status: 404, body: { detail: "resume not found" } });
    expect((await fetch(`${base}/${ID}/file`)).status).toBe(404);
  });
});

describe("unreachable service", () => {
  it("answers 502", async () => {
    const saved = process.env["RESUME_URL"];
    process.env["RESUME_URL"] = "http://127.0.0.1:1";
    vi.resetModules();
    const { createApp } = await import("../src/app.js");
    const other = createApp().listen(0);
    await new Promise<void>((resolve) => other.once("listening", () => resolve()));
    const res = await fetch(`http://127.0.0.1:${(other.address() as AddressInfo).port}/api/resumes/health`);
    other.close();
    process.env["RESUME_URL"] = saved;
    expect(res.status).toBe(502);
  });
});
