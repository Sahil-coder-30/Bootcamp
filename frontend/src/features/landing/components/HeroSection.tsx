import React from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, ShieldCheck, User, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const RECRUITER_BRANDS = [
  "Google",
  "Microsoft",
  "Amazon AWS",
  "Goldman Sachs",
  "Adobe",
  "Cisco Systems",
  "Oracle",
  "Deloitte",
];

interface HeroSectionProps {
  onOpenRegister: () => void;
  onOpenLogin: () => void;
  isLoggedIn: boolean;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onOpenRegister,
  onOpenLogin,
  isLoggedIn,
}) => {
  return (
    <section className="relative overflow-hidden pt-14 pb-16 md:pt-22 md:pb-22">
      {/* Warm Ambient Atmosphere & Glow Halo */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <div className="h-[400px] w-[700px] rounded-full bg-gradient-to-tr from-orange-500/10 via-primary/10 to-transparent blur-3xl dark:from-orange-600/15 dark:via-amber-500/10" />
        <div className="absolute top-0 h-96 w-full bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(79,70,229,0.08),transparent_75%)] dark:bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(249,115,22,0.12),transparent_75%)]" />
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-center text-center">
          {/* Top Pill Tag */}
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3.5 py-1 text-xs text-orange-600 dark:text-orange-300 shadow-xs backdrop-blur-md">
            <span className="flex h-2 w-2 rounded-full bg-orange-500 shadow-xs" />
            <span className="font-bold uppercase tracking-wider text-[10px] text-orange-700 dark:text-orange-200">
              Campus Placement Intelligence Platform
            </span>
            <span className="text-orange-500/60">·</span>
            <span className="text-muted-foreground font-mono text-[11px]">
              &lt;280ms Match Engine
            </span>
          </div>

          {/* Master Headline */}
          <h1 className="mt-7 max-w-4xl font-heading text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl md:text-6xl lg:leading-[1.12]">
            Where Campus Placement Meets{" "}
            <span className="bg-gradient-to-r from-orange-500 via-amber-500 to-primary bg-clip-text text-transparent dark:from-orange-400 dark:via-amber-300 dark:to-orange-500">
              Deterministic Skill Matching.
            </span>
          </h1>

          {/* Subheading */}
          <p className="mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg font-normal leading-relaxed">
            Benchmark candidate technical proficiencies directly against verified corporate hiring
            bars. Zero LLM hallucinations, auditable Bloom gap scoring, and sub-second evaluation.
          </p>

          {/* Clean Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto">
            {isLoggedIn ? (
              <>
                <Link to="/dashboard" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto h-11 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-7 text-xs font-bold text-white shadow-md hover:brightness-110 transition-all cursor-pointer"
                  >
                    Open Candidate Dashboard
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </Link>

                <Link to="/companies" className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto h-11 rounded-xl border-border bg-card px-6 text-xs font-semibold text-foreground hover:border-primary/50 hover:bg-muted"
                  >
                    <Sparkles className="mr-1.5 h-3.5 w-3.5 text-primary" />
                    Explore 115 Companies
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" search={{ redirect: "/dashboard" }} className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto h-11 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-7 text-xs font-bold text-white shadow-md hover:brightness-110 transition-all cursor-pointer"
                  >
                    <User className="mr-2 h-4 w-4 text-white" />
                    Sign In with Google & Access Dashboard
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </Link>

                <Link to="/companies" className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto h-11 rounded-xl border-border bg-card px-6 text-xs font-semibold text-foreground hover:border-primary/50 hover:bg-muted cursor-pointer"
                  >
                    <Sparkles className="mr-1.5 h-3.5 w-3.5 text-primary" />
                    Browse 115 Companies
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Compact Trust Marquee Strip */}
          <div className="mt-12 w-full max-w-3xl border-t border-border pt-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Corporate benchmarks calibrated for leading campus recruiters:
            </p>
            <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2">
              {RECRUITER_BRANDS.map((brand) => (
                <span
                  key={brand}
                  className="rounded-lg border border-border bg-muted/60 px-2.5 py-1 text-xs font-medium text-foreground"
                >
                  {brand}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
