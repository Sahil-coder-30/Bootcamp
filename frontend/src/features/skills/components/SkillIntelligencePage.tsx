import { memo, useMemo, useState } from "react";
import {
  ArrowUpDown,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Filter,
  GraduationCap,
  Lock,
  Search,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { CompanyLogo } from "@/components/CompanyLogo";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSelectedCompanyGuard } from "@/features/companies/Hooks/companies.hooks";
import { useCompanyProfile } from "@/features/intelligence/Hooks/intelligence.hooks";
import { useCompanySkills } from "../Hooks/skills.hooks";
import {
  proficiencyToBloom,
  scoreToCriticality,
  type Bloom,
  type Criticality,
  type DashboardSkill,
} from "@/lib/companyData";
import { COLLEGE_SHORT } from "@/lib/college";
import { cn } from "@/lib/utils";

const BLOOM: Record<
  Bloom,
  { label: string; desc: string; range: string; badge: string; dot: string; bar: string }
> = {
  CU: {
    label: "Comprehend & Understand",
    desc: "Explain concepts, recall terminology & fundamentals",
    range: "Lvl 1–2",
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
    dot: "bg-blue-500",
    bar: "bg-blue-500",
  },
  AP: {
    label: "Apply",
    desc: "Implement solutions, write clean code & solve exercises",
    range: "Lvl 3–4",
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
  },
  AS: {
    label: "Analyse & Synthesise",
    desc: "Optimize algorithms, debug bottlenecks & compare trade-offs",
    range: "Lvl 5–6",
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
    dot: "bg-amber-500",
    bar: "bg-amber-500",
  },
  EV: {
    label: "Evaluate",
    desc: "Review architectures, audit systems & benchmark designs",
    range: "Lvl 7–8",
    badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
    dot: "bg-rose-500",
    bar: "bg-rose-500",
  },
  CR: {
    label: "Create",
    desc: "Invent new frameworks, architect distributed solutions",
    range: "Lvl 9–10",
    badge: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
    dot: "bg-purple-500",
    bar: "bg-purple-500",
  },
};

const CRIT: Record<Criticality, { desc: string; badge: string }> = {
  Critical: {
    desc: "Score 7+, mandatory proficiency before interview rounds",
    badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
  },
  Important: {
    desc: "Score 5-6, solid working knowledge expected by panels",
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  },
  Baseline: {
    desc: "Below 5, general foundational familiarity is sufficient",
    badge: "bg-secondary text-muted-foreground border-border/80",
  },
};

const DIFFICULTY_STYLES: Record<string, string> = {
  EXPERT: "bg-purple-500/10 text-purple-600 border-purple-500/30",
  ADVANCED: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  PRO: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  BEGINNER: "bg-secondary text-muted-foreground border-border/80",
};

