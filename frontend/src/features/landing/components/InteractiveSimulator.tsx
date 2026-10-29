import React, { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  Sparkles,
  Sliders,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Cpu,
  Layers,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface PresetCompany {
  id: number;
  name: string;
  tier: "Super Dream" | "Dream";
  ctc: string;
  category: string;
  skills: {
    dsa: number;
    sysDesign: number;
    cloud: number;
    coreCs: number;
  };
}

const PRESET_COMPANIES: PresetCompany[] = [
  {
    id: 4,
    name: "Google LLC",
    tier: "Super Dream",
    ctc: "32–45 LPA",
    category: "Global R&D / BigTech",
    skills: { dsa: 8, sysDesign: 8, cloud: 7, coreCs: 8 },
  },
  {
    id: 78,
    name: "Microsoft Corporation",
    tier: "Super Dream",
    ctc: "28–44 LPA",
    category: "Enterprise Cloud & Software",
    skills: { dsa: 8, sysDesign: 7, cloud: 7, coreCs: 8 },
  },
  {
    id: 2,
    name: "Amazon AWS",
    tier: "Super Dream",
    ctc: "28–42 LPA",
    category: "Cloud Infrastructure & E-Commerce",
    skills: { dsa: 8, sysDesign: 7, cloud: 8, coreCs: 7 },
  },
  {
    id: 15,
    name: "Goldman Sachs",
    tier: "Super Dream",
    ctc: "24–32 LPA",
    category: "Fintech & Quantitative Systems",
    skills: { dsa: 8, sysDesign: 7, cloud: 6, coreCs: 8 },
  },
  {
    id: 19,
    name: "Adobe Systems",
    tier: "Super Dream",
    ctc: "25–40 LPA",
    category: "Creative Cloud & Media AI",
    skills: { dsa: 8, sysDesign: 7, cloud: 6, coreCs: 7 },
  },
  {
    id: 21,
    name: "Cisco Systems",
    tier: "Dream",
    ctc: "15–20 LPA",
    category: "Enterprise Networking & Security",
    skills: { dsa: 7, sysDesign: 6, cloud: 7, coreCs: 7 },
  },
];

export const InteractiveSimulator: React.FC = () => {
  const [selectedCompany, setSelectedCompany] = useState<PresetCompany>(PRESET_COMPANIES[0]!);
  const [candidateDsa, setCandidateDsa] = useState<number>(7);
  const [candidateSysDesign, setCandidateSysDesign] = useState<number>(6);
  const [candidateCloud, setCandidateCloud] = useState<number>(6);
  const [candidateCoreCs, setCandidateCoreCs] = useState<number>(7);

  // Exact Deterministic Readiness Formula from contract:
  // Readiness = 100 * sum(min(c, r) - 1) / sum(r - 1)
  const readinessMetrics = useMemo(() => {
    const pairs = [
      { c: candidateDsa, r: selectedCompany.skills.dsa, name: "Data Structures & Algorithms" },
      { c: candidateSysDesign, r: selectedCompany.skills.sysDesign, name: "System Architecture" },
      { c: candidateCloud, r: selectedCompany.skills.cloud, name: "Cloud & Distributed Systems" },
      {
        c: candidateCoreCs,
        r: selectedCompany.skills.coreCs,
        name: "Core CS (OS, DBMS, Networks)",
      },
    ];

    const numerator = pairs.reduce((acc, p) => acc + (Math.min(p.c, p.r) - 1), 0);
    const denominator = pairs.reduce((acc, p) => acc + (p.r - 1), 0);
    const score = denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;

    return {
      score: Math.min(100, Math.max(0, score)),
      pairs,
    };
  }, [selectedCompany, candidateDsa, candidateSysDesign, candidateCloud, candidateCoreCs]);

  const fitStatus = useMemo(() => {
    if (readinessMetrics.score >= 85) {
      return {
        label: "Ready for Day 1 Hiring Bar",
        badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
        description: "Candidate meets or exceeds critical Bloom taxonomy benchmarks.",
      };
    }
    if (readinessMetrics.score >= 65) {
      return {
        label: "Tier Gap Detected — Targeted Review Needed",
        badge: "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30",
        description:
          "Minor shortfall in 1-2 competencies; remediable via focused topic ladder practice.",
      };
    }
    return {
      label: "Foundational Gap",
      badge: "bg-muted text-muted-foreground border-border",
      description:
        "Significant level disparity; recommend structured prerequisite course completion.",
    };
  }, [readinessMetrics.score]);

  return (
    <section id="simulator" className="relative scroll-mt-20 py-16 md:py-24 border-t border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card-sub px-3 py-1 text-xs font-semibold text-foreground">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            Interactive Engine Preview
          </div>
          <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Simulate Readiness Against Live Corporate Bars
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Test the deterministic mathematical engine right in your browser. Choose an employer,
            adjust candidate proficiencies, and observe real-time auditability.
          </p>
        </div>

        {/* Simulator Card Container */}
        <div className="mt-12 overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
          {/* Top Bar: Company Selector Pills */}
          <div className="border-b border-border bg-card-sub p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Select Benchmark Corporate Target:
              </span>
              <div className="flex flex-wrap gap-2">
                {PRESET_COMPANIES.map((company) => (
                  <button
                    key={company.id}
                    onClick={() => setSelectedCompany(company)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                      selectedCompany.id === company.id
                        ? "border border-primary bg-primary text-primary-foreground shadow-sm font-semibold"
                        : "border border-border bg-card text-muted-foreground hover:border-border hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    {company.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Simulator Grid */}
          <div className="grid grid-cols-1 gap-8 p-6 lg:grid-cols-12 lg:p-8">
            {/* Left Column: Interactive Competency Sliders (7 Cols) */}
            <div className="space-y-6 lg:col-span-7">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading text-lg font-bold text-foreground">
                    Candidate Bloom Proficiencies
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Adjust candidate skill levels (Scale 1–10 Bloom Taxonomy)
                  </p>
                </div>
                <button
                  onClick={() => {
                    setCandidateDsa(7);
                    setCandidateSysDesign(7);
                    setCandidateCloud(7);
                    setCandidateCoreCs(7);
                  }}
                  className="rounded-lg border border-border bg-card-sub px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                >
                  Reset Defaults
                </button>
              </div>

              {/* Sliders Container */}
              <div className="space-y-5 rounded-2xl border border-border bg-card-sub p-5">
                {/* DSA Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">
                      Data Structures & Algorithms
                    </span>
                    <span className="font-mono text-muted-foreground">
                      Candidate: <strong className="text-foreground">L{candidateDsa}</strong> /
                      Cutoff:{" "}
                      <strong className="text-emerald-600 dark:text-emerald-400">
                        L{selectedCompany.skills.dsa}
                      </strong>
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={candidateDsa}
                    onChange={(e) => setCandidateDsa(Number(e.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
                  />
                </div>

                {/* System Architecture */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">
                      System Architecture & Design
                    </span>
                    <span className="font-mono text-muted-foreground">
                      Candidate: <strong className="text-foreground">L{candidateSysDesign}</strong>{" "}
                      / Cutoff:{" "}
                      <strong className="text-emerald-600 dark:text-emerald-400">
                        L{selectedCompany.skills.sysDesign}
                      </strong>
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={candidateSysDesign}
                    onChange={(e) => setCandidateSysDesign(Number(e.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
                  />
                </div>

                {/* Cloud & Distributed Systems */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">
                      Cloud & Distributed Infrastructure
                    </span>
                    <span className="font-mono text-muted-foreground">
                      Candidate: <strong className="text-foreground">L{candidateCloud}</strong> /
                      Cutoff:{" "}
                      <strong className="text-emerald-600 dark:text-emerald-400">
                        L{selectedCompany.skills.cloud}
                      </strong>
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={candidateCloud}
                    onChange={(e) => setCandidateCloud(Number(e.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
                  />
                </div>

                {/* Core CS */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">
                      Core CS (OS, DBMS, Computer Networks)
                    </span>
                    <span className="font-mono text-muted-foreground">
                      Candidate: <strong className="text-foreground">L{candidateCoreCs}</strong> /
                      Cutoff:{" "}
                      <strong className="text-emerald-600 dark:text-emerald-400">
                        L{selectedCompany.skills.coreCs}
                      </strong>
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={candidateCoreCs}
                    onChange={(e) => setCandidateCoreCs(Number(e.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
                  />
                </div>
              </div>

              {/* Formula Attribution Note */}
              <div className="rounded-xl border border-border bg-card p-3 text-[11px] font-mono text-muted-foreground">
                Formula:{" "}
                <span className="text-foreground">
                  Readiness = 100 * &Sigma; min(c, r) - 1 / &Sigma; (r - 1)
                </span>{" "}
                · Zero LLM hallucinations
              </div>
            </div>

            {/* Right Column: Live Output & Match Result (5 Cols) */}
            <div className="flex flex-col justify-between rounded-2xl border border-border bg-card-sub p-6 lg:col-span-5">
              <div>
                {/* Target Company Badge */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Target Placement Bar
                    </span>
                    <h4 className="font-heading text-lg font-bold text-foreground">
                      {selectedCompany.name}
                    </h4>
                  </div>
                  <span className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground">
                    {selectedCompany.tier}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    CTC:{" "}
                    <strong className="text-emerald-600 dark:text-emerald-400">
                      {selectedCompany.ctc}
                    </strong>
                  </span>
                  <span>·</span>
                  <span>{selectedCompany.category}</span>
                </div>

                {/* Big Score Visualizer */}
                <div className="mt-6 rounded-2xl border border-border bg-card p-5 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Deterministic Readiness Score
                  </p>
                  <div className="mt-2 flex items-baseline justify-center gap-1 font-heading">
                    <span
                      className={`text-5xl font-black sm:text-6xl ${
                        readinessMetrics.score >= 85
                          ? "text-emerald-600 dark:text-emerald-400"
                          : readinessMetrics.score >= 65
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-muted-foreground"
                      }`}
                    >
                      {readinessMetrics.score}%
                    </span>
                  </div>

                  {/* Fit Badge */}
                  <div className="mt-3">
                    <span
                      className={`inline-block rounded-full border px-3 py-1 text-xs font-semibold ${fitStatus.badge}`}
                    >
                      {fitStatus.label}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{fitStatus.description}</p>
                </div>

                {/* Category Gap Breakdown List */}
                <div className="mt-5 space-y-2">
                  {readinessMetrics.pairs.map((p) => {
                    const diff = p.c - p.r;
                    return (
                      <div
                        key={p.name}
                        className="flex items-center justify-between text-xs py-1 border-b border-border"
                      >
                        <span className="text-foreground">{p.name}</span>
                        <span
                          className={`font-mono font-medium ${
                            diff >= 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {diff >= 0 ? `Target Met (L${p.c})` : `-${Math.abs(diff)} Level Gap`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom CTAs */}
              <div className="mt-6 pt-4 border-t border-border space-y-2">
                <Link to="/talent-check" className="block w-full">
                  <Button className="w-full bg-primary text-primary-foreground font-semibold hover:opacity-90">
                    <Sparkles className="mr-1.5 h-4 w-4 text-amber-400" />
                    Open Full Talent Check Console
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/companies" className="block w-full">
                  <Button
                    variant="ghost"
                    className="w-full text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    View All 115 Corporate Profiles
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
