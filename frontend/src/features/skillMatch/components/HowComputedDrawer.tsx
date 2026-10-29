import React from "react";
import type { SkillMatchMeta } from "../service/skillMatch.api";

interface Props {
  meta: SkillMatchMeta;
  isOpen: boolean;
  onClose: () => void;
}

export const HowComputedDrawer: React.FC<Props> = ({ meta, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="font-heading text-lg font-bold text-foreground">How This Was Computed</h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 text-xs text-foreground">
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-card-sub p-3 border border-border">
            <div>
              <span className="text-muted-foreground block">Taxonomy Version</span>
              <span className="font-mono text-foreground">{meta.taxonomy_version}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Prompt Version</span>
              <span className="font-mono text-foreground">{meta.prompt_version}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">LLM Calls</span>
              <span className="font-mono text-foreground">
                {meta.llm_calls} (evaluating {meta.llm_pairs} pairs)
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Compute Latency</span>
              <span className="font-mono text-foreground">{meta.latency_ms} ms</span>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-2">Cascade Resolution Breakdown:</h4>
            <div className="space-y-1.5 font-mono">
              {Object.entries(meta.stage_counts || {}).map(([stage, count]) => (
                <div key={stage} className="flex justify-between border-b border-border py-1">
                  <span className="capitalize text-muted-foreground">{stage} stage</span>
                  <span className="text-emerald-700 dark:text-emerald-300 font-bold">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {meta.warnings && meta.warnings.length > 0 && (
            <div className="rounded border border-amber-500/30 bg-amber-500/10 p-2.5 text-amber-800 dark:text-amber-300">
              <span className="font-semibold block mb-1">Warnings:</span>
              <ul className="list-disc pl-4 space-y-0.5">
                {meta.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="pt-2 text-right">
          <button
            onClick={onClose}
            className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
