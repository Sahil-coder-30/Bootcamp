import { useMemo, useState } from "react";
import { useWatch, type Control } from "react-hook-form";
import { ChevronDown, ChevronRight } from "lucide-react";
import { fromFormValues } from "../lib/formMapping";
import type { ProfileValues } from "../lib/types";

/** The fields the hackathon brief asks for; everything else in the JSON is our addition. */
export const BRIEF_FIELDS = new Set([
  "name",
  "email",
  "education",
  "skills",
  "hackathons",
  "internships",
  "certifications",
  "preferred_roles",
  "cv_file",
]);

interface Block {
  key: string | null;
  lines: string[];
}

/** Splits pretty-printed JSON into one block per top-level key so each can be styled. */
export function toBlocks(json: string): Block[] {
  const blocks: Block[] = [];
  for (const line of json.split("\n")) {
    const m = /^ {2}"([^"]+)":/.exec(line);
    if (m) blocks.push({ key: m[1] as string, lines: [line] });
    else if (blocks.length === 0) blocks.push({ key: null, lines: [line] });
    else if (line === "}") blocks.push({ key: null, lines: [line] });
    else blocks[blocks.length - 1]?.lines.push(line);
  }
  return blocks;
}

/** The exact payload Save will send. Brief fields are bold, our additions dimmed. */
export function JsonPanel({ control }: { control: Control<ProfileValues> }) {
  const [open, setOpen] = useState(false);
  const values = useWatch({ control }) as ProfileValues;
  const json = useMemo(
    () => (open ? JSON.stringify(fromFormValues(values), null, 2) : ""),
    [open, values],
  );
  const blocks = useMemo(() => toBlocks(json), [json]);

  return (
    <div className="rounded-xl border border-border bg-card/50">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-2 px-4 py-3 text-left text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {open ? (
          <ChevronDown className="h-4 w-4" aria-hidden />
        ) : (
          <ChevronRight className="h-4 w-4" aria-hidden />
        )}
        What Talent Check will receive
      </button>
      {open && (
        <div className="border-t border-border p-3">
          <p className="mb-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Bold</span> = the hackathon brief's
            fields, dimmed = our additions.
          </p>
          <pre
            className="max-h-96 overflow-auto rounded-md bg-background p-3 text-xs leading-relaxed"
            data-testid="json-panel"
          >
            {blocks.map((b, i) => (
              <span
                key={i}
                className={
                  b.key === null
                    ? ""
                    : BRIEF_FIELDS.has(b.key)
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground"
                }
              >
                {b.lines.join("\n")}
                {"\n"}
              </span>
            ))}
          </pre>
        </div>
      )}
    </div>
  );
}
