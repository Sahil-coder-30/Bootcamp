// The backend -> agent proxy, tested against a fake agent service on a random port.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";

interface Seen {
  method: string;
  url: string;
  body: unknown;
}

let agent: Server;
let app: Server;
let base: string;
let seen: Seen[] = [];
// Each test sets how the fake agent answers.
let reply: (req: Seen) => { status: number; body: unknown; raw?: string } = () => ({
  status: 200,
  body: {},
});

const readBody = (req: IncomingMessage) =>
  new Promise<unknown>((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data ? JSON.parse(data) : undefined));
  });

const listen = (server: Server) =>
  new Promise<number>((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve((server.address() as AddressInfo).port)),
  );

beforeAll(async () => {
  agent = createServer(async (req, res) => {
    const call = { method: req.method ?? "", url: req.url ?? "", body: await readBody(req) };
    seen.push(call);
    const { status, body, raw } = reply(call);
    res.writeHead(status, { "Content-Type": raw ? "text/plain" : "application/json" });
    res.end(raw ?? JSON.stringify(body));
  });
  const agentPort = await listen(agent);

  // env.ts reads AGENT_URL at import time, so set it before loading the app.
  process.env["AGENT_URL"] = `http://127.0.0.1:${agentPort}/`;
  vi.resetModules();
  const { createApp } = await import("../src/app.js");
  app = createApp().listen(0);
  await new Promise<void>((resolve) => app.once("listening", () => resolve()));
  base = `http://127.0.0.1:${(app.address() as AddressInfo).port}/api/agent`;
});

afterAll(() => {
  app.close();
  agent.close();
});

beforeEach(() => {
  seen = [];
});

const post = (path: string, body: unknown) =>
  fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("agent proxy", () => {
  it("forwards GET /health and strips the trailing slash from AGENT_URL", async () => {
    reply = () => ({ status: 200, body: { status: "ok" } });
    const res = await fetch(`${base}/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
    expect(seen).toEqual([{ method: "GET", url: "/health", body: undefined }]);
  });

  it("forwards POST /run with the JSON body", async () => {
    reply = () => ({ status: 202, body: { id: "job1", status: "queued" } });
    const res = await post("/run", { company: "Blinkit", steps: ["test"] });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "job1", status: "queued" });
    expect(seen[0]).toEqual({ method: "POST", url: "/run", body: { company: "Blinkit", steps: ["test"] } });
  });

  it("sends an empty object when the client sends no body", async () => {
    reply = () => ({ status: 200, body: { ok: true } });
    await fetch(`${base}/doctor`, { method: "POST" });
    expect(seen[0]?.body).toEqual({});
  });

  it("polls a job with GET and encodes the id", async () => {
    reply = () => ({ status: 200, body: { id: "a b", status: "running" } });
    const res = await fetch(`${base}/jobs/a%20b`);
    expect(res.status).toBe(200);
    expect(seen[0]).toMatchObject({ method: "GET", url: "/jobs/a%20b" });
  });

  it("reads a saved artifact for a company", async () => {
    reply = () => ({ status: 200, body: { name: "Blinkit" } });
    const res = await fetch(`${base}/companies/Blinkit/golden-record`);
    expect(await res.json()).toEqual({ name: "Blinkit" });
    expect(seen[0]).toMatchObject({ method: "GET", url: "/companies/Blinkit/golden-record" });
  });

  it("passes the agent's status and string detail through", async () => {
    reply = () => ({ status: 409, body: { detail: "a job for 'Blinkit' is already running" } });
    const res = await post("/run", { company: "Blinkit" });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "a job for 'Blinkit' is already running" });
  });

  it("turns a FastAPI 422 detail list into a readable error", async () => {
    reply = () => ({ status: 422, body: { detail: [{ loc: ["body", "company"], msg: "Field required" }] } });
    const res = await post("/run", {});
    expect(res.status).toBe(422);
    expect((await res.json()).error).toContain("Field required");
  });

  it("falls back to a generic message when the agent sends no JSON", async () => {
    reply = () => ({ status: 500, body: null, raw: "Internal Server Error" });
    const res = await fetch(`${base}/health`);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Agent error 500" });
  });
});

describe("agent proxy when the agent is down", () => {
  it("returns 502 with the agent URL in the message", async () => {
    await new Promise<void>((resolve) => agent.close(() => resolve()));
    const res = await fetch(`${base}/health`);
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/Agent service unreachable/);
  });
});
