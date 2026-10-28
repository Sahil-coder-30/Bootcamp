// Read-only access to Role 1/2 tables (`extractions`, `documents`). Role 3 never writes here.
// Falls back to bundled sample extractions when Supabase is unset or EXTRACTIONS_SOURCE=fixtures.
import { env } from "../config/env.js";
import type { ResumeExtraction } from "../contract/profile.schema.js";
import { EXTRACTION_FIXTURES } from "../data/extractionFixtures/index.js";
import { supabase } from "./supabase.service.js";

export interface StoredExtraction {
  id: string;
  result: ResumeExtraction;
  document_id: string | null;
}

const useFixtures = () => !supabase || env.extractionsSource === "fixtures";

export async function getResumeExtraction(id: string): Promise<StoredExtraction | null> {
  if (useFixtures()) {
    const f = EXTRACTION_FIXTURES.find((x) => x.id === id);
    return f ? { id: f.id, result: f.result, document_id: f.document_id } : null;
  }
  const { data, error } = await supabase!
    .from("extractions")
    .select("id, document_id, result")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: String(data.id),
    result: data.result as ResumeExtraction,
    document_id: (data.document_id as string | null) ?? null,
  };
}

/** `documents.storage_path`, or `resume/<sha256>.<ext>` when the column is empty (plan: proposed change 5). */
export async function getDocumentStoragePath(documentId: string | null): Promise<string | null> {
  if (!documentId || useFixtures()) return null;
  const { data, error } = await supabase!
    .from("documents")
    .select("storage_path, sha256, file_name")
    .eq("id", documentId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  if (data.storage_path) return String(data.storage_path);
  if (!data.sha256) return null;
  const ext = /\.([a-z0-9]+)$/i.exec(String(data.file_name ?? ""))?.[1]?.toLowerCase() ?? "pdf";
  return `resume/${String(data.sha256)}.${ext}`;
}
