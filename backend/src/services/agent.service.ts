// Client for the FastAPI agent service (../agent). The backend is the only caller;
// the frontend reaches agent features through /api/agent/*.
import { env } from "../config/env.js";
import { HttpError } from "../middlewares/errorHandler.js";

export async function callAgent<T = unknown>(path: string, body?: unknown): Promise<T> {
  const url = `${env.agentUrl}/${path.replace(/^\//, "")}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: body === undefined ? "GET" : "POST",
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      // LLM calls are slow; give the agent up to 5 minutes.
      signal: AbortSignal.timeout(300_000),
    });
  } catch (err) {
    throw new HttpError(502, `Agent service unreachable at ${env.agentUrl}: ${(err as Error).message}`);
  }

  const data = (await res.json().catch(() => null)) as T | null;
  if (!res.ok) {
    const detail = (data as { detail?: unknown } | null)?.detail;
    // FastAPI sends a string for HTTPException and a list of issues for 422 validation errors.
    const message =
      typeof detail === "string" ? detail : detail ? JSON.stringify(detail) : `Agent error ${res.status}`;
    throw new HttpError(res.status, message);
  }
  return data as T;
}
