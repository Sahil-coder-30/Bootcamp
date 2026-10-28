import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CATEGORY_NAMES, type Code } from "@/lib/categories";
import { useCalibration } from "../Hooks/useCalibration";
import type { CalibrationResult } from "../Hooks/useSkillLevels";

interface Props {
  code: Code | null;
  /** The candidate's current level; the checklist covers one level either side. */
  level: number;
  onClose: () => void;
  onApply: (code: Code, result: CalibrationResult) => void;
}

/** "Calibrate me": tick the topics you can do at the levels around yours; we suggest a level. */
export function CalibrateSheet({ code, level, onClose, onApply }: Props) {
  const cal = useCalibration(code, level, code !== null);

  return (
    <Sheet open={code !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Calibrate {code ? CATEGORY_NAMES[code] : ""}</SheetTitle>
          <SheetDescription>
            Tick the topics you could do today without looking them up. We suggest the highest level
            where you cover at least 60% of its topics.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-5">
          {cal.loading && <p className="text-sm text-muted-foreground">Loading topics...</p>}
          {cal.error && (
            <p role="alert" className="text-sm text-destructive">
              {cal.error}
            </p>
          )}
          {!cal.loading && !cal.error && !cal.available && (
            <p className="text-sm text-muted-foreground">
              There is no topic list for this category yet, so you can only set it with the slider.
            </p>
          )}
          {cal.levels.map((l) => (
            <fieldset key={l.level} className="space-y-2">
              <legend className="text-sm font-semibold">Level {l.level}</legend>
              {l.topics.length === 0 && (
                <p className="text-xs text-muted-foreground">No topics listed.</p>
              )}
              {l.topics.map((topic, i) => {
                const id = `cal-${l.level}-${i}`;
                return (
                  <div key={id} className="flex items-start gap-2">
                    <input
                      id={id}
                      type="checkbox"
                      className="mt-1 h-4 w-4 cursor-pointer accent-primary"
                      checked={cal.ticked.has(`${l.level}:${i}`)}
                      onChange={() => cal.toggle(l.level, i)}
                    />
                    <label htmlFor={id} className="cursor-pointer text-sm leading-snug">
                      {topic}
                    </label>
                  </div>
                );
              })}
            </fieldset>
          ))}
        </div>

        <SheetFooter className="mt-6 flex-col gap-2 sm:flex-col">
          {cal.available && (
            <p className="text-sm" data-testid="calibration-suggestion">
              Suggested level: <span className="font-semibold">{cal.suggested}</span>
            </p>
          )}
          <Button
            type="button"
            disabled={!code || !cal.available}
            onClick={() => {
              if (!code) return;
              onApply(code, { level: cal.suggested, source: "self", basis: cal.basis });
              onClose();
            }}
          >
            Use level {cal.suggested}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
