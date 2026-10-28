import React, { useState } from "react";
import { Zap, CheckCircle2, Clock, Layers, ArrowRight } from "lucide-react";

interface CascadeTier {
  id: string;
  tierNumber: string;
  name: string;
  latency: string;
  mechanism: string;
  cacheTtl: string;
  description: string;
  example: string;
  badgeColor: string;
}

const TIERS: CascadeTier[] = [
  {
    id: "l1",
    tierNumber: "L1",
    name: "SHA-256 Storage & Deduplication Cache",
    latency: "~2ms",
    mechanism: "SHA-256 Digest Hash Lookup",
    cacheTtl: "Permanent / Content Addressed",
    description:
      "Prevents redundant extraction of identical JDs or candidate CVs. Repeated document checks resolve instantaneously without invocation costs.",
    example: "doc:sha256:e3b0c442... -> returns instant cached parsed profile JSON",
    badgeColor: "border-zinc-500/40 text-zinc-200 bg-zinc-800/60",
  },
  {
    id: "l2",
    tierNumber: "L2",
    name: "In-Memory Corporate Skill Bar Cache",
    latency: "~3ms",
    mechanism: "LRU In-Memory Structured View",
    cacheTtl: "24 Hours / Local Memory",
    description:
      "Fetches all 12 normalized skill cutoffs and Bloom levels across 115 companies without repetitive database roundtrips.",
    example: "company:bar:4 (Google) -> in-memory 12-category benchmark array",
    badgeColor: "border-zinc-500/40 text-zinc-200 bg-zinc-800/60",
  },
  {
    id: "l3",
    tierNumber: "L3",
    name: "Canonical Exact & Normalized Alias Cascade",
    latency: "~1ms",
    mechanism: "In-Memory Hash Map Resolution",
    cacheTtl: "Permanent Taxonomy Dictionary",
    description:
      "Resolves industry nomenclature, acronyms, and variations directly into standard canonical skills.",
    example: "'Postgres' / 'psql' -> 'PostgreSQL' | 'K8s' -> 'Kubernetes'",
    badgeColor: "border-orange-500/40 text-orange-400 bg-orange-500/10",
  },
  {
    id: "l4",
    tierNumber: "L4",
    name: "pgvector Semantic Cosine Search",
    latency: "~35ms",
    mechanism: "HNSW Vector Index Cosine Distance <=>",
    cacheTtl: "LRU / Disk Vectors",
    description:
      "Maps conceptual equivalents and related architectural paradigms using 768-dimensional vector embeddings.",
    example: "'Distributed Event Streaming' <=> 'Apache Kafka / RabbitMQ' (Cosine 0.89)",
    badgeColor: "border-amber-500/40 text-amber-300 bg-amber-500/10",
  },
  {
    id: "l5",
    tierNumber: "L5",
    name: "LLM Structured Adjudication Fallback",
    latency: "~350ms",
    mechanism: "Pydantic JSON Structured Inference",
    cacheTtl: "Document Scope Cached",
    description:
      "Only invoked for unfamiliar edge terminology. Evaluates evidence citations without hallucinating numerical scores.",
    example: "Classifies novel niche framework with textual quotes and character spans",
    badgeColor: "border-orange-500/40 text-orange-400 bg-orange-500/10",
  },
];

