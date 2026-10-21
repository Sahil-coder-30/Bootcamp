import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { memo, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUpDown,
  Building2,
  CheckCircle2,
  GraduationCap,
  LayoutGrid,
  ListFilter,
  MapPin,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { CompanyLogo } from "@/components/CompanyLogo";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCompany } from "@/lib/company-context";
import { useCompanies } from "@/lib/companyApi";
import { isNullish, type CompanySummary, type CompanyType } from "@/lib/companyData";
import { APP_NAME, COLLEGE_SHORT, PORTAL_TITLE } from "@/lib/college";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${APP_NAME} | ${COLLEGE_SHORT} Placement Intelligence Portal` },
      {
        name: "description",
        content:
          "Browse recruiting companies and research them before campus placements at JSS Academy of Technical Education with PlaceIntel.",
      },
      { property: "og:title", content: `${APP_NAME} | ${COLLEGE_SHORT} Placement Intelligence Portal` },
      { property: "og:description", content: "Your strategic edge for campus placements." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const FILTERS: ("All" | CompanyType)[] = ["All", "Super Dream", "Dream", "Standard", "Regular"];

export const TYPE_STYLES: Record<CompanyType, string> = {
  "Super Dream": "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
  Dream: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  Standard: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  Regular: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
};

const TYPE_DOTS: Record<CompanyType, string> = {
  "Super Dream": "bg-purple-500",
  Dream: "bg-blue-500",
  Standard: "bg-emerald-500",
  Regular: "bg-amber-500",
};

const ACTIVE_STYLES: Record<string, string> = {
  All: "bg-primary text-primary-foreground border-primary shadow-xs",
  "Super Dream": "bg-purple-600 text-white border-purple-600 shadow-xs",
  Dream: "bg-blue-600 text-white border-blue-600 shadow-xs",
  Standard: "bg-emerald-600 text-white border-emerald-600 shadow-xs",
  Regular: "bg-amber-600 text-white border-amber-600 shadow-xs",
};

function Val({ v }: { v: string }) {
  return isNullish(v) ? (
    <span className="italic text-muted-foreground/80">not publicly available</span>
  ) : (
    <>{v}</>
  );
}

const CompanyCard = memo(function CompanyCard({
  company,
  onSelect,
}: {
  company: CompanySummary;
  onSelect: (c: CompanySummary) => void;
}) {
  const down = company.yoyGrowthRate.trim().startsWith("-");
  return (
    <div
      onClick={() => onSelect(company)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(company);
        }
      }}
      className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card/90 p-5 text-left shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:bg-card hover:shadow-xl hover:shadow-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <CompanyLogo
            name={company.name}
            logoUrl={company.logoUrl}
            websiteUrl={company.websiteUrl}
            className="h-13 w-13 shadow-xs"
          />
          <div className="flex flex-col items-end gap-1">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide",
                TYPE_STYLES[company.companyType],
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", TYPE_DOTS[company.companyType])} />
              {company.companyType}
            </span>
            {company.category && (
              <span className="max-w-[140px] truncate text-[11px] font-medium text-muted-foreground">
                {company.category}
              </span>
            )}
          </div>
        </div>

        <div>
          <h3 className="font-heading text-lg font-bold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary">
            {company.name}
          </h3>
          <p className="text-xs font-medium text-muted-foreground">{company.shortName}</p>
        </div>

        <div className="space-y-2 rounded-xl bg-secondary/50 p-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/80" />
            <span className="truncate">
              <Val v={company.headquarters} />
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 shrink-0 text-primary/80" />
            <span className="truncate">
              <Val v={company.employeeSize} />
            </span>
          </div>
          <div
            className={cn(
              "flex items-center gap-1.5 font-medium",
              down ? "text-destructive" : "text-emerald-600 dark:text-emerald-400",
            )}
          >
            {down ? (
              <TrendingDown className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <TrendingUp className="h-3.5 w-3.5 shrink-0" />
            )}
            <span>
              YoY Growth <Val v={company.yoyGrowthRate} />
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs font-semibold text-primary">
        <span>Explore Intelligence Profile</span>
        <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1.5" />
      </div>
    </div>
  );
});

function Index() {
  const navigate = useNavigate();
  const { selectCompany } = useCompany();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [sortBy, setSortBy] = useState<"default" | "name" | "growth" | "tier">("default");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const { data: companies = [], isLoading, isError, error, refetch } = useCompanies();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim().toLowerCase()), 200);
    return () => clearTimeout(t);
  }, [query]);

  const searched = useMemo(() => {
    const filtered = companies.filter(
      (c) =>
        !debounced ||
        [c.name, c.shortName, c.headquarters, c.category, c.companyType].some((s) =>
          s.toLowerCase().includes(debounced),
        ),
    );

    if (sortBy === "name") {
      return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    }
    if (sortBy === "growth") {
      return [...filtered].sort((a, b) => {
        const valA = parseFloat(a.yoyGrowthRate) || 0;
        const valB = parseFloat(b.yoyGrowthRate) || 0;
        return valB - valA;
      });
    }
    if (sortBy === "tier") {
      const order: Record<CompanyType, number> = {
        "Super Dream": 1,
        Dream: 2,
        Standard: 3,
        Regular: 4,
      };
      return [...filtered].sort((a, b) => order[a.companyType] - order[b.companyType]);
    }
    return filtered;
  }, [companies, debounced, sortBy]);

  const visible = filter === "All" ? searched : searched.filter((c) => c.companyType === filter);

  const count = (f: (typeof FILTERS)[number]) =>
    f === "All"
      ? companies.length
      : companies.filter((c) => c.companyType === f).length;

  const onSelect = (c: CompanySummary) => {
    selectCompany({ companyId: c.id, companyName: c.name, logoUrl: c.logoUrl });
    navigate({ to: "/company/intelligence" });
  };

  const reset = () => {
    setQuery("");
    setDebounced("");
    setFilter("All");
    setSortBy("default");
  };

  // Metrics summary
  const superDreamCount = companies.filter((c) => c.companyType === "Super Dream").length;
  const dreamCount = companies.filter((c) => c.companyType === "Dream").length;
  const standardRegularCount = companies.filter(
    (c) => c.companyType === "Standard" || c.companyType === "Regular",
  ).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Top institution ribbon */}
      <div className="border-b border-border/60 bg-secondary/40 py-2">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 text-xs font-medium text-muted-foreground sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-foreground">{COLLEGE_SHORT}</span>
            <span>· Department of Training & Placement</span>
          </div>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
            Academic Year 2025–26 Drives
          </span>
        </div>
      </div>

      {/* Hero section */}
      <header className="relative border-b border-border/80 bg-gradient-to-b from-card via-background to-background py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              {APP_NAME} · Strategic Career Intelligence
            </div>
            <h1 className="mt-3 font-heading text-2xl font-bold tracking-tight text-foreground sm:text-4xl">
              {PORTAL_TITLE}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Comprehensive company research, technical skill ladders, and hiring benchmarks for campus drives.
            </p>
          </div>

          {/* Quick Metrics KPI Bar */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <div className="rounded-xl border border-border/70 bg-card p-4 shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Recruiting Partners</span>
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-2 font-heading text-2xl font-bold tracking-tight text-foreground">
                {companies.length}
              </p>
              <p className="text-[11px] text-muted-foreground">Active Campus Recruiters</p>
            </div>

            <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 shadow-xs">
              <div className="flex items-center justify-between text-purple-600 dark:text-purple-400">
                <span className="text-xs font-semibold">Super Dream Roles</span>
                <Trophy className="h-4 w-4" />
              </div>
              <p className="mt-2 font-heading text-2xl font-bold tracking-tight text-foreground">
                {superDreamCount}
              </p>
              <p className="text-[11px] text-muted-foreground">₹18+ LPA Premium Tier</p>
            </div>

            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 shadow-xs">
              <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
                <span className="text-xs font-semibold">Dream Roles</span>
                <GraduationCap className="h-4 w-4" />
              </div>
              <p className="mt-2 font-heading text-2xl font-bold tracking-tight text-foreground">
                {dreamCount}
              </p>
              <p className="text-[11px] text-muted-foreground">₹10–18 LPA High CTC</p>
            </div>

            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 shadow-xs">
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                <span className="text-xs font-semibold">Standard & Regular</span>
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <p className="mt-2 font-heading text-2xl font-bold tracking-tight text-foreground">
                {standardRegularCount}
              </p>
              <p className="text-[11px] text-muted-foreground">Core IT & Consulting</p>
            </div>
          </div>

          {/* Search Bar & Controls */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by company name, location, category, or role tier..."
                aria-label="Search companies"
                className="h-11 w-full rounded-xl border border-border/80 bg-background pl-10 pr-10 text-sm shadow-xs outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/20"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Sort Selector */}
              <div className="relative flex items-center">
                <ArrowUpDown className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-muted-foreground" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  aria-label="Sort companies"
                  className="h-11 rounded-xl border border-border/80 bg-background pl-8 pr-4 text-xs font-medium text-foreground shadow-xs outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
                >
                  <option value="default">Sort: Default</option>
                  <option value="name">Sort: Name (A-Z)</option>
                  <option value="growth">Sort: YoY Growth</option>
                  <option value="tier">Sort: Role Tier</option>
                </select>
              </div>

              {/* View Switcher */}
              <div className="flex h-11 items-center rounded-xl border border-border/80 bg-card p-1 shadow-xs">
                <button
                  onClick={() => setViewMode("grid")}
                  aria-label="Grid view"
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                    viewMode === "grid"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  aria-label="Table view"
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                    viewMode === "table"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <ListFilter className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Tier filter pill buttons */}
        <div className="no-scrollbar -mx-4 mb-6 flex items-center gap-2 overflow-x-auto px-4 pb-2">
          {FILTERS.map((f) => {
            const active = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition-all duration-200",
                  active
                    ? ACTIVE_STYLES[f]
                    : f === "All"
                      ? "bg-card text-foreground hover:border-primary/50"
                      : TYPE_STYLES[f as CompanyType],
                )}
              >
                {f}
                <span
                  className={cn(
                    "ml-1.5 rounded-full px-1.5 py-0.2 text-[10px]",
                    active ? "bg-white/20 text-white" : "bg-black/5 dark:bg-white/10",
                  )}
                >
                  {count(f)}
                </span>
              </button>
            );
          })}
        </div>

        {/* State rendering */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-12 text-center">
            <p className="font-heading text-lg font-semibold text-destructive">Failed to load companies</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {error instanceof Error ? error.message : "Unable to retrieve company intelligence records."}
            </p>
            <Button variant="outline" className="mt-4" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 bg-card/50 py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
              <Search className="h-6 w-6" />
            </div>
            <p className="mt-4 font-heading text-lg font-bold text-foreground">No recruiting companies found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try adjusting your search query or switching the category filter.
            </p>
            <Button variant="outline" className="mt-5 rounded-xl" onClick={reset}>
              Reset Filters
            </Button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((c) => (
              <CompanyCard key={c.id} company={c} onSelect={onSelect} />
            ))}
          </div>
        ) : (
          /* Table view mode */
          <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border/80 bg-secondary/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3.5">Company</th>
                    <th className="px-5 py-3.5">Category</th>
                    <th className="px-5 py-3.5">Placement Tier</th>
                    <th className="px-5 py-3.5">Headquarters</th>
                    <th className="px-5 py-3.5">Headcount</th>
                    <th className="px-5 py-3.5">YoY Growth</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {visible.map((c) => {
                    const down = c.yoyGrowthRate.trim().startsWith("-");
                    return (
                      <tr
                        key={c.id}
                        onClick={() => onSelect(c)}
                        className="cursor-pointer transition-colors hover:bg-secondary/40"
                      >
                        <td className="px-5 py-4 font-medium">
                          <div className="flex items-center gap-3">
                            <CompanyLogo
                              name={c.name}
                              logoUrl={c.logoUrl}
                              websiteUrl={c.websiteUrl}
                              className="h-9 w-9"
                            />
                            <div>
                              <p className="font-heading font-semibold text-foreground">{c.name}</p>
                              <p className="text-xs text-muted-foreground">{c.shortName}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-xs text-muted-foreground">{c.category || "—"}</td>
                        <td className="px-5 py-4">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                              TYPE_STYLES[c.companyType],
                            )}
                          >
                            <span className={cn("h-1.5 w-1.5 rounded-full", TYPE_DOTS[c.companyType])} />
                            {c.companyType}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs text-muted-foreground">
                          <Val v={c.headquarters} />
                        </td>
                        <td className="px-5 py-4 text-xs text-muted-foreground">
                          <Val v={c.employeeSize} />
                        </td>
                        <td className="px-5 py-4 text-xs">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 font-semibold",
                              down ? "text-destructive" : "text-emerald-600 dark:text-emerald-400",
                            )}
                          >
                            {down ? (
                              <TrendingDown className="h-3 w-3" />
                            ) : (
                              <TrendingUp className="h-3 w-3" />
                            )}
                            <Val v={c.yoyGrowthRate} />
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-lg text-primary hover:bg-primary/10 hover:text-primary"
                          >
                            View
                            <ArrowRight className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
