// Sample Role-2 outputs, used while the `extractions` table is empty or Supabase is unset
// (EXTRACTIONS_SOURCE=fixtures). Ids are fixed so the demo and tests can refer to them.
import type { ResumeExtraction } from "../../contract/profile.schema.js";
import ananya from "./ananya-rao.json" with { type: "json" };
import ananyaUpdated from "./ananya-rao-updated.json" with { type: "json" };
import karthik from "./karthik-subramaniam.json" with { type: "json" };

export interface FixtureExtraction {
  id: string;
  document_id: string;
  result: ResumeExtraction;
}

const wrap = (json: { id: string; document_id: string }): FixtureExtraction => ({
  id: json.id,
  document_id: json.document_id,
  result: json as unknown as ResumeExtraction,
});

export const EXTRACTION_FIXTURES: FixtureExtraction[] = [ananya, karthik, ananyaUpdated].map(wrap);
