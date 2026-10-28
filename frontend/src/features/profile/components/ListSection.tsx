import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Section } from "./Field";

interface Props {
  title: string;
  description?: string;
  /** Noun for the buttons and the empty state, e.g. "internship". */
  noun: string;
  count: number;
  onAdd: () => void;
  children: React.ReactNode;
}

/** A titled list of repeatable cards with an Add button and an empty state. */
export function ListSection({ title, description, noun, count, onAdd, children }: Props) {
  return (
    <Section
      title={title}
      {...(description ? { description } : {})}
      actions={
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus aria-hidden /> Add {noun}
        </Button>
      }
    >
      {count === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          No {noun}s yet. Add one, or pre-fill from your CV on the Start tab.
        </p>
      ) : (
        <div className="space-y-4">{children}</div>
      )}
    </Section>
  );
}

/** One card in a list, with its remove button. */
export function ItemCard({
  label,
  onRemove,
  children,
  className,
}: {
  label: string;
  onRemove: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "space-y-3 rounded-lg border border-border bg-background/60 p-3 sm:p-4",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive"
          aria-label={`Remove ${label}`}
        >
          <Trash2 aria-hidden /> Remove
        </Button>
      </div>
      {children}
    </div>
  );
}
