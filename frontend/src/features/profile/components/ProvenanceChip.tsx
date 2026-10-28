import { Check, RotateCcw, Sparkles } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useFieldProvenance } from "../Hooks/useFieldProvenance";
import type { ReviewState } from "../lib/types";

const LABEL: Record<ReviewState, string> = {
  pending: "from resume",
  accepted: "accepted",
  rejected: "restored",
  edited: "edited",
};

const TONE: Record<ReviewState, string> = {
  pending: "border-sky-500/40 bg-sky-500/10 text-sky-300",
  accepted: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  rejected: "border-zinc-500/40 bg-zinc-500/10 text-zinc-300",
  edited: "border-amber-500/40 bg-amber-500/10 text-amber-300",
};

interface Props {
  /** The form path this chip belongs to, e.g. "internships.0.org". */
  path: string;
  /** Replaces the default "restore the previous value" (a skill row is removed instead). */
  onReject?: () => void;
}

/** "From resume" chip: the evidence on hover or focus, and accept / reject for the candidate. */
export function ProvenanceChip({ path, onReject }: Props) {
  const { provenance, state, accept, reject } = useFieldProvenance(path);
  if (!provenance) return null;
  const open = state === "pending" || state === "edited";

  return (
    <span className="inline-flex items-center gap-1" data-testid={`prov-${path}`}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex cursor-help items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              TONE[state],
            )}
            aria-label={`${LABEL[state]}, ${provenance.confidence} confidence. Evidence: ${provenance.evidence}`}
          >
            <Sparkles className="h-3 w-3" aria-hidden />
            {LABEL[state]}
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-xs font-medium">{provenance.confidence} confidence</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{provenance.evidence}</p>
        </TooltipContent>
      </Tooltip>
      {open && (
        <>
          <button
            type="button"
            onClick={accept}
            className="inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-emerald-400 hover:bg-emerald-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Accept the resume value"
          >
            <Check className="h-3 w-3" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onReject ?? reject}
            className="inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Reject: go back to what I had"
          >
            <RotateCcw className="h-3 w-3" aria-hidden />
          </button>
        </>
      )}
    </span>
  );
}
