import { useNavigate, Link } from "@tanstack/react-router";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  Building2,
  CheckCircle2,
  Compass,
  GraduationCap,
  LayoutGrid,
  ListFilter,
  MapPin,
  Search,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { CompanyLogo } from "@/components/CompanyLogo";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCompany } from "@/features/companies/Hooks/companies.hooks";
import { useCompanies } from "../Hooks/companies.hooks";
import { isNullish, type CompanySummary, type CompanyType } from "@/lib/companyData";
import { APP_NAME } from "@/lib/college";
import { cn } from "@/lib/utils";

const FILTERS: ("All" | CompanyType)[] = ["All", "Super Dream", "Dream", "Standard", "Regular"];

const TIER_CTC: Record<CompanyType, string> = {
  "Super Dream": "₹18+ LPA",
  Dream: "₹10–18 LPA",
  Standard: "₹6–10 LPA",
  Regular: "< ₹6 LPA",
};

// Monochromatic, luxury black-and-zinc styling
const TYPE_STYLES: Record<CompanyType, string> = {
  "Super Dream":
    "bg-orange-500/10 dark:bg-primary/15 text-orange-600 dark:text-primary border-orange-500/30 dark:border-primary/40 shadow-xs",
  Dream: "bg-primary/10 text-primary border-primary/30 shadow-xs",
  Standard:
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 shadow-xs",
  Regular: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 shadow-xs",
};

const TYPE_DOTS: Record<CompanyType, string> = {
  "Super Dream": "bg-primary shadow-xs",
  Dream: "bg-primary shadow-xs",
  Standard: "bg-emerald-500 shadow-xs",
  Regular: "bg-amber-500 shadow-xs",
};

const ACTIVE_STYLES: Record<string, string> = {
  All: "bg-primary text-white border-transparent shadow-xs font-semibold",
  "Super Dream": "bg-orange-600 text-white border-transparent shadow-xs font-semibold",
  Dream: "bg-primary text-white border-transparent shadow-xs font-semibold",
  Standard: "bg-emerald-600 text-white border-transparent shadow-xs font-semibold",
  Regular: "bg-amber-600 text-white border-transparent shadow-xs font-semibold",
};

function Val({ v }: { v: string }) {
  return isNullish(v) ? null : <>{v}</>;
}

