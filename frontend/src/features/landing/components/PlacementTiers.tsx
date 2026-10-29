import React from "react";
import { Link } from "@tanstack/react-router";
import { Award, ArrowRight, TrendingUp, Building2, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TierInfo {
  tierName: "Super Dream" | "Dream" | "Standard" | "Regular";
  salaryRange: string;
  badgeClass: string;
  dotColor: string;
  accentBorder: string;
  rigorLevel: string;
  description: string;
  criteria: string[];
  sampleCompanies: string[];
}

const TIERS_DATA: TierInfo[] = [
  {
    tierName: "Super Dream",
    salaryRange: "₹10 – 55+ LPA",
    badgeClass:
      "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/40 shadow-xs",
    dotColor: "bg-orange-500 shadow-xs",
    accentBorder: "hover:border-orange-500/60",
    rigorLevel: "Bloom Level 7–9 (Evaluation & Synthesis)",
    description:
      "Global tech giants, fintech quantitative firms, and premier product engineering teams offering elite salary packages.",
    criteria: [
      "Rigorous 4-5 stage interview pipeline",
      "Advanced algorithmic optimization & dynamic programming",
      "Large-scale distributed systems architecture",
      "Strict CGPA and competitive coding cutoffs",
    ],
    sampleCompanies: ["Google", "Microsoft", "Amazon", "Adobe", "Goldman Sachs", "Morgan Stanley"],
  },
  {
    tierName: "Dream",
    salaryRange: "₹6.0 – 10.0 LPA",
    badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 shadow-xs",
    dotColor: "bg-amber-500 shadow-xs",
    accentBorder: "hover:border-amber-500/60",
    rigorLevel: "Bloom Level 5–7 (Analysis & Design)",
    description:
      "High-growth technology enterprises, specialized engineering consultancies, and established multinational tech leaders.",
    criteria: [
      "Comprehensive 3-stage selection process",
      "Hands-on object-oriented design & API architecture",
      "Cloud fundamentals and database indexing",
      "Practical project evaluation & debugging",
    ],
    sampleCompanies: ["Cisco Systems", "Oracle", "Samsung R&D", "Deloitte USI", "Zscaler", "NCR"],
  },
  {
    tierName: "Standard",
    salaryRange: "₹4.0 – 6.0 LPA",
    badgeClass:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 shadow-xs",
    dotColor: "bg-emerald-500 shadow-xs",
    accentBorder: "hover:border-emerald-500/40",
    rigorLevel: "Bloom Level 3–5 (Application & Coding)",
    description:
      "Scaled digital transformation leaders, technical solutions providers, and specialized technical developer tracks.",
    criteria: [
      "Online aptitude + coding assessment",
      "Technical interview on core CS foundations",
      "Data structures (Arrays, Trees, Graphs, HashMaps)",
      "Standard academic eligibility (60%+ / 6.5+ CGPA)",
    ],
    sampleCompanies: ["TCS Digital", "Cognizant GenC", "LTI Mindtree", "Capgemini", "Wipro Turbo"],
  },
  {
    tierName: "Regular",
    salaryRange: "Campus Foundation",
    badgeClass: "bg-muted text-foreground border-border shadow-xs",
    dotColor: "bg-muted-foreground",
    accentBorder: "hover:border-border-strong",
    rigorLevel: "Bloom Level 1–3 (Conceptual Understanding)",
    description:
      "Mass institutional placement drives recruiting for entry-level engineering and analyst positions.",
    criteria: [
      "Broad aptitude and fundamental coding exam",
      "Core programming proficiency (Java, Python, C++)",
      "General technical & HR interview rounds",
      "High-volume student recruitment cohorts",
    ],
    sampleCompanies: ["Accenture", "Infosys", "Tech Mahindra", "DXC Technology", "HCLTech"],
  },
];

export const PlacementTiers: React.FC = () => {
  return (
    <section id="tiers" className="relative scroll-mt-20 py-16 md:py-24 border-t border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-600 dark:text-orange-400">
            <Award className="h-3.5 w-3.5 text-orange-500" />
            Institutional Hiring Framework
          </div>
          <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Corporate Placement Tiers & Hiring Bars
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Every corporate recruiter at JSSATEN is mapped to an institutional compensation and
            technical difficulty tier, allowing students to systematically focus their preparation.
          </p>
        </div>

        {/* 4 Tier Cards Grid */}
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {TIERS_DATA.map((tier) => (
            <div
              key={tier.tierName}
              className={`group flex flex-col justify-between rounded-3xl border border-border bg-card dark:border-zinc-800 dark:bg-[#0d0d12] p-6 backdrop-blur-md transition-all duration-300 ${tier.accentBorder} hover:bg-card-sub dark:hover:bg-zinc-900/60 shadow-sm hover:shadow-xl`}
            >
              <div>
                {/* Top Badge & Dot */}
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tier.badgeClass}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${tier.dotColor}`} />
                    {tier.tierName}
                  </span>
                  <TrendingUp className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>

                {/* CTC Package Range */}
                <div className="mt-5">
                  <p className="font-heading text-xl font-bold text-foreground tracking-tight">
                    {tier.salaryRange}
                  </p>
                  <p className="mt-1 text-xs font-mono text-muted-foreground">{tier.rigorLevel}</p>
                </div>

                <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                  {tier.description}
                </p>

                {/* Criteria Checklist */}
                <div className="mt-5 space-y-2 border-t border-border pt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Hiring Standards:
                  </p>
                  {tier.criteria.map((c, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-foreground/90">
                      <CheckCircle2 className="h-3.5 w-3.5 text-orange-500 shrink-0 mt-0.5" />
                      <span className="leading-tight">{c}</span>
                    </div>
                  ))}
                </div>

                {/* Sample Recruiters */}
                <div className="mt-5 border-t border-border pt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Recruiters in this Tier:
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {tier.sampleCompanies.map((comp) => (
                      <span
                        key={comp}
                        className="rounded-md border border-border bg-muted/60 px-2 py-0.5 text-[11px] text-foreground"
                      >
                        {comp}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card Action */}
              <div className="mt-6 pt-4 border-t border-border">
                <Link to="/companies" className="block w-full">
                  <Button
                    variant="outline"
                    className="w-full h-8.5 rounded-xl border-border bg-card dark:border-zinc-700 dark:bg-zinc-900/60 text-xs font-semibold text-foreground hover:border-primary/60 hover:bg-primary/10 hover:text-primary"
                  >
                    Filter {tier.tierName} Companies
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
