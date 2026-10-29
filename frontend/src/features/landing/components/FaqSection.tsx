import React, { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    question: "Why deterministic mathematics instead of direct LLM percentage scoring?",
    answer:
      "Generative LLMs suffer from prompt drift and hallucination — evaluating the same resume twice often produces inconsistent scores. PlaceIntel decouples probabilistic evidence extraction from mathematical grading. Frontier LLMs identify textual evidence with strict character-span boundaries, while the final talent scores are computed via pure deterministic formulas (100 * Σ(min(c, r) - 1) / Σ(r - 1)) in under 1ms.",
  },
  {
    question: "What prevents candidates from keyword-stuffing resumes to inflate their scores?",
    answer:
      "Every skill claimed must carry an authentic textual quote (`evidence`) and exact start/end character offsets (`evidence_span`). Furthermore, raw keyword mentions only award Bloom Level 1–2 (Conceptual Understanding). Attaining Level 5+ (Analysis & Synthesis) demands documented evidence of multi-month projects, production deployments, or verified internship outcomes.",
  },
  {
    question: "How does the 5-tier cascade achieve <280ms turnaround latency?",
    answer:
      "Like an airport biometric e-gate, over 95% of queries resolve instantaneously through L1 SHA-256 document deduplication (2ms), L2 in-memory corporate bar caching (3ms), and L3 exact/alias taxonomy dictionaries (1ms). Ambiguous terminology is escalated to L4 pgvector semantic search (35ms), and only true novel terminology triggers L5 LLM structured adjudication (350ms).",
  },
  {
    question: "How does the air-gapped seed fallback safeguard campus placement drives?",
    answer:
      "Campus recruitment drives frequently encounter high network contention or intermittent Wi-Fi. The Express 5 backend queries Supabase PostgreSQL by default, but automatically falls back to bundled seed snapshots if the database connection drops, guaranteeing 100% demo and audit reliability.",
  },
  {
    question: "How are the 115 corporate hiring bars and 12 skill categories established?",
    answer:
      "The benchmarks represent historical placement records from JSS Academy of Technical Education (JSSATEN), standardizing 1,380 corporate skill levels across 12 core domains (Algorithms, System Architecture, Databases, Cloud & DevOps, Core CS, and Specialized Tech) across Super Dream, Dream, Standard, and Regular tiers.",
  },
];

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="relative scroll-mt-20 py-16 md:py-24 border-t border-border">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3.5 py-1 text-xs font-semibold text-orange-600 dark:text-orange-400">
            <HelpCircle className="h-3.5 w-3.5 text-orange-500" />
            Architecture & Evaluation
          </div>
          <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Essential architectural principles and evaluation defenses for students, evaluators, and
            placement officers.
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="mt-12 space-y-3.5">
          {FAQS.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={i}
                className="overflow-hidden rounded-2xl border border-border bg-card dark:border-zinc-800 dark:bg-[#0d0d12] transition-all duration-200 hover:border-primary/40 shadow-xs"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="flex w-full items-center justify-between p-5 text-left text-sm font-semibold text-foreground focus:outline-none cursor-pointer"
                >
                  <span className="pr-4">{faq.question}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-primary transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-primary" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-border dark:border-zinc-800/80 bg-muted/40 dark:bg-zinc-900/40 px-5 py-4 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
