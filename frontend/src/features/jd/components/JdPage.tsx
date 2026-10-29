/**
 * JdPage.tsx
 * Role 1: JD Analytics. Upload a JD (or pick one from the library), see its skills
 * grouped by the 12 RADIX categories, and click a skill to highlight its evidence.
 */

import React, { useEffect, useState } from "react";
import { FileSearch, Loader2 } from "lucide-react";
import { useGroupedSkills, useJdDetail, useJdLibrary, useJdUpload } from "../Hooks/jd.hooks";
import type { JdSkill } from "../service/jd.api";
import { JdDropzone } from "./JdDropzone";
import { JdEvidenceText } from "./JdEvidenceText";
import { JdLibrary } from "./JdLibrary";
import { JdResult } from "./JdResult";

export const JdPage: React.FC = () => {
  const library = useJdLibrary();
  const upload = useJdUpload();
  const { detail, isLoading, error } = useJdDetail(library.selectedId);
  const result = detail?.extraction;
  const groups = useGroupedSkills(result?.skills, result?.category_levels);
  const [selected, setSelected] = useState<JdSkill | null>(null);

  // Open the newest JD when nothing is selected yet.
  const first = library.items[0]?.jd_id;
  const { selectedId, select } = library;
  useEffect(() => {
    if (!selectedId && first) select(first);
  }, [selectedId, first, select]);

  useEffect(() => setSelected(null), [detail]);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <div className="flex items-center gap-2">
          <FileSearch className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-black tracking-tight text-foreground">JD Analytics</h1>
        </div>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Upload a job description. Every skill is mapped to the 12 RADIX categories with a
          must/nice tag, an implied level and a quote from the JD that we verified exists.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <JdDropzone
            onFile={(f) => void upload.run(f)}
            stage={upload.stage}
            error={upload.error}
          />
          <JdLibrary
            items={library.items}
            selectedId={library.selectedId}
            onSelect={library.select}
            isLoading={library.isLoading}
            error={library.error}
            onRefresh={() => void library.refetch()}
          />
        </div>

        <div className="min-w-0 space-y-4">
          {isLoading && !detail && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading JD...
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {!detail && !isLoading && !error && (
            <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Upload a JD or pick one from the library to see its skills.
            </p>
          )}
          {detail && result && (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <JdResult
                result={result}
                groups={groups}
                selected={selected}
                onSelect={setSelected}
                isBusy={upload.isBusy}
                onReextract={() => void upload.reextract(detail.document.document_id, detail.jd_id)}
              />
              <div className="xl:sticky xl:top-20 xl:self-start">
                <JdEvidenceText text={detail.document.text} skill={selected} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
