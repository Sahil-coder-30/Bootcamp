// App-level behaviour that needs no database or agent: probes, CORS, error handling, env parsing.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createApp } from "../src/app.js";
import { errorHandler, HttpError, notFound } from "../src/middlewares/errorHandler.js";

let server: Server;
let origin: string;

beforeAll(async () => {
  server = createApp().listen(0);
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
});

describe("probes", () => {
  it("answers liveness and readiness", async () => {
    expect(await (await fetch(`${origin}/healthz`)).json()).toEqual({ status: "ok" });
    expect(await (await fetch(`${origin}/readyz`)).json()).toEqual({ status: "ready" });
  });
});

describe("company id validation", () => {
  it.each(["0", "-1", "1.5", "abc"])("rejects %s with 400", async (id) => {
    const res = await fetch(`${origin}/api/companies/${id}`);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/positive integer/);
  });

  it("validates the id on the skills route too", async () => {
    expect((await fetch(`${origin}/api/companies/0/skills`)).status).toBe(400);
  });
});

describe("CORS", () => {
  it("allows the configured dev origin", async () => {
    const res = await fetch(`${origin}/api/health`, { headers: { Origin: "http://localhost:5173" } });
    expect(res.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
  });
});

describe("error handler", () => {
  const appWith = (err: unknown) => {
    const app = express();
    app.get("/boom", () => {
      throw err;
    });
    app.use(notFound);
    app.use(errorHandler);
    return app.listen(0);
  };

  const hit = async (err: unknown, path = "/boom") => {
    const s = appWith(err);
    await new Promise<void>((resolve) => s.once("listening", () => resolve()));
    const res = await fetch(`http://127.0.0.1:${(s.address() as AddressInfo).port}${path}`);
    s.close();
    return { status: res.status, body: await res.json() };
  };

  it("uses the HttpError status", async () => {
    expect(await hit(new HttpError(418, "teapot"))).toEqual({ status: 418, body: { error: "teapot" } });
  });

  it("maps unknown errors to 500 and logs them", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await hit(new Error("db down"))).toEqual({ status: 500, body: { error: "db down" } });
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  it("handles thrown non-Error values", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await hit({ message: "plain object" })).body).toEqual({ error: "plain object" });
  });

  it("returns 404 JSON with method and path", async () => {
    expect(await hit(null, "/missing")).toEqual({ status: 404, body: { error: "Not found: GET /missing" } });
  });
});

describe("env", () => {
  it("parses CORS origins and trims the agent URL", async () => {
    vi.stubEnv("CORS_ORIGINS", "http://a.test, http://b.test");
    vi.stubEnv("AGENT_URL", "http://agent:8000/");
    vi.stubEnv("PORT", "5050");
    vi.resetModules();
    const { env } = await import("../src/config/env.js");
    expect(env.corsOrigins).toEqual(["http://a.test", "http://b.test"]);
    expect(env.agentUrl).toBe("http://agent:8000");
    expect(env.port).toBe(5050);
    vi.unstubAllEnvs();
  });
});
