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
        badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
        description: "Candidate meets or exceeds critical Bloom taxonomy benchmarks.",
      };
    }
    if (readinessMetrics.score >= 65) {
      return {
        label: "Tier Gap Detected — Targeted Review Needed",
        badge: "bg-amber-500/10 text-amber-400 border-amber-500/30",
        description:
          "Minor shortfall in 1-2 competencies; remediable via focused topic ladder practice.",
      };
    }
    return {
      label: "Foundational Gap",
      badge: "bg-zinc-700/30 text-zinc-300 border-zinc-600/40",
      description:
        "Significant level disparity; recommend structured prerequisite course completion.",
    };
  }, [readinessMetrics.score]);

  return (
    <section
      id="simulator"
      className="relative scroll-mt-20 py-16 md:py-24 border-t border-zinc-800/80"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-1 text-xs font-semibold text-zinc-300">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            Interactive Engine Preview
          </div>
          <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            Simulate Readiness Against Live Corporate Bars
          </h2>
          <p className="mt-3 text-sm text-zinc-400 sm:text-base">
            Test the deterministic mathematical engine right in your browser. Choose an employer,
            adjust candidate proficiencies, and observe real-time auditability.
          </p>
        </div>

        {/* Simulator Card Container */}
        <div className="mt-12 overflow-hidden rounded-3xl border border-zinc-800 bg-[#0c0c0e] shadow-2xl backdrop-blur-xl">
          {/* Top Bar: Company Selector Pills */}
          <div className="border-b border-zinc-800 bg-zinc-950/80 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Select Benchmark Corporate Target:
              </span>
              <div className="flex flex-wrap gap-2">
                {PRESET_COMPANIES.map((company) => (
                  <button
                    key={company.id}
                    onClick={() => setSelectedCompany(company)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                      selectedCompany.id === company.id
                        ? "border border-white bg-white text-zinc-950 shadow-md font-semibold"
                        : "border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-white"
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
                  <h3 className="font-heading text-lg font-bold text-white">
                    Candidate Bloom Proficiencies
                  </h3>
                  <p className="text-xs text-zinc-400">
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
                  className="rounded-lg border border-zinc-800 bg-zinc-900/80 px-2.5 py-1 text-[11px] font-medium text-zinc-400 hover:text-white"
                >
                  Reset Defaults
                </button>
              </div>

              {/* Sliders Container */}
              <div className="space-y-5 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-5">
                {/* DSA Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-200">Data Structures & Algorithms</span>
                    <span className="font-mono text-zinc-400">
                      Candidate: <strong className="text-white">L{candidateDsa}</strong> / Cutoff:{" "}
                      <strong className="text-emerald-400">L{selectedCompany.skills.dsa}</strong>
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={candidateDsa}
                    onChange={(e) => setCandidateDsa(Number(e.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-zinc-800 accent-white"
                  />
                </div>

                {/* System Architecture */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-200">System Architecture & Design</span>
                    <span className="font-mono text-zinc-400">
                      Candidate: <strong className="text-white">L{candidateSysDesign}</strong> /
                      Cutoff:{" "}
                      <strong className="text-emerald-400">
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
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-zinc-800 accent-white"
                  />
                </div>

                {/* Cloud & Distributed Systems */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-200">
                      Cloud & Distributed Infrastructure
                    </span>
                    <span className="font-mono text-zinc-400">
                      Candidate: <strong className="text-white">L{candidateCloud}</strong> / Cutoff:{" "}
                      <strong className="text-emerald-400">L{selectedCompany.skills.cloud}</strong>
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={candidateCloud}
                    onChange={(e) => setCandidateCloud(Number(e.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-zinc-800 accent-white"
                  />
                </div>

                {/* Core CS */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-200">
                      Core CS (OS, DBMS, Computer Networks)
                    </span>
                    <span className="font-mono text-zinc-400">
                      Candidate: <strong className="text-white">L{candidateCoreCs}</strong> /
                      Cutoff:{" "}
                      <strong className="text-emerald-400">L{selectedCompany.skills.coreCs}</strong>
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={candidateCoreCs}
                    onChange={(e) => setCandidateCoreCs(Number(e.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-zinc-800 accent-white"
                  />
                </div>
              </div>

              {/* Formula Attribution Note */}
              <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/60 p-3 text-[11px] font-mono text-zinc-400">
                Formula:{" "}
                <span className="text-zinc-200">
                  Readiness = 100 * &Sigma; min(c, r) - 1 / &Sigma; (r - 1)
                </span>{" "}
                · Zero LLM hallucinations
              </div>
            </div>

            {/* Right Column: Live Output & Match Result (5 Cols) */}
            <div className="flex flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 lg:col-span-5">
              <div>
                {/* Target Company Badge */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                      Target Placement Bar
                    </span>
                    <h4 className="font-heading text-lg font-bold text-white">
                      {selectedCompany.name}
                    </h4>
                  </div>
                  <span className="rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-white">
                    {selectedCompany.tier}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-3 text-xs text-zinc-400">
                  <span>
                    CTC: <strong className="text-emerald-400">{selectedCompany.ctc}</strong>
                  </span>
                  <span>·</span>
                  <span>{selectedCompany.category}</span>
                </div>

                {/* Big Score Visualizer */}
                <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Deterministic Readiness Score
                  </p>
                  <div className="mt-2 flex items-baseline justify-center gap-1 font-heading">
                    <span
                      className={`text-5xl font-black sm:text-6xl ${
                        readinessMetrics.score >= 85
                          ? "text-emerald-400"
                          : readinessMetrics.score >= 65
                            ? "text-amber-400"
                            : "text-zinc-300"
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
                  <p className="mt-2 text-xs text-zinc-400">{fitStatus.description}</p>
                </div>

                {/* Category Gap Breakdown List */}
                <div className="mt-5 space-y-2">
                  {readinessMetrics.pairs.map((p) => {
                    const diff = p.c - p.r;
                    return (
                      <div
                        key={p.name}
                        className="flex items-center justify-between text-xs py-1 border-b border-zinc-800/50"
                      >
                        <span className="text-zinc-300">{p.name}</span>
                        <span
                          className={`font-mono font-medium ${
                            diff >= 0 ? "text-emerald-400" : "text-amber-400"
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
              <div className="mt-6 pt-4 border-t border-zinc-800 space-y-2">
                <Link to="/talent-check" className="block w-full">
                  <Button className="w-full bg-white text-zinc-950 font-semibold hover:bg-zinc-200">
                    <Sparkles className="mr-1.5 h-4 w-4 text-amber-500" />
                    Open Full Talent Check Console
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/companies" className="block w-full">
                  <Button
                    variant="ghost"
                    className="w-full text-xs text-zinc-400 hover:text-white hover:bg-zinc-800/40"
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
