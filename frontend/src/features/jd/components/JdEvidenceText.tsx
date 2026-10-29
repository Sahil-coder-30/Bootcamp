import React, { useEffect, useRef } from "react";
import type { JdSkill } from "../Hooks/jd.hooks";

interface JdEvidenceTextProps {
  text: string;
  skill: JdSkill | null;
}

/** The JD text with the selected skill's evidence span highlighted and scrolled into view. */
export const JdEvidenceText: React.FC<JdEvidenceTextProps> = ({ text, skill }) => {
  const mark = useRef<HTMLElement>(null);
  const span = skill?.evidence_span;
  const valid = span && span.start >= 0 && span.end > span.start && span.end <= text.length;

  useEffect(() => {
    mark.current?.scrollIntoView?.({ block: "center", behavior: "smooth" });
  }, [span?.start, span?.end]);

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-foreground">JD text</h3>
        <span className="text-[11px] text-muted-foreground truncate">
          {skill ? `Evidence for ${skill.skill_name}` : "Click a skill to see where it came from"}
        </span>
      </div>
      <pre
        className="max-h-[480px] overflow-auto whitespace-pre-wrap break-words font-sans text-xs leading-relaxed text-muted-foreground"
        data-testid="jd-text"
      >
        {valid ? (
          <>
            {text.slice(0, span.start)}
            <mark
              ref={mark}
              className="rounded bg-yellow-300/70 px-0.5 text-foreground dark:bg-yellow-500/40"
            >
              {text.slice(span.start, span.end)}
            </mark>
            {text.slice(span.end)}
          </>
        ) : (
          text
        )}
      </pre>
    </div>
  );
};
