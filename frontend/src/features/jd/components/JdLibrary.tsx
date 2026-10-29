import React from "react";
import { Briefcase, RefreshCw } from "lucide-react";
import { categoryColor } from "@/lib/categories";
import { cn } from "@/lib/utils";
import type { JdSummary } from "../service/jd.api";

interface JdLibraryProps {
  items: JdSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
}

/** Saved JD extractions; click one to open it. */
export const JdLibrary: React.FC<JdLibraryProps> = ({
  items,
  selectedId,
  onSelect,
  isLoading,
  error,
  onRefresh,
}) => (
  <div className="rounded-2xl border border-border bg-card p-4">
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-sm font-bold text-foreground">JD library</h2>
      <button
        type="button"
        onClick={onRefresh}
        className="rounded-md p-1 text-muted-foreground hover:text-foreground"
        aria-label="Refresh JD library"
      >
        <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
      </button>
    </div>
    {error && <p className="text-xs text-destructive">{error}</p>}
    {!error && items.length === 0 && !isLoading && (
      <p className="text-xs text-muted-foreground">No JDs yet. Upload one above.</p>
    )}
    <ul className="space-y-2">
      {items.map((jd) => (
        <li key={jd.jd_id}>
          <button
            type="button"
            onClick={() => onSelect(jd.jd_id)}
            className={cn(
              "w-full rounded-xl border p-3 text-left transition-colors",
              selectedId === jd.jd_id
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50",
            )}
          >
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Briefcase className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="truncate">{jd.role ?? jd.file_name ?? "Untitled JD"}</span>
            </div>
            <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {jd.company_name ?? "Company not resolved"}
              {jd.location ? ` · ${jd.location}` : ""}
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              {jd.top_categories.map((c) => (
                <span
                  key={c}
                  className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
                  style={{ backgroundColor: categoryColor(c) }}
                >
                  {c}
                </span>
              ))}
              <span className="ml-auto text-[10px] text-muted-foreground">
                {jd.skill_count} skills · {jd.must_count} must
              </span>
            </div>
          </button>
        </li>
      ))}
    </ul>
  </div>
);
