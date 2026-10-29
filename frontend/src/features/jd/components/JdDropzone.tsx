import React, { useRef, useState } from "react";
import { AlertCircle, FileText, Loader2, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UploadStage } from "../Hooks/jd.hooks";

interface JdDropzoneProps {
  onFile: (file: File) => void;
  stage: UploadStage;
  error: string | null;
}

const STAGE_LABEL: Partial<Record<UploadStage, string>> = {
  uploading: "Uploading and reading the document...",
  extracting: "Extracting skills with the LLM (5-60 s on first run)...",
  done: "Done. Result is on the right.",
};

const ACCEPT = ".pdf,.docx,.txt";

/** Drag and drop (or click) a JD file: PDF, DOCX or TXT, up to 10 MB. */
export const JdDropzone: React.FC<JdDropzoneProps> = ({ onFile, stage, error }) => {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const busy = stage === "uploading" || stage === "extracting";

  const pick = (file: File | undefined) => {
    if (file && !busy) onFile(file);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 w-full min-w-0">
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          pick(e.dataTransfer.files[0]);
        }}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors",
          over ? "border-primary bg-primary/5" : "border-border hover:border-primary/60",
          busy && "cursor-wait opacity-80",
        )}
        aria-label="Upload a job description"
      >
        {busy ? (
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        ) : (
          <UploadCloud className="h-7 w-7 text-primary" />
        )}
        <span className="text-sm font-semibold text-foreground">
          Drop a JD here or click to upload
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <FileText className="h-3.5 w-3.5" /> PDF, DOCX or TXT, up to 10 MB
        </span>
      </button>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        className="hidden"
        data-testid="jd-file-input"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {STAGE_LABEL[stage] && !error && (
        <p className="mt-2 text-xs text-muted-foreground min-w-0 break-words" role="status">
          {STAGE_LABEL[stage]}
        </p>
      )}
      {error && (
        <div
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive min-w-0"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p className="font-medium flex-1 min-w-0 break-words">{error}</p>
        </div>
      )}
    </div>
  );
};
