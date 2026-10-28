import { Controller, useFormContext, type Path } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ProfileValues } from "../lib/types";

interface Props {
  /** A string[] field in the form. */
  name: string;
  label: string;
  hint?: string;
  /** "line": one item per line (highlights). "comma": comma-separated (a project's skills). */
  mode: "line" | "comma";
  rows?: number;
}

/** Edits a string[] as plain text; empty items are dropped when the field loses focus. */
export function LinesField({ name, label, hint, mode, rows = 3 }: Props) {
  const { control } = useFormContext<ProfileValues>();
  const sep = mode === "line" ? "\n" : ",";
  const id = `f-${name}`;

  return (
    <Controller
      control={control}
      name={name as Path<ProfileValues>}
      render={({ field }) => {
        const items = (field.value as string[] | undefined) ?? [];
        return (
          <div className="space-y-1.5">
            <Label htmlFor={id}>{label}</Label>
            <Textarea
              id={id}
              rows={rows}
              value={items.join(mode === "line" ? "\n" : ", ")}
              onChange={(e) => field.onChange(e.target.value.split(sep))}
              onBlur={() => {
                field.onChange(items.map((s) => s.trim()).filter(Boolean));
                field.onBlur();
              }}
              ref={field.ref}
            />
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
          </div>
        );
      }}
    />
  );
}
