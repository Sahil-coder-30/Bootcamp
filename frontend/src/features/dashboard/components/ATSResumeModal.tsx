import React from "react";
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  ArrowUpRight,
  Zap,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

interface ATSResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ATSResumeModal: React.FC<ATSResumeModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card text-foreground p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted border border-border text-foreground">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-bold text-foreground">
                ATS Resume Audit & Compliance
              </h3>
              <p className="text-xs text-muted-foreground">
                Format invariance, PII redaction audit, and keyword coverage
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ATS Score Row */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-card-sub p-4 text-center">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              ATS Parse Score
            </span>
            <div className="mt-2 font-heading text-3xl font-extrabold text-foreground">
              91<span className="text-sm font-normal text-muted-foreground">/100</span>
            </div>
            <span className="mt-1 inline-block text-[10px] font-bold text-foreground bg-muted px-2 py-0.5 rounded-full border border-border">
              Top 8% on Campus
            </span>
          </div>

          <div className="rounded-xl border border-border bg-card-sub p-4 text-center">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              PII Shield
            </span>
            <div className="mt-2 flex items-center justify-center gap-1.5 font-heading text-2xl font-bold text-foreground">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /> 100%
            </div>
            <span className="mt-1 inline-block text-[10px] font-medium text-muted-foreground">
              Zero PII leaks to LLMs
            </span>
          </div>

          <div className="rounded-xl border border-border bg-card-sub p-4 text-center">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Format Invariance
            </span>
            <div className="mt-2 flex items-center justify-center gap-1.5 font-heading text-2xl font-bold text-foreground">
              <Zap className="h-5 w-5 text-primary" /> 98.4%
            </div>
            <span className="mt-1 inline-block text-[10px] font-medium text-muted-foreground">
              PDF / DOCX match
            </span>
          </div>
        </div>

        {/* Audit Details */}
        <div className="mt-5 space-y-2.5">
          <div className="flex items-center justify-between rounded-xl border border-border bg-card-sub p-3 text-xs">
            <span className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Standard Heading Structures (Experience, Education, Skills)
            </span>
            <span className="font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
              Passed
            </span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-card-sub p-3 text-xs">
            <span className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Verifiable Metric Action Verbs (Reduced, Engineered, Scaled)
            </span>
            <span className="font-mono text-foreground font-semibold">14 Found</span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-card-sub p-3 text-xs">
            <span className="flex items-center gap-2 font-medium">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              Suggested Skill Addition: &apos;Distributed Tracing / OpenTelemetry&apos;
            </span>
            <span className="font-mono text-muted-foreground font-semibold">Recommendation</span>
          </div>
        </div>

        {/* Footer actions */}
        <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
          <span className="text-xs text-muted-foreground">
            Want to re-extract Bloom fingerprints?
          </span>
          <Link to="/resume" onClick={onClose}>
            <Button
              size="sm"
              className="rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs h-9 px-4 cursor-pointer shadow-md"
            >
              <FileCheck className="h-3.5 w-3.5 mr-1.5" /> Open Full Resume Parser
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
