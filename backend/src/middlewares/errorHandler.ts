import type { ErrorRequestHandler, RequestHandler } from "express";

/** Throw from controllers/services to send a specific status code. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const notFound: RequestHandler = (req, res) => {
  res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` });
};

// Express 5 forwards rejected promises from async handlers here automatically.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const status = err instanceof HttpError ? err.status : 500;
  if (status >= 500) console.error(err);
  const message = err instanceof Error ? err.message : String((err as { message?: unknown })?.message ?? err);
  res.status(status).json({ error: message || "Internal server error" });
};
