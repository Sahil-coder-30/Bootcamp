import { useCallback } from "react";
import { fromFormValues, toFormValues } from "../lib/formMapping";
import { profileImportSchema, toIssues, type Issue, type ProfileValues } from "../lib/schema";

export const MAX_JSON_BYTES = 1024 * 1024;

export type ImportResult = { ok: true; values: ProfileValues } | { ok: false; errors: Issue[] };

/** `File.text()` is missing in older browsers and in jsdom. */
const readText = (file: File): Promise<string> =>
  typeof file.text === "function"
    ? file.text()
    : new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
      });

const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "candidate";

/** The brief's JSON save/load: export the exact contract object, import it back through the same schema. */
export function useProfileJson() {
  const exportJson = useCallback((values: ProfileValues): string => {
    const payload = fromFormValues(values);
    const filename = `profile.${slug(payload.name)}.json`;
    const blob = new Blob([JSON.stringify(payload, null, 2) + "\n"], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return filename;
  }, []);

  const importJson = useCallback(async (file: File): Promise<ImportResult> => {
    if (file.size > MAX_JSON_BYTES) {
      return { ok: false, errors: [{ path: "", message: "File is larger than 1 MB" }] };
    }
    let raw: unknown;
    try {
      raw = JSON.parse(await readText(file));
    } catch {
      return { ok: false, errors: [{ path: "", message: "That file is not valid JSON" }] };
    }
    const version = (raw as { schema_version?: unknown } | null)?.schema_version;
    if (typeof version === "string" && version.split(".")[0] !== "1") {
      return {
        ok: false,
        errors: [
          {
            path: "schema_version",
            message: `Unsupported schema version ${version} (this app reads 1.x)`,
          },
        ],
      };
    }
    const parsed = profileImportSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, errors: toIssues(parsed.error) };
    return { ok: true, values: toFormValues(parsed.data) };
  }, []);

  return { exportJson, importJson };
}
