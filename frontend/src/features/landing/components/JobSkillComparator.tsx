import React, { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  Briefcase,
  Building2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  MapPin,
  Clock,
  Layers,
  ChevronRight,
  Sliders,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CandidateUser } from "./AuthModal";

interface JobPosting {
  id: number;
  companyName: string;
  roleTitle: string;
  tier: "Super Dream" | "Dream";
  salary: string;
  locations: string;
  batch: string;
  tags: string[];
  roundsSummary: string;
  requiredSkills: {
    dsa: number;
    sysArch: number;
    cloud: number;
    coreCs: number;
  };
  recommendedTopic: string;
}

const JOBS: JobPosting[] = [
  {
    id: 4,
    companyName: "Google LLC",
    roleTitle: "Software Development Engineer (Campus)",
    tier: "Super Dream",
    salary: "₹32 – 45 LPA",
    locations: "Bengaluru · Hyderabad",
    batch: "2026 Batch",
    tags: ["DSA Level 8", "Distributed Systems", "Clean Coding"],
    roundsSummary: "Online Assessment (2 Hard) &rarr; 3 Technical Interviews &rarr; Googlyness",
    requiredSkills: { dsa: 8, sysArch: 8, cloud: 7, coreCs: 8 },
    recommendedTopic: "Dynamic Programming on Trees & Advanced Graphs",
  },
  {
    id: 78,
    companyName: "Microsoft Corporation",
    roleTitle: "Cloud & Systems Software Engineer",
    tier: "Super Dream",
    salary: "₹28 – 44 LPA",
    locations: "Noida · Hyderabad · Bengaluru",
    batch: "2026 Batch",
    tags: ["Azure Cloud", "OS Internals", "C++ / C#"],
    roundsSummary: "Codility Test (3 Problems) &rarr; System Architecture Round &rarr; AA Round",
    requiredSkills: { dsa: 8, sysArch: 7, cloud: 8, coreCs: 8 },
    recommendedTopic: "Concurrency Models & Multi-threaded Mutex Synchronization",
  },
  {
    id: 2,
    companyName: "Amazon AWS",
    roleTitle: "Software Development Engineer I (SDE-1)",
    tier: "Super Dream",
    salary: "₹28 – 42 LPA",
    locations: "Bengaluru · Gurugram",
    batch: "2026 Batch",
    tags: ["Distributed Systems", "Object Oriented Design", "AWS"],
    roundsSummary: "HackerRank OA &rarr; 2 DSA Rounds &rarr; System Design & Leadership Principles",
    requiredSkills: { dsa: 8, sysArch: 7, cloud: 7, coreCs: 7 },
    recommendedTopic: "Microservices Resiliency Patterns (Circuit Breakers & Retries)",
  },
  {
    id: 15,
    companyName: "Goldman Sachs",
    roleTitle: "Engineering Analyst (Quantitative Systems)",
    tier: "Super Dream",
    salary: "₹24 – 32 LPA",
    locations: "Bengaluru",
    batch: "2026 Batch",
    tags: ["High Throughput", "SQL & DBMS", "Algorithms"],
    roundsSummary: "Aptitude + Math + 2 Coding &rarr; 2 Algorithmic Rounds &rarr; Tech-HR",
    requiredSkills: { dsa: 8, sysArch: 7, cloud: 6, coreCs: 8 },
    recommendedTopic: "Database Indexing Structures (B+ Trees & LSM Trees)",
  },
  {
    id: 19,
    companyName: "Adobe Systems",
    roleTitle: "Member of Technical Staff 1 (MTS-1)",
    tier: "Super Dream",
    salary: "₹25 – 40 LPA",
    locations: "Noida · Bengaluru",
    batch: "2026 Batch",
    tags: ["Graphics / WebAssembly", "DSA Level 8", "Modern C++"],
    roundsSummary: "HackerEarth Challenge &rarr; 3 Technical Rounds &rarr; Director Fitment",
    requiredSkills: { dsa: 8, sysArch: 7, cloud: 6, coreCs: 7 },
    recommendedTopic: "Memory Management & Cache Locality Optimization",
  },
  {
    id: 21,
    companyName: "Cisco Systems",
    roleTitle: "Network Software Engineer",
    tier: "Dream",
    salary: "₹15 – 20 LPA",
    locations: "Bengaluru",
    batch: "2026 Batch",
    tags: ["Computer Networks", "TCP/IP Socket API", "Python / C"],
    roundsSummary: "Online Coding + 20 Networking MCQs &rarr; 2 System Rounds &rarr; ETR HR",
    requiredSkills: { dsa: 7, sysArch: 6, cloud: 7, coreCs: 7 },
    recommendedTopic: "TCP Flow Control, Sliding Window & Subnetting Mechanics",
  },
];

