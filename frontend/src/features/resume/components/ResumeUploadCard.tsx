import React, { useRef, useState } from "react";
import { UploadCloud, FileText, Sparkles, ShieldCheck, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResumeUploadCardProps {
  onFileUpload: (file: File) => void | Promise<void>;
  onSelectSample: (candidateKey: string) => void;
  isLoading: boolean;
  currentCandidateName?: string | undefined;
}

const DEMO_CANDIDATES = [
  {
    key: "ananya",
    name: "Ananya Rao",
    tag: "Systems / SWE Focus",
    color: "border-orange-500/40 text-orange-400 bg-orange-500/10",
  },
  {
    key: "karthik",
    name: "Karthik Sub.",
    tag: "Data Eng. / SQL Focus",
    color: "border-cyan-500/40 text-cyan-400 bg-cyan-500/10",
  },
  {
    key: "priya",
    name: "Priya Menon",
    tag: "Support / Entry Focus",
    color: "border-pink-500/40 text-pink-400 bg-pink-500/10",
  },
  {
    key: "rohan",
    name: "Rohan Verma",
    tag: "All-Rounder Generalist",
    color: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
  },
];

export const ResumeUploadCard: React.FC<ResumeUploadCardProps> = ({
  onFileUpload,
  onSelectSample,
  isLoading,
  currentCandidateName,
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
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
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

        {/* Privacy badge */}
        <div className="inline-flex items-center gap-1.5 self-start md:self-auto rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Zero PII Sent: Contacts Redacted</span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Upload Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`lg:col-span-7 flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-7 text-center transition-all cursor-pointer ${
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

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card text-primary shadow-2xs">
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            ) : (
              <UploadCloud className="h-6 w-6" />
            )}
          </div>

          <h4 className="mt-3 font-semibold text-sm text-foreground">
            {isLoading ? "Analyzing Resume Structure..." : "Drop candidate resume here, or browse"}
          </h4>
          <p className="mt-1 text-xs text-muted-foreground">Supports PDF &amp; DOCX (Max 10MB)</p>
        </div>

        {/* 1-Click Golden Demo Candidates */}
        <div className="lg:col-span-5 flex flex-col justify-center space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>Or test with a pre-validated sample candidate:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {DEMO_CANDIDATES.map((cand) => {
              const isSelected = currentCandidateName?.includes(cand.name.split(" ")[0] || "");
              return (
                <button
                  key={cand.key}
                  type="button"
                  disabled={isLoading}
                  onClick={() => onSelectSample(cand.key)}
                  className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition-all cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/10 ring-1 ring-primary text-primary"
                      : "border-border bg-card-sub hover:border-primary/40 hover:bg-muted/50"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="font-semibold text-xs text-foreground">{cand.name}</span>
                    {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                  </div>
                  <span className="mt-0.5 text-[10px] text-muted-foreground">{cand.tag}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