const SkillCard = memo(function SkillCard({
  skill,
  topics = [],
}: {
  skill: DashboardSkill;
  topics?: string[];
}) {
  const [open, setOpen] = useState(false);
  const bloom = proficiencyToBloom(skill.level);
  const crit = scoreToCriticality(skill.level);

  return (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs transition-all duration-200 hover:border-primary/40 hover:shadow-md">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-expanded={open}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-heading text-base font-bold text-foreground sm:text-lg">
                {skill.name}
              </h3>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                  BLOOM[bloom].badge,
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", BLOOM[bloom].dot)} />
                {bloom} · {BLOOM[bloom].label}
              </span>
              <span
                className={cn(
                  "rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider",
                  DIFFICULTY_STYLES[skill.difficulty] || "bg-secondary text-muted-foreground",
                )}
              >
                {skill.difficulty}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              <span className={cn("font-semibold", CRIT[crit].badge.split(" ")[1])}>
                {crit} Priority
              </span>
              {" · "}
              <span>Target Proficiency: {skill.proficiency}</span>
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="font-heading text-2xl font-bold tracking-tight text-foreground">
                {skill.level}
                <span className="text-xs font-medium text-muted-foreground">/10</span>
              </div>
              <span className="text-[10px] font-semibold text-primary uppercase">
                {open ? "Hide Roadmap" : "View 10-Step Roadmap"}
              </span>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
              <ChevronDown
                className={cn("h-4 w-4 transition-transform duration-200", open && "rotate-180")}
              />
            </div>
          </div>
        </div>

        {/* Progress bar track */}
        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className={cn("h-full rounded-full transition-all duration-500", BLOOM[bloom].bar)}
            style={{ width: `${skill.level * 10}%` }}
          />
        </div>
      </button>

      {/* Expandable 10-Step Topic Roadmap */}
      {open && (
        <div className="border-t border-border/80 bg-secondary/30 p-5">
          <div className="mb-4 flex items-center justify-between text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-foreground">
              <Target className="h-4 w-4 text-primary" />
              10-Level Technical Competency Ladder
            </span>
            <span className="text-muted-foreground">
              Target Benchmark: Level {skill.level} of 10
            </span>
          </div>

          <ol className="relative space-y-2 border-l-2 border-border/80 pl-6 ml-3">
            {topics.map((t, i) => {
              const lvl = i + 1;
              const locked = lvl > skill.level;
              const isTargetThreshold = lvl === skill.level;
              const stepBloom = proficiencyToBloom(lvl);

              return (
                <li
                  key={lvl}
                  className={cn(
                    "group relative flex items-start justify-between gap-3 rounded-xl border p-3 transition-colors",
                    locked
                      ? "border-border/40 bg-card/40 text-muted-foreground/70"
                      : isTargetThreshold
                        ? "border-primary/50 bg-primary/5 shadow-2xs"
                        : "border-border/70 bg-card text-foreground",
                  )}
                >
                  {/* Step pin circle */}
                  <span
                    className={cn(
                      "absolute -left-[31px] top-3 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-2xs",
                      locked ? "bg-muted-foreground/40" : BLOOM[stepBloom].bar,
                    )}
                  >
                    {lvl}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">Level {lvl}</span>
                      <span className="text-[10px] font-medium text-muted-foreground">
                        ({BLOOM[stepBloom].label})
                      </span>
                      {isTargetThreshold && (
                        <span className="rounded-full bg-primary px-2 py-0.2 text-[10px] font-bold text-primary-foreground uppercase">
                          Target
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs font-medium leading-relaxed">
                      {t || `Core level ${lvl} concepts and practical implementation`}
                    </p>
                  </div>

                  {locked ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-secondary/80 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      <Lock className="h-3 w-3" />
                      Scope Exceeded
                    </span>
                  ) : (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Required
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
});

export default function SkillIntelligencePage() {
  const selected = useSelectedCompanyGuard();
  const [filterCrit, setFilterCrit] = useState<"All" | Criticality>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"level_desc" | "level_asc" | "name">("level_desc");

  const {
    data: profile,
    isLoading: isProfileLoading,
    isError: isProfileError,
    error: profileError,
    refetch: refetchProfile,
  } = useCompanyProfile(selected?.companyId);

  const {
    data: skillsData,
    isLoading: isSkillsLoading,
    isError: isSkillsError,
    error: skillsError,
    refetch: refetchSkills,
  } = useCompanySkills(selected?.companyId);

  const isLoading = isProfileLoading || isSkillsLoading;
  const isError = isProfileError || isSkillsError;

  const skills = skillsData?.skills ?? [];
  const topicsMap = skillsData?.topics ?? {};

  const filteredSkills = useMemo(() => {
    let result = skills.filter((s) => {
      const matchesSearch =
        !searchQuery.trim() ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.proficiency.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCrit = filterCrit === "All" || scoreToCriticality(s.level) === filterCrit;
      return matchesSearch && matchesCrit;
    });

    if (sortBy === "level_desc") {
      result = [...result].sort((a, b) => b.level - a.level);
    } else if (sortBy === "level_asc") {
      result = [...result].sort((a, b) => a.level - b.level);
    } else if (sortBy === "name") {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    }
    return result;
  }, [skills, searchQuery, filterCrit, sortBy]);

  // Skill stats
  const criticalCount = skills.filter((s) => s.level >= 7).length;
  const importantCount = skills.filter((s) => s.level >= 5 && s.level < 7).length;
  const baselineCount = skills.filter((s) => s.level < 5).length;
  const avgLevel =
    skills.length > 0
      ? (skills.reduce((acc, s) => acc + s.level, 0) / skills.length).toFixed(1)
      : "0";

  if (!selected || isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !profile) {
    const errorMsg = (profileError ?? "") || (skillsError ?? "") || "Unable to fetch skills data.";
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8">
          <h2 className="font-heading text-lg font-bold text-destructive">
            Failed to load skill intelligence
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{errorMsg}</p>
          <Button
            variant="outline"
            className="mt-4 rounded-xl"
            onClick={() => {
              refetchProfile();
              refetchSkills();
            }}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header section */}
      <div className="border-b border-border/80 bg-gradient-to-b from-card via-card/80 to-background px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <CompanyLogo
                name={profile.name}
                logoUrl={profile.logo_url}
                websiteUrl={profile.website_url}
                className="h-16 w-16 shadow-md"
              />
              <div>
                <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {profile.short_name || profile.name} Skill Intelligence
                </h1>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Required technical competencies, cognitive depth, and 10-level mastery ladders.
                </p>
              </div>
            </div>

            {/* Overall Skill Summary Metric */}
            <div className="flex items-center gap-3 rounded-2xl border border-border/80 bg-background/80 p-3.5 shadow-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase">
                  Avg Benchmark
                </p>
                <p className="font-heading text-xl font-bold text-foreground">
                  {avgLevel}
                  <span className="text-xs font-normal text-muted-foreground">/10</span>
                </p>
              </div>
            </div>
          </div>

          {/* Criticality Summary Cards */}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                  Critical Priority (Score 7+)
                </span>
                <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-xs font-bold text-rose-700 dark:text-rose-300">
                  {criticalCount}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Must be mastered before technical interview screening rounds.
              </p>
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                  Important (Score 5–6)
                </span>
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                  {importantCount}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Solid working knowledge expected by technical interviewers.
              </p>
            </div>

            <div className="rounded-xl border border-border/80 bg-secondary/40 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground">Baseline (Below 5)</span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-foreground">
                  {baselineCount}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Foundational concepts; familiarity with standard workflow suffices.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 pb-24 sm:px-6">
        {/* Bloom's Taxonomy interactive visual guide */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
          <div className="mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-foreground">
              Bloom's Cognitive Taxonomy Framework
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
            {(Object.keys(BLOOM) as Bloom[]).map((b) => (
              <div
                key={b}
                className={cn(
                  "flex flex-col justify-between rounded-xl border p-3 shadow-2xs transition-colors",
                  BLOOM[b].badge,
                )}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-heading text-base font-bold">{b}</span>
                    <span className="text-[10px] font-semibold opacity-80">{BLOOM[b].range}</span>
                  </div>
                  <p className="mt-1 font-heading text-xs font-bold leading-tight">
                    {BLOOM[b].label}
                  </p>
                </div>
                <p className="mt-2 text-[11px] leading-snug opacity-90">{BLOOM[b].desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Toolbar: Search, Filters, and Sorting */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by skill name..."
              className="h-10 w-full rounded-xl border border-border/80 bg-background pl-9 pr-3 text-xs outline-none focus:border-primary"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl border border-border/80 bg-card p-0.5 shadow-2xs">
              {(["All", "Critical", "Important", "Baseline"] as const).map((crit) => (
                <button
                  key={crit}
                  onClick={() => setFilterCrit(crit)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                    filterCrit === crit
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {crit}
                </button>
              ))}
            </div>

            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                aria-label="Sort skills"
                className="h-10 rounded-xl border border-border/80 bg-background px-3 text-xs font-medium outline-none focus:border-primary"
              >
                <option value="level_desc">Score (Highest First)</option>
                <option value="level_asc">Score (Lowest First)</option>
                <option value="name">Skill Name (A–Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Skill Cards list */}
        {filteredSkills.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 py-16 text-center">
            <p className="font-heading text-base font-bold text-foreground">
              No matching skills found
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Try adjusting your search query or reset the priority filter.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 rounded-xl"
              onClick={() => {
                setSearchQuery("");
                setFilterCrit("All");
              }}
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSkills.map((s) => (
              <SkillCard key={s.id} skill={s} topics={topicsMap[s.id] ?? s.topics ?? []} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
