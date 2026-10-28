import type { Control } from "react-hook-form";
import { useProfileCompleteness } from "../Hooks/useProfileCompleteness";
import type { Step } from "../lib/completeness";
import type { ProfileValues } from "../lib/types";

interface Props {
  control: Control<ProfileValues>;
  onGoToStep: (step: Step) => void;
}

/** 0-100 meter with the three most valuable things still missing. */
export function CompletenessMeter({ control, onGoToStep }: Props) {
  const { score, hints } = useProfileCompleteness(control);

  return (
    <div
      className="space-y-3 rounded-xl border border-border bg-card/50 p-4"
      data-testid="completeness"
    >
      <div className="flex items-baseline justify-between">
        <h3 className="font-heading text-sm font-semibold">Profile completeness</h3>
        <span className="font-mono text-lg font-semibold" data-testid="completeness-score">
          {score}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
        aria-label="Profile completeness"
        className="h-2 overflow-hidden rounded-full bg-secondary"
      >
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${score}%` }}
        />
      </div>
      {hints.length > 0 ? (
        <ul className="space-y-1.5">
          {hints.slice(0, 3).map((h) => (
            <li key={h.text}>
              <button
                type="button"
                onClick={() => onGoToStep(h.step)}
                className="w-full cursor-pointer rounded-md px-2 py-1 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="font-medium text-foreground">+{h.points}</span> {h.text}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-emerald-400">Everything is filled in.</p>
      )}
    </div>
  );
}
