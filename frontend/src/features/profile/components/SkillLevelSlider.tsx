import { Minus, Plus, RotateCcw, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider, thumbLeft } from "@/components/ui/slider";
import { BLOOM_NAMES, CATEGORY_COLORS, CATEGORY_NAMES, bloomOf, type Code } from "@/lib/categories";
import { BANDS, bandOf, levelText } from "../lib/rubric";
import type { SkillLevel } from "../lib/schema";

const SOURCE_LABEL: Record<SkillLevel["source"], string> = {
  resume_inferred: "from resume",
  self: "self",
  assessed: "assessed",
};

const SOURCE_VARIANT: Record<SkillLevel["source"], "secondary" | "warning" | "success"> = {
  resume_inferred: "secondary",
  self: "warning",
  assessed: "success",
};

const pct = (level: number) => ((level - 1) / 9) * 100;

interface Props {
  code: Code;
  value: SkillLevel;
  /** The chosen company's required level for this category, drawn as a faint marker. */
  companyLevel?: number | undefined;
  /** Soft warning: self-rated well above what the resume shows. */
  warning?: boolean;
  onChange: (level: number) => void;
  onReset: () => void;
  onCalibrate: () => void;
}

/** One category's 1-10 level: slider, stepper, Bloom bands, rubric helper, ghost marker for the resume value. */
export function SkillLevelSlider({
  code,
  value,
  companyLevel,
  warning,
  onChange,
  onReset,
  onCalibrate,
}: Props) {
  const name = CATEGORY_NAMES[code];
  const band = bandOf(value.level);
  const inferred = value.inferred_level ?? null;
  const canReset = value.source !== "resume_inferred" && inferred !== null;

  return (
    <div
      className="space-y-2 rounded-lg border border-border bg-card/40 p-3 sm:p-4"
      data-testid={`level-${code}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: CATEGORY_COLORS[code] }}
            aria-hidden
          />
          <h4 className="truncate text-sm font-semibold">{name}</h4>
          <Badge variant="outline">{code}</Badge>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant={SOURCE_VARIANT[value.source]} data-testid={`source-${code}`}>
            {SOURCE_LABEL[value.source]}
          </Badge>
          <Badge variant="outline" title={BLOOM_NAMES[bloomOf(value.level)]}>
            {bloomOf(value.level)}
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-11 w-11 shrink-0"
          aria-label={`Decrease ${name}`}
          disabled={value.level <= 1}
          onClick={() => onChange(value.level - 1)}
        >
          <Minus aria-hidden />
        </Button>
        <div className="min-w-0 flex-1">
          <Slider
            min={1}
            max={10}
            step={1}
            value={[value.level]}
            onValueChange={([n]) => n !== undefined && onChange(n)}
            thumbLabel={`${name} level`}
            thumbValueText={levelText(value.level)}
          >
            {inferred !== null && (
              <span
                className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-muted-foreground"
                style={{ left: thumbLeft(pct(inferred)) }}
                title={`Resume suggested ${inferred}`}
                data-testid={`ghost-${code}`}
              >
                <span className="sr-only">Resume suggested {inferred}</span>
              </span>
            )}
            {companyLevel !== undefined && (
              <span
                className="pointer-events-none absolute top-1/2 h-5 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-amber-400/70"
                style={{ left: thumbLeft(pct(companyLevel)) }}
                title={`Company bar: ${companyLevel}`}
                data-testid={`bar-${code}`}
              >
                <span className="sr-only">Company bar {companyLevel}</span>
              </span>
            )}
          </Slider>
          <div
            className="mt-0.5 grid grid-cols-5 text-center text-[10px] text-muted-foreground"
            aria-hidden
          >
            {BANDS.map((b) => (
              <span key={b.bloom} title={`${b.name} (${b.min}-${b.max})`}>
                {b.bloom}
              </span>
            ))}
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-11 w-11 shrink-0"
          aria-label={`Increase ${name}`}
          disabled={value.level >= 10}
          onClick={() => onChange(value.level + 1)}
        >
          <Plus aria-hidden />
        </Button>
        <span
          className="w-6 shrink-0 text-center font-mono text-lg font-semibold"
          aria-hidden
          data-testid={`value-${code}`}
        >
          {value.level}
        </span>
      </div>

      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{band.name}:</span> {band.evidence}
      </p>
      <p className="text-xs text-muted-foreground/80">Basis: {value.basis}</p>
      {warning && (
        <p role="status" className="text-xs text-amber-400">
          Talent Check will treat this as self-reported: it is well above what your resume shows.
        </p>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onCalibrate}>
          <Target aria-hidden /> Calibrate me
        </Button>
        {canReset && (
          <Button type="button" variant="ghost" size="sm" onClick={onReset}>
            <RotateCcw aria-hidden /> Reset to resume value ({inferred})
          </Button>
        )}
      </div>
    </div>
  );
}
