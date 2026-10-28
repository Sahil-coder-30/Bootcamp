import { get, useFormContext, type FieldError, type Path } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ProfileValues } from "../lib/types";
import { ProvenanceChip } from "./ProvenanceChip";

interface Props {
  /** Form path, e.g. "internships.0.org". */
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  multiline?: boolean;
  autoComplete?: string;
  inputMode?: "text" | "email" | "tel" | "numeric" | "url";
  className?: string;
}

/** Label + input + "from resume" chip + inline error, wired to the form by path. */
export function TextField({
  name,
  label,
  type = "text",
  placeholder,
  hint,
  required,
  multiline,
  autoComplete,
  inputMode,
  className,
}: Props) {
  const {
    register,
    formState: { errors },
  } = useFormContext<ProfileValues>();
  const id = `f-${name}`;
  const error = get(errors, name) as FieldError | undefined;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const common = {
    id,
    placeholder,
    "aria-invalid": error ? (true as const) : undefined,
    "aria-describedby": describedBy,
    ...register(name as Path<ProfileValues>),
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex min-h-5 flex-wrap items-center justify-between gap-2">
        <Label htmlFor={id}>
          {label}
          {required && (
            <span aria-hidden className="text-destructive">
              {" "}
              *
            </span>
          )}
        </Label>
        <ProvenanceChip path={name} />
      </div>
      {multiline ? (
        <Textarea {...common} />
      ) : (
        <Input type={type} autoComplete={autoComplete} inputMode={inputMode} {...common} />
      )}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error.message}
        </p>
      )}
    </div>
  );
}

/** Section card used by every step. */
export function Section({
  title,
  description,
  children,
  actions,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-xl border border-border bg-card/50 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-heading text-base font-semibold">{title}</h3>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
