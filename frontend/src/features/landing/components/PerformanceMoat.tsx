import React from "react";
import {
  Zap,
  TrendingDown,
  DollarSign,
  ShieldAlert,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";

export const PerformanceMoat: React.FC = () => {
  return (
    <section
      id="performance"
      className="relative scroll-mt-20 py-16 md:py-24 border-t border-zinc-800/80"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3.5 py-1 text-xs font-semibold text-orange-400">
            <TrendingDown className="h-3.5 w-3.5 text-orange-400" />
            97.4% Latency Reduction · 95.1% Cost Savings
          </div>
          <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            The Performance & Reliability Moat
          </h2>
          <p className="mt-3 text-sm text-zinc-400 sm:text-base">
            Why traditional generative LLM screening fails at campus scale, and how our
            deterministic cascade delivers sub-second, enterprise-grade validation.
          </p>
        </div>

        {/* 2-Column Comparison Cards */}
        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Card A: Traditional LLM Pipeline */}
          <div className="rounded-3xl border border-rose-950/40 bg-zinc-950/60 p-7 shadow-lg">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="h-5 w-5 text-rose-400" />
                <h3 className="font-heading text-lg font-bold text-zinc-200">
                  Traditional Generative LLM Stack
                </h3>
              </div>
              <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-0.5 text-xs font-medium text-rose-400">
                Stochastic & Expensive
              </span>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/20 p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">End-to-End Latency:</span>
                  <span className="font-mono font-bold text-rose-400 text-sm">~12,500 ms</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                  <div className="h-full w-full bg-rose-500/70" />
                </div>
                <p className="mt-2 text-[11px] text-zinc-500">
                  Document OCR + Uncached Cloud LLM extraction + prompt grading. Unusable for
                  interactive UI.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/20 p-3">
                  <span className="text-zinc-500">Cost per 1,000 evals:</span>
                  <p className="mt-1 font-mono font-bold text-rose-300 text-base">$65.00</p>
                  <p className="text-[10px] text-zinc-500">Continuous cloud token burns</p>
                </div>
                <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/20 p-3">
                  <span className="text-zinc-500">Scoring Consistency:</span>
                  <p className="mt-1 font-mono font-bold text-rose-300 text-base">
                    Unpredictable Drift
                  </p>
                  <p className="text-[10px] text-zinc-500">Score fluctuates between runs</p>
                </div>
              </div>

              <div className="space-y-2 text-xs text-zinc-400">
                <div className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold">&times;</span>
                  <span>Hallucinates proficiencies without verifiable document proof.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold">&times;</span>
                  <span>
                    Database connection exhaustion during high-concurrency placement drives.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold">&times;</span>
                  <span>
                    Fails to explain exact mathematical gap between student and hiring bar.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card B: PlaceIntel Deterministic Platform */}
          <div className="relative overflow-hidden rounded-3xl border border-orange-500/40 bg-[#0d0d12] p-7 shadow-[0_0_40px_rgba(249,115,22,0.12)]">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 h-36 w-36 rounded-full bg-orange-500/10 blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-5 w-5 text-orange-400" />
                <h3 className="font-heading text-lg font-bold text-white">
                  PlaceIntel Deterministic Platform
                </h3>
              </div>
              <span className="rounded-full border border-orange-500/40 bg-orange-500/15 px-2.5 py-0.5 text-xs font-bold text-orange-400">
                &lt; 280ms Verified
              </span>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-orange-500/30 bg-zinc-900/60 p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-200 font-medium">End-to-End Latency:</span>
                  <span className="font-mono font-bold text-orange-400 text-sm">&lt; 280 ms</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                  <div className="h-full w-[4%] bg-gradient-to-r from-orange-500 to-amber-500 shadow-[0_0_8px_rgba(249,115,22,0.9)]" />
                </div>
                <p className="mt-2 text-[11px] text-orange-300 font-medium">
                  🚀 97.4% faster: SHA-256 cache + In-memory bar + Exact/Alias cascade + Pure math.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                  <span className="text-zinc-400">Cost per 1,000 evals:</span>
                  <p className="mt-1 font-mono font-bold text-orange-400 text-base">$3.16</p>
                  <p className="text-[10px] text-zinc-400">95.1% operational cost savings</p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                  <span className="text-zinc-400">Scoring Consistency:</span>
                  <p className="mt-1 font-mono font-bold text-white text-base">
                    0% Drift (100% Exact)
                  </p>
                  <p className="text-[10px] text-zinc-400">Bit-exact deterministic scoring</p>
                </div>
              </div>

              <div className="space-y-2 text-xs text-zinc-300">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
                  <span>
                    Strict citation gates: every skill requires source text evidence & spans.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
                  <span>
                    Stateless Python compute agent scales horizontally behind Express gateway.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
                  <span>
                    Interactive instant what-if simulation for individual student curriculum
                    planning.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step-by-Step Latency Breakdown Table */}
        <div className="mt-10 overflow-hidden rounded-2xl border border-zinc-800 bg-[#0d0d12]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-800 bg-zinc-900/80 font-semibold text-zinc-300">
                <tr>
                  <th className="py-3 px-4">Pipeline Component</th>
                  <th className="py-3 px-4">Traditional Uncached Path</th>
                  <th className="py-3 px-4">PlaceIntel Platform</th>
                  <th className="py-3 px-4 text-right">Performance Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono text-zinc-300">
                <tr>
                  <td className="py-3 px-4 font-sans text-zinc-200">
                    Document Ingestion & Deduplication
                  </td>
                  <td className="py-3 px-4 text-zinc-400">850 ms (Full Re-read)</td>
                  <td className="py-3 px-4 text-orange-400 font-bold">2 ms (SHA-256 Cache Hit)</td>
                  <td className="py-3 px-4 text-right text-orange-400 font-bold">99.7% Faster</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-sans text-zinc-200">
                    Corporate Benchmark Retrieval
                  </td>
                  <td className="py-3 px-4 text-zinc-400">220 ms (Multi-Join SQL)</td>
                  <td className="py-3 px-4 text-orange-400 font-bold">
                    3 ms (Local Memory / View)
                  </td>
                  <td className="py-3 px-4 text-right text-orange-400 font-bold">98.6% Faster</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-sans text-zinc-200">
                    Skill Extraction & Normalization
                  </td>
                  <td className="py-3 px-4 text-zinc-400">8,500 ms (Cloud LLM API)</td>
                  <td className="py-3 px-4 text-orange-400 font-bold">
                    12 ms (Exact / Alias Match)
                  </td>
                  <td className="py-3 px-4 text-right text-orange-400 font-bold">99.8% Faster</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-sans text-zinc-200">
                    Candidate Gap & Talent Scoring
                  </td>
                  <td className="py-3 px-4 text-zinc-400">1,200 ms (LLM Prompting)</td>
                  <td className="py-3 px-4 text-orange-400 font-bold">
                    &lt; 1 ms (Deterministic Formula)
                  </td>
                  <td className="py-3 px-4 text-right text-orange-400 font-bold">99.9% Faster</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};
