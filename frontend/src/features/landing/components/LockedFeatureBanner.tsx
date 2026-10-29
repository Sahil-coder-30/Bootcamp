import React from "react";
import { Link } from "@tanstack/react-router";
import {
  Lock,
  Unlock,
  ShieldCheck,
  Building2,
  GraduationCap,
  Sparkles,
  ArrowRight,
  UserCheck,
  CheckCircle2,
  Layers,
  LayoutDashboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CandidateUser } from "./AuthModal";

interface LockedFeatureBannerProps {
  currentUser: CandidateUser | null;
  onOpenAuth: () => void;
}

export const LockedFeatureBanner: React.FC<LockedFeatureBannerProps> = ({
  currentUser,
  onOpenAuth,
}) => {
  return (
    <section className="relative scroll-mt-20 py-12 md:py-16 border-t border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {currentUser ? (
          /* LOGGED IN: Full Access Banner */
          <div className="relative overflow-hidden rounded-3xl border border-border dark:border-orange-500/40 bg-gradient-to-b from-card via-card to-card-sub dark:from-[#0e0e14] dark:to-[#08080a] p-7 sm:p-9 shadow-md dark:shadow-[0_0_40px_rgba(249,115,22,0.12)]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border dark:border-zinc-800 pb-6">
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white dark:text-zinc-950 font-mono font-bold text-sm shadow-xs">
                  {currentUser.avatarText}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                      Full Intelligence Access Unlocked
                    </span>
                  </div>
                  <h3 className="font-heading text-lg sm:text-xl font-bold text-foreground mt-0.5">
                    Welcome back, {currentUser.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {currentUser.role} &bull; {currentUser.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link to="/dashboard">
                  <Button className="h-9 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white text-xs font-bold hover:brightness-110 shadow-sm cursor-pointer">
                    <LayoutDashboard className="mr-1.5 h-3.5 w-3.5" />
                    Open Dashboard
                  </Button>
                </Link>
                <Link to="/companies">
                  <Button
                    variant="outline"
                    className="h-9 rounded-xl border-border bg-card text-xs font-semibold text-foreground hover:bg-muted"
                  >
                    <Building2 className="mr-1.5 h-3.5 w-3.5 text-primary" />
                    All 115 Companies
                  </Button>
                </Link>
              </div>
            </div>

            {/* Quick Unlocked Feature Access Grid */}
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs">
              <Link
                to="/companies"
                className="group rounded-2xl border border-border bg-card-sub dark:border-zinc-800/80 dark:bg-zinc-900/40 p-4 transition-all hover:border-primary/50 dark:hover:border-orange-500/50 hover:bg-muted dark:hover:bg-zinc-900/80"
              >
                <div className="flex items-center justify-between text-muted-foreground group-hover:text-primary">
                  <Building2 className="h-4 w-4" />
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </div>
                <h4 className="mt-3 font-bold text-foreground text-sm">115 Corporate Profiles</h4>
                <p className="mt-1 text-muted-foreground text-[11px]">
                  Selection workflows, test platforms & compensation breakdowns.
                </p>
              </Link>

              <Link
                to="/talent-check"
                className="group rounded-2xl border border-border bg-card-sub dark:border-zinc-800/80 dark:bg-zinc-900/40 p-4 transition-all hover:border-primary/50 dark:hover:border-orange-500/50 hover:bg-muted dark:hover:bg-zinc-900/80"
              >
                <div className="flex items-center justify-between text-muted-foreground group-hover:text-primary">
                  <UserCheck className="h-4 w-4" />
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </div>
                <h4 className="mt-3 font-bold text-foreground text-sm">Talent Check Simulator</h4>
                <p className="mt-1 text-muted-foreground text-[11px]">
                  Instant what-if readiness scoring against individual employer bars.
                </p>
              </Link>

              <Link
                to="/company/skills"
                className="group rounded-2xl border border-border bg-card-sub dark:border-zinc-800/80 dark:bg-zinc-900/40 p-4 transition-all hover:border-primary/50 dark:hover:border-orange-500/50 hover:bg-muted dark:hover:bg-zinc-900/80"
              >
                <div className="flex items-center justify-between text-muted-foreground group-hover:text-primary">
                  <GraduationCap className="h-4 w-4" />
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </div>
                <h4 className="mt-3 font-bold text-foreground text-sm">12 Bloom Skill Ladders</h4>
                <p className="mt-1 text-muted-foreground text-[11px]">
                  10-level normalized topic progressions directly linking to cutoffs.
                </p>
              </Link>
            </div>
          </div>
        ) : (
          /* LOGGED OUT: Crisp, Professional Teaser Banner */
          <div className="relative overflow-hidden rounded-3xl border border-border dark:border-zinc-800 bg-card dark:bg-[#0c0c10] p-8 sm:p-10 shadow-lg dark:shadow-2xl backdrop-blur-xl">
            {/* Ambient orange glow */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 h-48 w-48 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-center">
              {/* Left Column: Text copy (7 cols) */}
              <div className="space-y-4 lg:col-span-7">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-600 dark:text-orange-400">
                  <Lock className="h-3.5 w-3.5" />
                  Exclusive Candidate & Placement Intelligence
                </div>

                <h3 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                  Unlock 115 Corporate Hiring Bars & Live Skill Gap Ladders
                </h3>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  Sign in or select a demo candidate profile to unlock the full corporate placement
                  directory, 10-level Bloom skill ladders, and automated resume gap scoring.
                </p>

                <div className="space-y-2 text-xs text-foreground/90 pt-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-orange-500 dark:text-orange-400 shrink-0" />
                    <span>
                      Round-by-round interview stages & test formats across 115 recruiters
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-orange-500 dark:text-orange-400 shrink-0" />
                    <span>Interactive 12-skill radar benchmarks & topic gap analysis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-orange-500 dark:text-orange-400 shrink-0" />
                    <span>Instant candidate what-if readiness simulation with 0% drift</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Link to="/login" search={{ redirect: "/dashboard" }}>
                    <Button className="h-10 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-bold text-xs shadow-md hover:brightness-110 transition-all cursor-pointer">
                      <Unlock className="mr-2 h-4 w-4 text-white" />
                      Sign In with Google or Demo Candidate to Access
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Right Column: Sleek Preview Card (5 cols) */}
              <div className="rounded-2xl border border-border bg-card-sub dark:border-zinc-800/80 dark:bg-zinc-950/80 p-5 shadow-xs lg:col-span-5 relative">
                <div className="flex items-center justify-between border-b border-border dark:border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-orange-500" />
                    <span className="font-bold text-xs text-foreground">
                      Placement Console Preview
                    </span>
                  </div>
                  <span className="rounded-md border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-[10px] font-semibold text-orange-600 dark:text-orange-400">
                    Sign In to Access
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="rounded-xl border border-border bg-card dark:border-zinc-800 dark:bg-zinc-900/60 p-3 shadow-2xs">
                    <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                      <span>Google &bull; Software Engineer</span>
                      <span className="text-orange-600 dark:text-orange-400 font-mono">
                        L8 / 10 Cutoff
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-muted dark:bg-zinc-800 overflow-hidden">
                      <div className="h-full w-[80%] bg-orange-500" />
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-card dark:border-zinc-800 dark:bg-zinc-900/60 p-3 shadow-2xs">
                    <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                      <span>Amazon &bull; SDE-1 Cloud</span>
                      <span className="text-orange-600 dark:text-orange-400 font-mono">
                        L7 / 10 Cutoff
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-muted dark:bg-zinc-800 overflow-hidden">
                      <div className="h-full w-[70%] bg-orange-500" />
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-card dark:border-zinc-800 dark:bg-zinc-900/60 p-3 shadow-2xs">
                    <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                      <span>Microsoft &bull; Systems Engineer</span>
                      <span className="text-orange-600 dark:text-orange-400 font-mono">
                        L8 / 10 Cutoff
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-muted dark:bg-zinc-800 overflow-hidden">
                      <div className="h-full w-[78%] bg-orange-500" />
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-center">
                  <p className="text-[11px] text-muted-foreground font-medium">
                    + 112 more verified company hiring profiles
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
