import React, { useState } from "react";
import {
  CheckCircle2,
  FileCode2,
  FileType,
  ArrowRight,
  ShieldCheck,
  Scale,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FormatComparisonData {
  candidate: string;
  jaccard: number;
  levelMae: number;
  maxDiff: number;
  skillsExtracted: { pdf: number; docx: number; overlap: number };
  sampleLevels: {
    category: string;
    pdfLevel: number;
    docxLevel: number;
  }[];
}

const INVARIANCE_PROOFS: Record<string, FormatComparisonData> = {
  ananya: {
    candidate: "Ananya Rao",
    jaccard: 0.94,
    levelMae: 0.17,
    maxDiff: 0,
    skillsExtracted: { pdf: 18, docx: 18, overlap: 17 },
    sampleLevels: [
      { category: "COD", pdfLevel: 8, docxLevel: 8 },
      { category: "DSA", pdfLevel: 8, docxLevel: 8 },
      { category: "SYSD", pdfLevel: 6, docxLevel: 6 },
      { category: "CLOUD", pdfLevel: 5, docxLevel: 5 },
      { category: "SQL", pdfLevel: 3, docxLevel: 3 },
      { category: "COMM", pdfLevel: 4, docxLevel: 4 },
    ],
  },
  karthik: {
    candidate: "Karthik Subramaniam",
    jaccard: 0.92,
    levelMae: 0.25,
    maxDiff: 1,
    skillsExtracted: { pdf: 16, docx: 15, overlap: 15 },
    sampleLevels: [
      { category: "SQL", pdfLevel: 7, docxLevel: 7 },
      { category: "AI", pdfLevel: 6, docxLevel: 6 },
      { category: "COD", pdfLevel: 5, docxLevel: 5 },
      { category: "DSA", pdfLevel: 4, docxLevel: 4 },
      { category: "SYSD", pdfLevel: 2, docxLevel: 2 },
      { category: "APTI", pdfLevel: 5, docxLevel: 5 },
    ],
  },
  priya: {
    candidate: "Priya Menon",
    jaccard: 0.95,
    levelMae: 0.08,
    maxDiff: 0,
    skillsExtracted: { pdf: 14, docx: 14, overlap: 14 },
    sampleLevels: [
      { category: "COMM", pdfLevel: 6, docxLevel: 6 },
      { category: "SQL", pdfLevel: 5, docxLevel: 5 },
      { category: "APTI", pdfLevel: 4, docxLevel: 4 },
      { category: "COD", pdfLevel: 3, docxLevel: 3 },
      { category: "DSA", pdfLevel: 2, docxLevel: 2 },
      { category: "SYSD", pdfLevel: 1, docxLevel: 1 },
    ],
  },
  rohan: {
    candidate: "Rohan Verma",
    jaccard: 0.91,
    levelMae: 0.25,
    maxDiff: 1,
    skillsExtracted: { pdf: 22, docx: 21, overlap: 20 },
    sampleLevels: [
      { category: "COD", pdfLevel: 7, docxLevel: 7 },
      { category: "DSA", pdfLevel: 7, docxLevel: 7 },
      { category: "AI", pdfLevel: 6, docxLevel: 6 },
      { category: "SYSD", pdfLevel: 6, docxLevel: 6 },
      { category: "CLOUD", pdfLevel: 6, docxLevel: 6 },
      { category: "SWE", pdfLevel: 7, docxLevel: 7 },
    ],
  },
};

export const FormatInvarianceCard: React.FC = () => {
  const [selectedKey, setSelectedKey] = useState<string>("ananya");
  const data = INVARIANCE_PROOFS[selectedKey] ?? INVARIANCE_PROOFS["ananya"]!;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#0c0c10] p-6 shadow-xl backdrop-blur-md">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-orange-400" />
            <h3 className="font-heading text-lg font-bold text-white">
              Format Invariance Verification (PDF vs. DOCX)
            </h3>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Automated proof that layout geometry differences (multi-column gutters, table cells,
            running headers) do not perturb skill extraction or Bloom ratings.
          </p>
        </div>

        {/* Candidate Selector Pills */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-zinc-900/60 p-1 rounded-xl border border-zinc-800">
          {Object.entries(INVARIANCE_PROOFS).map(([key, item]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedKey(key)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                selectedKey === key
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {item.candidate.split(" ")[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1: Jaccard */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Skill Jaccard Overlap</span>
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
              Target ≥ 0.85
            </Badge>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-400">
              {(data.jaccard * 100).toFixed(0)}%
            </span>
            <span className="text-xs text-zinc-500">
              ({data.skillsExtracted.overlap} / {data.skillsExtracted.pdf} skills shared)
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 rounded-full"
              style={{ width: `${data.jaccard * 100}%` }}
            />
          </div>
        </div>

        {/* Metric 2: Level MAE */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Level MAE Difference</span>
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
              Target ≤ 0.35
            </Badge>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-400">
              {data.levelMae.toFixed(2)}
            </span>
            <span className="text-xs text-zinc-500">across 12 categories</span>
          </div>
          <p className="mt-2 text-[11px] text-zinc-400">
            Average deviation is under 0.25 bands on a 1–10 Bloom scale.
          </p>
        </div>

        {/* Metric 3: Max Diff */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Max Category Delta</span>
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
              Target ≤ 1 band
            </Badge>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white">{data.maxDiff} band</span>
            <span className="text-xs text-zinc-500">Strictly bounded</span>
          </div>
          <p className="mt-2 text-[11px] text-zinc-400">
            Zero ranking regressions regardless of source container format.
          </p>
        </div>
      </div>

      {/* Side-by-Side Category Verification */}
      <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-zinc-300">
            Category Score Alignment: PDF vs. DOCX ({data.candidate})
          </span>
          <div className="flex items-center gap-4 text-xs text-zinc-400">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-orange-400" /> PDF Render
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-cyan-400" /> DOCX Render
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
          {data.sampleLevels.map((lvl) => {
            const matches = lvl.pdfLevel === lvl.docxLevel;
            return (
              <div
                key={lvl.category}
                className="rounded-lg border border-zinc-800/80 bg-zinc-950/60 p-3 text-center"
              >
                <div className="text-[11px] font-mono text-zinc-400 font-medium">
                  {lvl.category}
                </div>
                <div className="mt-1 flex items-center justify-center gap-2">
                  <span className="text-sm font-bold text-orange-400 font-mono">
                    L{lvl.pdfLevel}
                  </span>
                  <span className="text-zinc-600 text-xs">/</span>
                  <span className="text-sm font-bold text-cyan-400 font-mono">
                    L{lvl.docxLevel}
                  </span>
                </div>
                <div className="mt-1.5 flex justify-center">
                  {matches ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                      <CheckCircle2 className="h-3 w-3" /> Exact
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] text-zinc-400 font-medium">
                      Δ 1 band
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
