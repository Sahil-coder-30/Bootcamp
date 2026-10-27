import type { Request, Response } from "express";
import { isSupabaseConfigured } from "../services/supabase.service.js";

export function health(_req: Request, res: Response) {
  res.json({ status: "ok", supabase: isSupabaseConfigured });
}
