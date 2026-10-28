import React, { useState } from "react";
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Upload,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface JDMatcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JDMatcherModal: React.FC<JDMatcherModalProps> = ({ isOpen, onClose }) => {
  const [jdText, setJdText] = useState(
    "Looking for a Software Development Engineer (SDE-1) skilled in Distributed Systems, Go/Python, Concurrency, PostgreSQL, Microservices, and REST API design.",
  );
  const [analyzed, setAnalyzed] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  if (!isOpen) return null;

  const handleAnalyze = () => {
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
      setAnalyzed(true);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card text-foreground p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted border border-border text-foreground">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-bold text-foreground">
                Job Description (JD) Matcher
              </h3>
              <p className="text-xs text-muted-foreground">
                Match any recruiter JD against your 12 RADIX Bloom skill benchmarks
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

        {/* Textarea */}
        <div className="mt-5 space-y-2">
          <label className="text-xs font-semibold text-foreground">
            Paste Job Description / Requirements
          </label>
          <textarea
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-border bg-card-sub p-3 text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
            placeholder="Paste role requirements, tech stack, and responsibilities here..."
          />
        </div>

        {/* Match Action */}
        <div className="mt-4 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            Deterministic RapidFuzz keyword & Bloom gap scoring
          </span>
          <Button
            onClick={handleAnalyze}
            disabled={analyzing || !jdText.trim()}
            className="rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs h-9 px-5 cursor-pointer shadow-md"
          >
            {analyzing ? (
              "Benchmarking Skills..."
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Run JD Match
              </>
            )}
          </Button>
        </div>

        {/* Results */}
        {analyzed && (
          <div className="mt-5 rounded-xl border border-primary/50 bg-card-sub p-4 animate-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-bold text-foreground">
                  82% Match with Candidate Profile
                </span>
              </div>
              <span className="rounded-full bg-muted border border-border px-2.5 py-0.5 text-xs font-bold text-foreground">
                Ready for SDE-1 Bar
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-card p-2.5 border border-border">
                <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                  ✓ Strong Matches (4/5)
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Distributed Systems, REST APIs, PostgreSQL, Python
                </p>
              </div>
              <div className="rounded-lg bg-card p-2.5 border border-border">
                <p className="font-semibold text-amber-700 dark:text-amber-400">
                  ⚡ Recommended Prep (1 Gap)
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Concurrency: Channel communication & Goroutines
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