// Clean Modern Company Card (Eliminates the chunky "postcard" look & removes empty grey boxes)
const CompanyCard = memo(function CompanyCard({
  company,
  onSelect,
}: {
  company: CompanySummary;
  onSelect: (c: CompanySummary) => void;
}) {
  const down = company.yoyGrowthRate.trim().startsWith("-");
  const hasHeadquarters = !isNullish(company.headquarters);
  const hasEmployees = !isNullish(company.employeeSize);
  const hasMomentum = !isNullish(company.yoyGrowthRate);

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
      className="group relative flex flex-col justify-between rounded-xl border border-border bg-card p-4.5 text-left shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/60 hover:bg-card-sub hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
    >
      <div>
        {/* Top Header: Logo + Company Name & Domain + Tier Pill */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <CompanyLogo
              name={company.name}
              logoUrl={company.logoUrl}
              websiteUrl={company.websiteUrl}
              className="h-11 w-11 shrink-0 rounded-xl border border-border bg-card shadow-2xs"
            />
            <div className="min-w-0">
              <h3 className="font-heading text-base font-bold leading-snug tracking-tight text-foreground transition-colors duration-200 group-hover:text-primary truncate">
                {company.name}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                {company.shortName && company.shortName !== company.name && (
                  <span className="text-xs text-muted-foreground font-medium truncate">
                    {company.shortName}
                  </span>
                )}
                {company.category && (
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground border border-border/70 truncate max-w-[120px]">
                    {company.category}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Tier Badge & Salary Bracket */}
          <div className="shrink-0 text-right">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                TYPE_STYLES[company.companyType],
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", TYPE_DOTS[company.companyType])} />
              {company.companyType}
            </span>
            <div className="text-[10px] font-mono text-muted-foreground mt-0.5 font-medium">
              {TIER_CTC[company.companyType]}
            </div>
          </div>
        </div>

        {/* Crisp Metadata Chips (Rendered cleanly without nested gray boxes or "not publicly available" clutter) */}
        {(hasHeadquarters || hasEmployees || hasMomentum) && (
          <div className="mt-3.5 flex flex-wrap items-center gap-1.5 pt-3 border-t border-border/60 text-xs">
            {hasHeadquarters && (
              <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground">
                <MapPin className="h-3 w-3 text-muted-foreground/80 shrink-0" />
                <span className="truncate max-w-[120px]">{company.headquarters}</span>
              </span>
            )}
            {hasEmployees && (
              <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground">
                <Users className="h-3 w-3 text-muted-foreground/80 shrink-0" />
                <span>{company.employeeSize}</span>
              </span>
            )}
            {hasMomentum && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium",
                  down
                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                )}
              >
                {down ? (
                  <TrendingDown className="h-3 w-3 shrink-0" />
                ) : (
                  <TrendingUp className="h-3 w-3 shrink-0" />
                )}
                <span>YoY {company.yoyGrowthRate}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Select Company Action Bar */}
      <div className="mt-4 pt-1">
        <div className="flex h-9 w-full items-center justify-between rounded-lg border border-border bg-card-sub px-3 text-xs font-semibold text-foreground transition-all duration-200 group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground shadow-2xs">
          <span>Select Company</span>
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
        </div>
      </div>
    </div>
  );
});

export default function CompanyPickerPage() {
  const navigate = useNavigate();
  const { selectCompany } = useCompany();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [sortBy, setSortBy] = useState<"default" | "name" | "growth" | "tier">("default");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: companies = [], isLoading, isError, error, refetch } = useCompanies();

  // Keyboard shortcut for quick search focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === "/" || (e.key === "k" && (e.metaKey || e.ctrlKey))) &&
        document.activeElement !== searchInputRef.current
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim().toLowerCase()), 200);
    return () => clearTimeout(t);
  }, [query]);

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    companies.forEach((c) => {
      if (c.category && c.category.trim()) {
        cats.add(c.category.trim());
      }
    });
    return ["All", ...Array.from(cats).sort()];
  }, [companies]);

  const searched = useMemo(() => {
    const result = companies.filter((c) => {
      const matchesSearch =
        !debounced ||
        [c.name, c.shortName, c.headquarters, c.category, c.companyType].some(
          (s) => Boolean(s && typeof s === "string" && s.toLowerCase().includes(debounced)),
        );
      const matchesCategory = selectedCategory === "All" || c.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });

    if (sortBy === "name") {
      return [...result].sort((a, b) => a.name.localeCompare(b.name));
    }
    if (sortBy === "growth") {
      return [...result].sort((a, b) => {
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
      return [...result].sort((a, b) => order[a.companyType] - order[b.companyType]);
    }
    return result;
  }, [companies, debounced, selectedCategory, sortBy]);

  const visible = filter === "All" ? searched : searched.filter((c) => c.companyType === filter);

  const count = (f: (typeof FILTERS)[number]) =>
    f === "All" ? companies.length : companies.filter((c) => c.companyType === f).length;

  const onSelect = (c: CompanySummary) => {
    selectCompany({ companyId: c.id, companyName: c.name, logoUrl: c.logoUrl });
    navigate({ to: "/company/intelligence" });
  };

  const reset = () => {
    setQuery("");
    setDebounced("");
    setFilter("All");
    setSelectedCategory("All");
    setSortBy("default");
  };

  // Metrics summary
  const superDreamCount = companies.filter((c) => c.companyType === "Super Dream").length;
  const dreamCount = companies.filter((c) => c.companyType === "Dream").length;
  const standardCount = companies.filter((c) => c.companyType === "Standard").length;
  const regularCount = companies.filter((c) => c.companyType === "Regular").length;

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      {/* 1. Service Navigation Top Bar: Prominent Back to Dashboard */}
      <nav className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground transition-all hover:bg-muted hover:border-primary/40 shadow-2xs"
          >
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            <span>Back to Dashboard</span>
          </Link>

          <div className="flex items-center gap-2.5">
            <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 font-heading text-xs font-bold text-primary shadow-xs">
                PI
              </div>
              <span className="font-heading text-sm font-bold tracking-tight text-foreground hidden sm:inline">
                {APP_NAME}
              </span>
            </Link>
          </div>
        </div>
      </nav>

      {/* 2. Main Service Container */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        {/* Service Header */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between pb-1">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-xs">
                <Building2 className="h-5 w-5" />
              </div>
              <h1 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Select Company
              </h1>
              <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-mono font-bold text-primary">
                {companies.length} Total
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Select a target recruiting company to inspect interview intelligence, Bloom&apos;s skill ladders, and hiring benchmarks.
            </p>
          </div>
        </div>

        {/* Placement Tier Summary & 1-Click Filter Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Super Dream */}
          <button
            type="button"
            aria-label="Filter by Super Dream tier"
            onClick={() => setFilter(filter === "Super Dream" ? "All" : "Super Dream")}
            className={cn(
              "p-4 rounded-2xl border text-left transition-all cursor-pointer shadow-2xs group relative overflow-hidden",
              filter === "Super Dream"
                ? "border-orange-500 bg-orange-500/10 ring-1 ring-orange-500"
                : "border-border bg-card hover:border-orange-500/50 hover:bg-card-sub",
            )}
          >
            <div className="flex items-center justify-between text-orange-600 dark:text-orange-400">
              <span className="text-xs font-bold uppercase tracking-wider">Super Dream</span>
              <Trophy className="h-4 w-4" />
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="font-heading text-3xl font-black text-foreground">{superDreamCount}</span>
              <span className="text-xs text-orange-600 dark:text-orange-400 font-semibold">₹18+ LPA</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground truncate">Premier Tech & Global Roles</p>
          </button>

          {/* Dream */}
          <button
            type="button"
            aria-label="Filter by Dream tier"
            onClick={() => setFilter(filter === "Dream" ? "All" : "Dream")}
            className={cn(
              "p-4 rounded-2xl border text-left transition-all cursor-pointer shadow-2xs group relative overflow-hidden",
              filter === "Dream"
                ? "border-primary bg-primary/10 ring-1 ring-primary"
                : "border-border bg-card hover:border-primary/50 hover:bg-card-sub",
            )}
          >
            <div className="flex items-center justify-between text-primary">
              <span className="text-xs font-bold uppercase tracking-wider">Dream</span>
              <GraduationCap className="h-4 w-4" />
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="font-heading text-3xl font-black text-foreground">{dreamCount}</span>
              <span className="text-xs text-primary font-semibold">₹10–18 LPA</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground truncate">Product Engineering & High CTC</p>
          </button>

          {/* Standard */}
          <button
            type="button"
            aria-label="Filter by Standard tier"
            onClick={() => setFilter(filter === "Standard" ? "All" : "Standard")}
            className={cn(
              "p-4 rounded-2xl border text-left transition-all cursor-pointer shadow-2xs group relative overflow-hidden",
              filter === "Standard"
                ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500"
                : "border-border bg-card hover:border-emerald-500/50 hover:bg-card-sub",
            )}
          >
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
              <span className="text-xs font-bold uppercase tracking-wider">Standard</span>
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="font-heading text-3xl font-black text-foreground">{standardCount}</span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">₹6–10 LPA</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground truncate">Mid-Market Tech & FinTech</p>
          </button>

          {/* Regular */}
          <button
            type="button"
            aria-label="Filter by Regular tier"
            onClick={() => setFilter(filter === "Regular" ? "All" : "Regular")}
            className={cn(
              "p-4 rounded-2xl border text-left transition-all cursor-pointer shadow-2xs group relative overflow-hidden",
              filter === "Regular"
                ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500"
                : "border-border bg-card hover:border-amber-500/50 hover:bg-card-sub",
            )}
          >
            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
              <span className="text-xs font-bold uppercase tracking-wider">Regular</span>
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="font-heading text-3xl font-black text-foreground">{regularCount}</span>
              <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">&lt; ₹6 LPA</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground truncate">Core IT Services & Consulting</p>
          </button>
        </div>

        {/* Controls Bar: Search & Sort & View */}
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card dark:border-zinc-800/80 dark:bg-[#0c0c0e] p-4 shadow-xs sm:flex-row sm:items-center">
          {/* Omni Search Bar */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchInputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by company name, location, domain, or placement tier... (Press / to focus)"
              aria-label="Search companies"
              className="h-11 w-full rounded-xl border border-border bg-background dark:border-zinc-800 dark:bg-zinc-950/80 pl-10 pr-16 text-sm text-foreground dark:text-zinc-100 placeholder:text-muted-foreground shadow-2xs outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
              {query ? (
                <button
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : (
                <kbd className="pointer-events-none hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground sm:inline-block">
                  /
                </kbd>
              )}
            </div>
          </div>

          {/* Controls Right: Category, Sort & View */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Dropdown Filter */}
            {categories.length > 2 && (
              <div className="relative flex items-center">
                <Compass className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-muted-foreground" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  aria-label="Filter by industry category"
                  className="h-11 rounded-xl border border-border bg-background dark:border-zinc-800 dark:bg-zinc-950/80 pl-8 pr-4 text-xs font-medium text-foreground dark:text-zinc-200 shadow-2xs outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  {categories.map((c) => (
                    <option
                      key={c}
                      value={c}
                      className="bg-card text-foreground dark:bg-zinc-900 dark:text-zinc-100"
                    >
                      {c === "All" ? "All Domains" : c}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Sort Selector */}
            <div className="relative flex items-center">
              <ArrowUpDown className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                aria-label="Sort companies"
                className="h-11 rounded-xl border border-border bg-background dark:border-zinc-800 dark:bg-zinc-950/80 pl-8 pr-4 text-xs font-medium text-foreground dark:text-zinc-200 shadow-2xs outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option
                  value="default"
                  className="bg-card text-foreground dark:bg-zinc-900 dark:text-zinc-100"
                >
                  Sort: Default
                </option>
                <option
                  value="name"
                  className="bg-card text-foreground dark:bg-zinc-900 dark:text-zinc-100"
                >
                  Sort: Name (A–Z)
                </option>
                <option
                  value="growth"
                  className="bg-card text-foreground dark:bg-zinc-900 dark:text-zinc-100"
                >
                  Sort: YoY Growth
                </option>
                <option
                  value="tier"
                  className="bg-card text-foreground dark:bg-zinc-900 dark:text-zinc-100"
                >
                  Sort: Role Tier
                </option>
              </select>
            </div>

            {/* View Switcher */}
            <div className="flex h-11 items-center rounded-xl border border-border bg-background dark:border-zinc-800 dark:bg-zinc-950/80 p-1 shadow-2xs">
              <button
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition-colors cursor-pointer",
                  viewMode === "grid"
                    ? "bg-primary text-primary-foreground shadow-xs dark:bg-white dark:text-zinc-950"
                    : "text-muted-foreground hover:text-foreground dark:text-zinc-400 dark:hover:text-white",
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                aria-label="Table view"
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition-colors cursor-pointer",
                  viewMode === "table"
                    ? "bg-primary text-primary-foreground shadow-xs dark:bg-white dark:text-zinc-950"
                    : "text-muted-foreground hover:text-foreground dark:text-zinc-400 dark:hover:text-white",
                )}
              >
                <ListFilter className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Tier Filter Tabs */}
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => {
            const active = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-2 text-xs font-medium transition-all duration-200 cursor-pointer",
                  active
                    ? ACTIVE_STYLES[f]
                    : f === "All"
                      ? "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground dark:border-zinc-800 dark:bg-[#0c0c0e] dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:text-white"
                      : TYPE_STYLES[f as CompanyType],
                )}
              >
                {f}
                <span
                  className={cn(
                    "ml-1.5 rounded-full px-1.5 py-0.2 text-[10px]",
                    active
                      ? "bg-white/20 text-white"
                      : "bg-muted text-muted-foreground dark:bg-white/10 dark:text-zinc-300",
                  )}
                >
                  {count(f)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search status & reset */}
        {(debounced || selectedCategory !== "All" || filter !== "All") && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Showing <strong className="text-foreground">{visible.length}</strong> of{" "}
              {companies.length} recruiting companies
            </span>
            <button
              onClick={reset}
              className="text-xs font-semibold text-primary underline hover:text-primary/80 cursor-pointer"
            >
              Reset all filters
            </button>
          </div>
        )}

        {/* Content State Rendering */}
        <div className="mt-4">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-11 w-11 rounded-xl" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-9 w-full rounded-lg" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-12 text-center">
              <p className="font-heading text-lg font-semibold text-rose-600 dark:text-rose-400">
                Failed to load recruiting company profiles
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {error ?? "Unable to retrieve company intelligence records."}
              </p>
              <Button
                variant="outline"
                className="mt-4 border-border bg-card text-foreground hover:bg-muted"
                onClick={() => void refetch()}
              >
                Retry Request
              </Button>
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/60 dark:border-zinc-800 dark:bg-[#0c0c0e]/60 py-16 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
                <Search className="h-6 w-6" />
              </div>
              <p className="mt-4 font-heading text-lg font-bold text-foreground">
                No recruiting companies found
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try adjusting your search query, clearing domain filters, or switching the placement
                tier.
              </p>
              <Button
                variant="outline"
                className="mt-5 rounded-xl border-border bg-card text-foreground hover:bg-muted"
                onClick={reset}
              >
                Reset Search Filters
              </Button>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((c) => (
                <CompanyCard key={c.id} company={c} onSelect={onSelect} />
              ))}
            </div>
          ) : (
            /* Enterprise Table View Mode */
            <div className="overflow-hidden rounded-xl border border-border bg-card dark:border-zinc-800 dark:bg-[#0c0c0e] shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-foreground">
                  <thead className="border-b border-border bg-card-sub dark:border-zinc-800 dark:bg-[#121215] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground dark:text-zinc-400">
                    <tr>
                      <th className="px-5 py-3.5">Company</th>
                      <th className="px-5 py-3.5">Domain</th>
                      <th className="px-5 py-3.5">Placement Tier</th>
                      <th className="px-5 py-3.5">Headquarters</th>
                      <th className="px-5 py-3.5">Workforce Scale</th>
                      <th className="px-5 py-3.5">YoY Momentum</th>
                      <th className="px-5 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border dark:divide-zinc-800/70">
                    {visible.map((c) => {
                      const down = c.yoyGrowthRate.trim().startsWith("-");
                      const hasHeadquarters = !isNullish(c.headquarters);
                      const hasEmployees = !isNullish(c.employeeSize);
                      const hasMomentum = !isNullish(c.yoyGrowthRate);
                      return (
                        <tr
                          key={c.id}
                          onClick={() => onSelect(c)}
                          className="cursor-pointer transition-colors duration-150 hover:bg-card-sub/80 dark:hover:bg-zinc-900/60"
                        >
                          <td className="px-5 py-3.5 font-medium">
                            <div className="flex items-center gap-3">
                              <CompanyLogo
                                name={c.name}
                                logoUrl={c.logoUrl}
                                websiteUrl={c.websiteUrl}
                                className="h-9 w-9 rounded-lg border border-border bg-card dark:border-zinc-800 dark:bg-zinc-950"
                              />
                              <div>
                                <p className="font-heading font-semibold text-foreground">
                                  {c.name}
                                </p>
                                <p className="text-xs text-muted-foreground">{c.shortName}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-muted-foreground">
                            {c.category ? (
                              <span className="rounded bg-muted px-2 py-0.5 border border-border text-foreground">
                                {c.category}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                                TYPE_STYLES[c.companyType],
                              )}
                            >
                              <span
                                className={cn("h-1.5 w-1.5 rounded-full", TYPE_DOTS[c.companyType])}
                              />
                              {c.companyType}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-muted-foreground">
                            {hasHeadquarters ? c.headquarters : "—"}
                          </td>
                          <td className="px-5 py-3.5 text-xs text-muted-foreground">
                            {hasEmployees ? c.employeeSize : "—"}
                          </td>
                          <td className="px-5 py-3.5 text-xs">
                            {hasMomentum ? (
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 font-semibold",
                                  down
                                    ? "text-rose-600 dark:text-rose-400"
                                    : "text-emerald-700 dark:text-emerald-400",
                                )}
                              >
                                {down ? (
                                  <TrendingDown className="h-3.5 w-3.5" />
                                ) : (
                                  <TrendingUp className="h-3.5 w-3.5" />
                                )}
                                <Val v={c.yoyGrowthRate} />
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-lg text-primary hover:bg-primary/10 hover:text-primary font-semibold"
                            >
                              Select
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
        </div>
      </main>
    </div>
  );
}
