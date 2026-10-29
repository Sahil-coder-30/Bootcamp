import React, { useRef, useState } from "react";
import {
  UploadCloud,
  FileText,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResumeUploadCardProps {
  onFileUpload: (file: File) => void | Promise<void>;
  onSelectSample?: (candidateKey: string) => void;
  isLoading: boolean;
  status?: "idle" | "uploading" | "parsing" | "done" | "error";
  currentCandidateName?: string | undefined;
  onClear?: () => void;
  onNext?: () => void;
  showSamples?: boolean;
}

export const ResumeUploadCard: React.FC<ResumeUploadCardProps> = ({
  onFileUpload,
  onSelectSample,
  isLoading,
  status,
  currentCandidateName,
  onClear,
  onNext,
  showSamples = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFileUpload(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-primary shadow-xs" />
            <h3 className="font-heading text-lg font-bold text-foreground">
              Resume Ingestion &amp; Deterministic Parser
            </h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Upload PDF or DOCX format. Computes 12-dimensional Bloom skill levels and extracts
            grounded evidence.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {currentCandidateName && onClear && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClear}
              className="text-xs border-border hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Upload Different Resume
            </Button>
          )}

          {currentCandidateName && onNext && (
            <Button
              size="sm"
              onClick={onNext}
              className="text-xs bg-primary text-primary-foreground font-semibold shadow-xs hover:bg-primary/90 cursor-pointer"
            >
              Next
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          )}

          {/* Privacy badge */}
          <div className="inline-flex items-center gap-1.5 self-start md:self-auto rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Zero PII Sent: Contacts Redacted</span>
          </div>
        </div>
      </div>

      <div className="mt-6">
        {/* Upload Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`w-full flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 sm:p-6 text-center transition-all cursor-pointer ${
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-border bg-card-sub hover:border-primary/50 hover:bg-muted/40"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl border border-border bg-card text-primary shadow-2xs">
            {isLoading ? (
              <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-primary" />
            ) : (
              <UploadCloud className="h-5 w-5 sm:h-6 sm:w-6" />
            )}
          </div>

          <h4 className="mt-2.5 font-semibold text-xs sm:text-sm text-foreground max-w-full break-words">
            {isLoading
              ? status === "uploading"
                ? "Uploading Resume Document..."
                : status === "parsing"
                  ? "Parsing & Computing Bloom Fingerprint..."
                  : "Analyzing Resume Structure..."
              : "Drop candidate resume here, or browse"}
          </h4>
          <p className="mt-1 text-[11px] sm:text-xs text-muted-foreground max-w-full break-words">
            {currentCandidateName
              ? `Parsed for ${currentCandidateName} · Drop a new file to replace (PDF, DOCX, or TXT, Max 10MB)`
              : "Supports PDF, DOCX, or TXT (Max 10MB)"}
          </p>

          {!isLoading && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/20">
              <UploadCloud className="h-3.5 w-3.5" />
              <span>Browse File</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
