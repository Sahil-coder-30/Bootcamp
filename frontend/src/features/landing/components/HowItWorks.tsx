import React from "react";
import { Link } from "@tanstack/react-router";
import {
  UserCheck,
  Zap,
  TrendingUp,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Layers,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    step: "01",
    title: "Build Your Technical Profile",
    subtitle: "Resume Upload or Instant Sliders",
    description:
      "Upload your PDF resume for verifiable text citation extraction or set your 12 core competencies across DSA, System Design, Cloud, and Core CS.",
    badge: "Bloom Scale 1–10",
  },
  {
    step: "02",
    title: "Instant 115-Company Gap Match",
    subtitle: "Deterministic Mathematical Engine",
    description:
      "Our 5-tier cascade checks your profile against 115 live corporate cutoffs in under 280ms. Zero LLM hallucinations, 100% reproducible gap scoring.",
    badge: "<280ms Latency",
  },
  {
    step: "03",
    title: "Master High-Yield Topic Ladders",
    subtitle: "Curriculum to Corporate Alignment",
    description:
      "Target the exact Bloom topics required to unlock higher salary tiers (Super Dream > ₹10 LPA) and enter interviews with documented readiness.",
    badge: "1,380 Topic Ladders",
  },
];

interface HowItWorksProps {
  onOpenRegister: () => void;
}

export const HowItWorks: React.FC<HowItWorksProps> = ({ onOpenRegister }) => {
  return (
    <section
      id="how-it-works"
      className="relative scroll-mt-20 py-16 md:py-24 border-t border-zinc-800/80"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-400">
            <Zap className="h-3.5 w-3.5 text-orange-400" />
            Simple 3-Step Workflow
          </div>
          <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            How Candidates Compare & Get Placed
          </h2>
          <p className="mt-3 text-sm text-zinc-400 sm:text-base">
            Replace subjective guesswork with an auditable mathematical pipeline designed for
            high-volume campus recruitment.
          </p>
        </div>

        {/* 3 Step Cards */}
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {STEPS.map((s, idx) => (
            <div
              key={s.step}
              className="group relative flex flex-col justify-between rounded-3xl border border-zinc-800 bg-[#0d0d12] p-7 transition-all duration-300 hover:border-orange-500/50 hover:bg-zinc-900/60 shadow-xl"
            >
              <div>
                {/* Step Number with Warm Gradient */}
                <div className="flex items-center justify-between">
                  <span className="font-heading text-3xl font-black bg-gradient-to-br from-orange-400 to-amber-500 bg-clip-text text-transparent">
                    {s.step}
                  </span>
                  <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-orange-400">
                    {s.badge}
                  </span>
                </div>

                <div className="mt-6">
                  <h3 className="font-heading text-lg font-bold text-white group-hover:text-orange-400 transition-colors">
                    {s.title}
                  </h3>
                  <p className="mt-1 text-xs font-medium text-orange-400/90">{s.subtitle}</p>
                  <p className="mt-3 text-xs text-zinc-400 leading-relaxed">{s.description}</p>
                </div>
              </div>

              {idx === 0 ? (
                <div className="mt-6 pt-4 border-t border-zinc-800">
                  <button
                    onClick={onOpenRegister}
                    className="inline-flex items-center text-xs font-bold text-orange-400 hover:text-orange-300 cursor-pointer"
                  >
                    Build Candidate Profile &rarr;
                  </button>
                </div>
              ) : idx === 1 ? (
                <div className="mt-6 pt-4 border-t border-zinc-800">
                  <Link
                    to="/talent-check"
                    className="inline-flex items-center text-xs font-bold text-orange-400 hover:text-orange-300"
                  >
                    Explore Talent Check Console &rarr;
                  </Link>
                </div>
              ) : (
                <div className="mt-6 pt-4 border-t border-zinc-800">
                  <Link
                    to="/company/skills"
                    className="inline-flex items-center text-xs font-bold text-orange-400 hover:text-orange-300"
                  >
                    Inspect 10-Level Topic Ladders &rarr;
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
