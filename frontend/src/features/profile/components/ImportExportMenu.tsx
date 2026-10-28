import { useRef, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useProfileJson } from "../Hooks/useProfileJson";
import type { Issue } from "../lib/schema";
import type { ProfileValues } from "../lib/types";

interface Props {
  form: UseFormReturn<ProfileValues>;
  /** Called after a successful import, e.g. to jump to the Basics tab. */
  onImported?: () => void;
}

/** The brief's JSON save/load: download the contract object, or load one back through the same schema. */
export function ImportExportMenu({ form, onImported }: Props) {
  const { exportJson, importJson } = useProfileJson();
  const input = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<Issue[] | null>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const result = await importJson(file);
    if (input.current) input.current.value = "";
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    // Keep the saved profile's server fields (id/version) so Save updates instead of creating.
    const current = form.getValues() as ProfileValues;
    form.reset(
      {
        ...result.values,
        ...(current.id ? { id: current.id } : {}),
        ...(current.version ? { version: current.version } : {}),
      },
      { keepDefaultValues: true },
    );
    toast.success("Profile loaded from the file. Review it, then save.");
    onImported?.();
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            const name = exportJson(form.getValues() as ProfileValues);
            toast.success(`Downloaded ${name}`);
          }}
        >
          <Download aria-hidden /> Export JSON
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => input.current?.click()}>
          <Upload aria-hidden /> Import JSON
        </Button>
        <input
          ref={input}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          aria-label="Import profile JSON file"
          data-testid="import-json-input"
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
      </div>

      <Dialog open={errors !== null} onOpenChange={(open) => !open && setErrors(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>That file could not be loaded</DialogTitle>
            <DialogDescription>Fix these and try again. Nothing was changed.</DialogDescription>
          </DialogHeader>
          <ul className="max-h-72 space-y-1.5 overflow-y-auto text-sm" data-testid="import-errors">
            {(errors ?? []).map((e, i) => (
              <li
                key={`${e.path}-${i}`}
                className="rounded-md border border-border bg-card/50 px-3 py-1.5"
              >
                {e.path && <code className="mr-2 text-xs text-muted-foreground">{e.path}</code>}
                {e.message}
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button type="button" onClick={() => setErrors(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