export const CascadeVisualizer: React.FC = () => {
  const [selectedTier, setSelectedTier] = useState<CascadeTier>(TIERS[2]!);

  return (
    <section
      id="cascade"
      className="relative scroll-mt-20 py-16 md:py-24 border-t border-zinc-800/80"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-400">
            <Zap className="h-3.5 w-3.5 text-orange-400" />
            Core Technology Moat
          </div>
          <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            The 5-Tier Talent Cascade
          </h2>
          <p className="mt-3 text-sm text-zinc-400 sm:text-base">
            Like an airport biometric e-gate: 95%+ of skills resolve in milliseconds through exact
            and alias fast-paths. Only ambiguous edge cases escalate to semantic vectors or LLMs.
          </p>
        </div>

        {/* Visual Cascade Stepper */}
        <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Stepper Buttons (5 cols) */}
          <div className="space-y-3 lg:col-span-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Interactive Pipeline Layers
            </p>
            {TIERS.map((tier) => {
              const isSelected = selectedTier.id === tier.id;
              return (
                <button
                  key={tier.id}
                  onClick={() => setSelectedTier(tier)}
                  className={`group flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                    isSelected
                      ? "border-orange-500 bg-orange-500/10 shadow-lg text-white"
                      : "border-zinc-800/80 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900/40 hover:text-zinc-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-xl border text-xs font-bold ${
                        isSelected
                          ? "border-orange-400 bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 font-bold"
                          : "border-zinc-800 bg-zinc-900 text-zinc-300"
                      }`}
                    >
                      {tier.tierNumber}
                    </span>
                    <div>
                      <p className="text-xs font-semibold leading-snug">{tier.name}</p>
                      <p className="text-[11px] text-zinc-500">{tier.mechanism}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono text-xs font-bold ${
                        tier.latency.includes("ms") &&
                        parseInt(tier.latency.replace(/\D/g, "")) <= 10
                          ? "text-orange-400"
                          : "text-zinc-400"
                      }`}
                    >
                      {tier.latency}
                    </span>
                    <ArrowRight
                      className={`h-4 w-4 transition-transform ${
                        isSelected ? "translate-x-1 text-orange-400" : "text-zinc-600"
                      }`}
                    />
                  </div>
                </button>
              );
            })}

            {/* Total Pipeline Footnote */}
            <div className="rounded-2xl border border-orange-500/30 bg-orange-500/5 p-4 text-xs text-zinc-300">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-orange-400">Total Turnaround Latency:</span>
                <span className="font-mono text-sm font-bold text-orange-400">&lt; 280ms</span>
              </div>
              <p className="mt-1 text-[11px] text-zinc-400">
                Slashes turn latency from 12.5s down to 280ms — a 97.4% speed improvement.
              </p>
            </div>
          </div>

          {/* Active Tier Deep-Dive Card (7 cols) */}
          <div className="flex flex-col justify-between rounded-3xl border border-zinc-800 bg-[#0d0d12] p-7 shadow-2xl backdrop-blur-xl lg:col-span-7">
            <div>
              <div className="flex items-center justify-between border-b border-zinc-800 pb-5">
                <div className="flex items-center gap-3">
                  <span className="rounded-xl border border-orange-500/30 bg-orange-500/15 px-3 py-1 font-mono text-xs font-bold text-orange-400">
                    {selectedTier.tierNumber}
                  </span>
                  <h3 className="font-heading text-lg font-bold text-white sm:text-xl">
                    {selectedTier.name}
                  </h3>
                </div>
                <span
                  className={`rounded-full border px-3 py-0.5 font-mono text-xs font-semibold ${selectedTier.badgeColor}`}
                >
                  Hit Latency: {selectedTier.latency}
                </span>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Architectural Responsibility
                  </h4>
                  <p className="mt-2 text-sm text-zinc-300 leading-relaxed">
                    {selectedTier.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-4 text-xs">
                  <div>
                    <span className="text-[11px] text-zinc-500 uppercase tracking-wider">
                      Underlying Mechanism
                    </span>
                    <p className="mt-1 font-semibold text-zinc-200">{selectedTier.mechanism}</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-zinc-500 uppercase tracking-wider">
                      Cache TTL / Storage
                    </span>
                    <p className="mt-1 font-semibold text-zinc-200">{selectedTier.cacheTtl}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Live Operational Example
                  </h4>
                  <div className="mt-2 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-orange-300">
                    <code>{selectedTier.example}</code>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Final Step */}
            <div className="mt-8 pt-5 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-zinc-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-orange-400" />
                Feeds into final deterministic formula with zero LLM scoring drift.
              </span>
              <span className="font-mono text-orange-400/80">Pure Math Computation: &lt;1ms</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