interface JobSkillComparatorProps {
  currentUser: CandidateUser | null;
  onOpenAuth: () => void;
}

export const JobSkillComparator: React.FC<JobSkillComparatorProps> = ({
  currentUser,
  onOpenAuth,
}) => {
  const [selectedJob, setSelectedJob] = useState<JobPosting>(JOBS[0]!);

  // Default candidate proficiencies (editable via slider or loaded from profile)
  const [candidateSkills, setCandidateSkills] = useState({
    dsa: 7,
    sysArch: 6,
    cloud: 7,
    coreCs: 7,
  });

  // Calculate Deterministic Readiness Score: 100 * sum(min(c, r) - 1) / sum(r - 1)
  const comparison = useMemo(() => {
    const list = [
      {
        name: "Data Structures & Algorithms",
        candidate: candidateSkills.dsa,
        required: selectedJob.requiredSkills.dsa,
        weight: "Crucial for OA Round",
      },
      {
        name: "System Architecture & Design",
        candidate: candidateSkills.sysArch,
        required: selectedJob.requiredSkills.sysArch,
        weight: "Crucial for Round 2",
      },
      {
        name: "Cloud & Infrastructure",
        candidate: candidateSkills.cloud,
        required: selectedJob.requiredSkills.cloud,
        weight: "Key Differentiation",
      },
      {
        name: "Core CS (OS, DBMS, Networks)",
        candidate: candidateSkills.coreCs,
        required: selectedJob.requiredSkills.coreCs,
        weight: "Core Screening",
      },
    ];

    const numerator = list.reduce(
      (acc, item) => acc + (Math.min(item.candidate, item.required) - 1),
      0,
    );
    const denominator = list.reduce((acc, item) => acc + (item.required - 1), 0);
    const score = denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;

    return {
      score: Math.min(100, Math.max(0, score)),
      list,
    };
  }, [candidateSkills, selectedJob]);

  const fitBadge = useMemo(() => {
    if (comparison.score >= 85) {
      return {
        text: "Strong Fit · Ready for Day 1 Hiring Bar",
        badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
        message: "You comfortably meet the technical cutoff for the online coding and core rounds.",
      };
    }
    if (comparison.score >= 70) {
      return {
        text: "1-Level Gap Detected · High Potential",
        badge: "bg-orange-500/10 text-orange-400 border-orange-500/30",
        message: "A single focused topic review will boost you into the top 10% shortlist bracket.",
      };
    }
    return {
      text: "Foundational Gap · Structured Ladder Required",
      badge: "bg-zinc-800 text-zinc-300 border-zinc-700",
      message: "Recommend completing targeted Bloom Level 5 prerequisite assignments.",
    };
  }, [comparison.score]);

  return (
    <section
      id="comparator"
      className="relative scroll-mt-20 py-16 md:py-24 border-t border-zinc-800/80"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section Heading */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3.5 py-1 text-xs font-semibold text-orange-400">
            <Sparkles className="h-3.5 w-3.5 text-orange-400" />
            Live Candidate vs. Employer Benchmarking
          </div>
          <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            Compare Your Skills Against Active Roles
          </h2>
          <p className="mt-3 text-sm text-zinc-400 sm:text-base">
            Select a verified corporate opening to benchmark your Bloom proficiency levels
            side-by-side with the employer's official campus cutoff.
          </p>
        </div>

        {/* Dual-Column Job Board & Skill Matcher Grid */}
        <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* LEFT COLUMN: Curated Active Job Openings (5 cols) */}
          <div className="space-y-3.5 lg:col-span-5">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Verified Recruiter Openings ({JOBS.length})
              </span>
              <Link
                to="/companies"
                className="text-xs font-semibold text-orange-400 hover:text-orange-300 transition-colors"
              >
                View all 115 companies &rarr;
              </Link>
            </div>

            <div className="space-y-3">
              {JOBS.map((job) => {
                const isSelected = selectedJob.id === job.id;
                return (
                  <div
                    key={job.id}
                    onClick={() => setSelectedJob(job)}
                    className={`group relative cursor-pointer rounded-2xl border p-4.5 transition-all ${
                      isSelected
                        ? "border-orange-500 bg-gradient-to-r from-orange-500/10 to-transparent shadow-lg text-white"
                        : "border-zinc-800/80 bg-zinc-950/70 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-heading text-sm font-bold text-white group-hover:text-orange-400 transition-colors">
                            {job.companyName}
                          </h4>
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                              job.tier === "Super Dream"
                                ? "bg-orange-500/15 text-orange-400 border border-orange-500/30"
                                : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            }`}
                          >
                            {job.tier}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs font-medium text-zinc-300">{job.roleTitle}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-heading font-extrabold text-sm text-orange-400">
                          {job.salary}
                        </span>
                        <p className="text-[10px] text-zinc-500">{job.batch}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {job.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md border border-zinc-800 bg-zinc-900/80 px-2 py-0.5 text-[10px] font-medium text-zinc-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="mt-3.5 flex items-center justify-between border-t border-zinc-800/60 pt-2.5 text-[11px] text-zinc-400">
                      <span className="flex items-center gap-1 text-zinc-400">
                        <MapPin className="h-3 w-3 text-zinc-500" />
                        {job.locations}
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-orange-400 group-hover:translate-x-0.5 transition-transform">
                        Compare Fit
                        <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT COLUMN: Live Skill Match & Gap Analyzer (7 cols) */}
          <div className="flex flex-col justify-between rounded-3xl border border-zinc-800 bg-[#0d0d12] p-6 sm:p-8 shadow-2xl backdrop-blur-xl lg:col-span-7">
            <div>
              {/* Header with Candidate Profile Switcher */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-800 pb-5">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-orange-400">
                    Live Skill Gap Analysis
                  </span>
                  <h3 className="font-heading text-xl font-bold text-white sm:text-2xl mt-0.5">
                    {selectedJob.companyName} &bull; {selectedJob.roleTitle}
                  </h3>
                </div>

                {/* Profile Pill */}
                <div className="flex items-center gap-2">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span>
                      Profile: <strong>{currentUser ? currentUser.name : "Ananya Rao"}</strong>
                    </span>
                  </div>
                  {!currentUser && (
                    <button
                      onClick={onOpenAuth}
                      className="text-[11px] font-semibold text-orange-400 hover:underline cursor-pointer"
                    >
                      Switch &rarr;
                    </button>
                  )}
                </div>
              </div>

              {/* Match Gauge Card */}
              <div className="mt-6 rounded-2xl border border-orange-500/20 bg-gradient-to-r from-orange-500/10 via-zinc-900/60 to-zinc-900/60 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      Deterministic Readiness Score
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="font-heading text-4xl sm:text-5xl font-black text-white">
                        {comparison.score}%
                      </span>
                      <span className="text-xs text-zinc-400">Match against hiring bar</span>
                    </div>
                  </div>

                  <div className="sm:text-right">
                    <span
                      className={`inline-block rounded-full border px-3 py-1 text-xs font-semibold ${fitBadge.badge}`}
                    >
                      {fitBadge.text}
                    </span>
                    <p className="mt-1.5 text-xs text-zinc-400 max-w-xs">{fitBadge.message}</p>
                  </div>
                </div>
              </div>

              {/* Side-by-Side Competencies List */}
              <div className="mt-7 space-y-4">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-800/80 pb-2">
                  <span>Technical Competency</span>
                  <span>Candidate vs. Cutoff</span>
                </div>

                {comparison.list.map((item) => {
                  const diff = item.candidate - item.required;
                  const isMet = diff >= 0;
                  return (
                    <div
                      key={item.name}
                      className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3.5 transition-colors hover:border-zinc-700"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-white">{item.name}</p>
                          <p className="text-[11px] text-zinc-400">{item.weight}</p>
                        </div>

                        <div className="text-right">
                          <span
                            className={`font-mono font-bold text-xs ${
                              isMet ? "text-emerald-400" : "text-orange-400"
                            }`}
                          >
                            L{item.candidate} / Cutoff L{item.required}
                          </span>
                          <p
                            className={`text-[10px] font-semibold ${
                              isMet ? "text-emerald-400" : "text-orange-400"
                            }`}
                          >
                            {isMet ? "Cutoff Met" : `${Math.abs(diff)} Level Gap`}
                          </p>
                        </div>
                      </div>

                      {/* Visual Bar Comparison */}
                      <div className="mt-2.5 flex items-center gap-3">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isMet ? "bg-emerald-400" : "bg-orange-500"
                            }`}
                            style={{
                              width: `${Math.min(100, (item.candidate / item.required) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Recommended Topic to Unlock Next Tier */}
              <div className="mt-6 rounded-2xl border border-orange-500/30 bg-orange-500/5 p-4 text-xs">
                <div className="flex items-start gap-2.5">
                  <Sparkles className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-orange-300">
                      Targeted Recommendation to Reach 100% Fit:
                    </span>
                    <p className="mt-1 text-zinc-300">
                      Master Bloom Level {selectedJob.requiredSkills.dsa} Topic:{" "}
                      <strong className="text-white">{selectedJob.recommendedTopic}</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-8 pt-5 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <Link to="/talent-check" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto h-10 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 font-bold hover:brightness-110 shadow-[0_0_20px_rgba(249,115,22,0.25)] transition-all cursor-pointer">
                  Launch Interactive Talent Check
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </Link>

              <Link
                to="/company/intelligence"
                className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors text-center sm:text-right"
              >
                View Selection Process &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
