import { useNavigate, Link } from "@tanstack/react-router";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpDown,
  Award,
  Briefcase,
  Building2,
  CheckCircle2,
  Compass,
  ExternalLink,
  GraduationCap,
  Layers,
  LayoutGrid,
  ListFilter,
  MapPin,
  Search,
  ShieldCheck,
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
import { useCompany } from "@/features/companies/Hooks/companies.hooks";
import { useCompanies } from "../Hooks/companies.hooks";
import { useAuth } from "@/features/auth/Hooks/auth.hooks";
import { isNullish, type CompanySummary, type CompanyType } from "@/lib/companyData";
import { APP_NAME, COLLEGE_NAME, COLLEGE_SHORT, PORTAL_TITLE } from "@/lib/college";
import { cn } from "@/lib/utils";

const FILTERS: ("All" | CompanyType)[] = ["All", "Super Dream", "Dream", "Standard", "Regular"];

// Monochromatic, luxury black-and-zinc styling (strictly no blue)
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
  "Super Dream": "bg-primary text-white border-transparent shadow-xs font-semibold",
  Dream: "bg-primary text-white border-transparent shadow-xs font-semibold",
  Standard: "bg-emerald-600 text-white border-transparent shadow-xs font-semibold",
  Regular: "bg-amber-600 text-white border-transparent shadow-xs font-semibold",
};

function Val({ v }: { v: string }) {
  return isNullish(v) ? (
    <span className="italic text-muted-foreground">not publicly available</span>
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
      className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-5 text-left shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:bg-card-sub hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {/* Top subtle highlight shimmer on hover */}
      <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="space-y-4">
        {/* Header: Logo + Tier Badge */}
        <div className="flex items-start justify-between gap-3">
          <CompanyLogo
            name={company.name}
            logoUrl={company.logoUrl}
            websiteUrl={company.websiteUrl}
            className="h-13 w-13 rounded-xl border border-border bg-card shadow-xs"
          />
          <div className="flex flex-col items-end gap-1.5">
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
              <span className="max-w-[150px] truncate rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground border border-border">
                {company.category}
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <div>
          <h3 className="font-heading text-lg font-bold leading-snug tracking-tight text-foreground transition-colors duration-200 group-hover:text-primary">
            {company.name}
          </h3>
          <p className="text-xs font-medium text-muted-foreground">{company.shortName}</p>
        </div>

        {/* Key Metrics Capsule */}
        <div className="space-y-2 rounded-xl border border-border bg-card-sub p-3 text-xs text-foreground">
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">
              <Val v={company.headquarters} />
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">
              <Val v={company.employeeSize} />
            </span>
          </div>
          <div
            className={cn(
              "flex items-center gap-1.5 font-medium",
              down ? "text-rose-600 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400",
            )}
          >
            {down ? (
              <TrendingDown className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <TrendingUp className="h-3.5 w-3.5 shrink-0" />
            )}
            <span>
              YoY Momentum <Val v={company.yoyGrowthRate} />
            </span>
          </div>
        </div>
      </div>

      {/* Footer Action */}
      <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs font-semibold text-muted-foreground transition-colors group-hover:text-primary">
        <span className="flex items-center gap-1.5">
          <Briefcase className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
          Explore Intelligence Profile
        </span>
        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1 group-hover:text-primary" />
      </div>
    </div>
  );
});

export default function CompanyPickerPage() {
  const navigate = useNavigate();
  const { selectCompany } = useCompany();
  const { user: currentUser, signOut } = useAuth();
  const handleLogout = () => void signOut();
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
        [c.name, c.shortName, c.headquarters, c.category, c.companyType].some((s) =>
          s.toLowerCase().includes(debounced),
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
  const standardRegularCount = companies.filter(
    (c) => c.companyType === "Standard" || c.companyType === "Regular",
  ).length;

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      {/* 1. Institutional Top Status Bar */}
      <div className="border-b border-border bg-card-sub py-2">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 text-xs font-medium text-muted-foreground sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="font-semibold text-foreground">{COLLEGE_SHORT}</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline text-muted-foreground">
              Department of Training & Placement
            </span>
            <span className="hidden md:inline">·</span>
            <span className="hidden md:inline text-muted-foreground">Autonomous Institute</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-0.5 text-[11px] font-medium text-foreground">
              <ShieldCheck className="h-3 w-3 text-muted-foreground" />
              Academic Drive 2025–26
            </span>
            <a
              href="https://jssaten.ac.in"
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground sm:flex"
            >
              jssaten.ac.in
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
        </div>
      </div>

      {/* 2. Executive Navigation Header */}
      <nav className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-3 transition-opacity hover:opacity-90">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 font-heading text-sm font-bold text-primary shadow-xs">
              PI
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <span className="font-heading text-lg font-bold tracking-tight text-foreground">
                  {APP_NAME}
                </span>
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  CAMPUS PRO
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                JSSATEN Placement Intelligence Hub
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            {currentUser ? (
              <div className="flex items-center gap-2 rounded-xl border border-border bg-card-sub px-2.5 py-1 text-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="font-semibold text-foreground">{currentUser.name}</span>
                <button
                  onClick={handleLogout}
                  className="ml-1 text-[11px] font-semibold text-rose-500 hover:text-rose-700 transition-colors cursor-pointer"
                >
                  Log Out
                </button>
              </div>
            ) : (
              <Link
                to="/"
                className="rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-card-sub inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                ← Landing Page
              </Link>
            )}
            <a
              href="#directory"
              className="hidden rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-card-sub sm:inline-flex items-center gap-1.5"
            >
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              Recruiters ({companies.length})
            </a>
            <Link
              to="/dashboard"
              className="rounded-xl border border-primary/30 bg-primary/10 px-3.5 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 inline-flex items-center gap-1.5 whitespace-nowrap shadow-2xs"
            >
              <Briefcase className="h-3.5 w-3.5 text-primary" />
              Candidate Dashboard
            </Link>
            <Link
              to="/talent-check"
              className="hidden sm:inline-flex rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 transition-colors hover:bg-emerald-500/20 items-center gap-1.5 whitespace-nowrap shadow-2xs"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              Talent Check
            </Link>
            <Link
              to="/resume"
              className="hidden md:inline-flex rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground hover:bg-muted items-center gap-1.5"
            >
              Resume ATS
            </Link>
          </div>
        </div>
      </nav>

      {/* 3. Hero Section (Sleek Theme-Aware Ambient Banner) */}
      <header className="relative overflow-hidden border-b border-border bg-gradient-to-b from-card via-background to-card-sub dark:from-[#050506] dark:via-[#09090b] dark:to-[#050506] py-12 sm:py-16">
        {/* Subtle Grid Background */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(currentColor_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.03] dark:opacity-40 text-foreground dark:text-zinc-600" />

        {/* Soft overhead light cone */}
        <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-96 w-[700px] -translate-x-1/2 rounded-full bg-gradient-to-b from-primary/10 dark:from-white/[0.08] to-transparent blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-3xl">
            {/* Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-border dark:border-zinc-700/80 bg-card/90 dark:bg-zinc-900/90 px-3.5 py-1 text-xs font-medium text-foreground dark:text-zinc-300 shadow-xs backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>JSSATEN Placement Intelligence Engine · Session 2025–26</span>
            </div>

            {/* Title */}
            <h1 className="mt-4 font-heading text-3xl font-extrabold tracking-tight text-foreground dark:text-white sm:text-5xl lg:text-6xl">
              Campus Placement <br />
              <span className="bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground dark:from-white dark:via-zinc-200 dark:to-zinc-400 bg-clip-text text-transparent">
                Intelligence & Benchmarking
              </span>
            </h1>

            {/* Description */}
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground dark:text-zinc-300 sm:text-base">
              Corporate dossiers, salary tier analytics, and Bloom&apos;s Taxonomy technical skill
              ladders designed to give students and recruiters at{" "}
              <span className="font-semibold text-foreground dark:text-zinc-100">
                {COLLEGE_NAME}
              </span>{" "}
              an institutional strategic edge.
            </p>

            {/* Hero Quick Action Buttons */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a
                href="#directory"
                className="inline-flex items-center gap-2 rounded-xl border border-primary bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-xs transition-all hover:bg-primary/90"
              >
                <Briefcase className="h-4 w-4" />
                Explore Recruiting Companies
              </a>
              <Link
                to="/company/skills"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground shadow-xs transition-colors hover:border-primary/40 hover:bg-card-sub"
              >
                <Layers className="h-4 w-4 text-muted-foreground" />
                View Skill Matrix
              </Link>
              <Link
                to="/talent-check"
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 shadow-xs transition-colors hover:bg-emerald-500/20"
              >
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Talent Check & Readiness
              </Link>
            </div>
          </div>

          {/* 4. Executive KPI Dashboard Bar */}
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {/* Recruiters Card */}
            <div className="group relative rounded-2xl border border-border bg-card dark:border-zinc-800 dark:bg-[#0b0b0d] p-4.5 shadow-xs transition-all duration-300 hover:border-primary/50 dark:hover:border-zinc-600 hover:bg-card-sub dark:hover:bg-[#111114]">
              <div className="flex items-center justify-between text-muted-foreground dark:text-zinc-400">
                <span className="text-xs font-semibold tracking-wide">Recruiting Partners</span>
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-2.5 font-heading text-3xl font-extrabold tracking-tight text-foreground dark:text-white">
                {companies.length}
              </p>
              <p className="mt-1 text-[11px] font-medium text-muted-foreground dark:text-zinc-400">
                Active Campus Recruiters
              </p>
            </div>

            {/* Super Dream Card */}
            <div className="group relative rounded-2xl border border-border bg-card dark:border-zinc-800 dark:bg-[#0b0b0d] p-4.5 shadow-xs transition-all duration-300 hover:border-primary/50 dark:hover:border-zinc-500 hover:bg-card-sub dark:hover:bg-[#111114]">
              <div className="flex items-center justify-between text-orange-600 dark:text-orange-400">
                <span className="text-xs font-semibold tracking-wide">Super Dream Roles</span>
                <Trophy className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              <p className="mt-2.5 font-heading text-3xl font-extrabold tracking-tight text-foreground dark:text-white">
                {superDreamCount}
              </p>
              <p className="mt-1 text-[11px] font-medium text-muted-foreground dark:text-zinc-400">
                ₹18+ LPA Premium Tier
              </p>
            </div>

            {/* Dream Card */}
            <div className="group relative rounded-2xl border border-border bg-card dark:border-zinc-800 dark:bg-[#0b0b0d] p-4.5 shadow-xs transition-all duration-300 hover:border-primary/50 dark:hover:border-zinc-500 hover:bg-card-sub dark:hover:bg-[#111114]">
              <div className="flex items-center justify-between text-primary">
                <span className="text-xs font-semibold tracking-wide">Dream Roles</span>
                <GraduationCap className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-2.5 font-heading text-3xl font-extrabold tracking-tight text-foreground dark:text-white">
                {dreamCount}
              </p>
              <p className="mt-1 text-[11px] font-medium text-muted-foreground dark:text-zinc-400">
                ₹10–18 LPA High CTC
              </p>
            </div>

            {/* Standard & Regular Card */}
            <div className="group relative rounded-2xl border border-border bg-card dark:border-zinc-800 dark:bg-[#0b0b0d] p-4.5 shadow-xs transition-all duration-300 hover:border-primary/50 dark:hover:border-zinc-600 hover:bg-card-sub dark:hover:bg-[#111114]">
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                <span className="text-xs font-semibold tracking-wide">Standard & Regular</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="mt-2.5 font-heading text-3xl font-extrabold tracking-tight text-foreground dark:text-white">
                {standardRegularCount}
              </p>
              <p className="mt-1 text-[11px] font-medium text-muted-foreground dark:text-zinc-400">
                Core IT & Consulting
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* 5. Spotlight Highlights Strip */}
      <section className="border-b border-border bg-card-sub/60 dark:bg-[#09090b]/80 py-3">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 text-xs text-muted-foreground dark:text-zinc-400 sm:px-6">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground dark:text-zinc-200">
              Placement Preparation Protocol:
            </span>
            <span>
              Review technical competencies, system design requirements, and past hiring patterns.
            </span>
          </div>
          <div className="flex items-center gap-4 text-muted-foreground dark:text-zinc-500">
            <span>Verified Data Sources</span>
            <span>·</span>
            <span>Live Sync Supabase</span>
            <span>·</span>
            <span className="text-foreground dark:text-zinc-400 font-medium">
              JSSATEN T&P Verified
            </span>
          </div>
        </div>
      </section>

      {/* 6. Main Directory & Controls */}
      <main id="directory" className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
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
        <div className="no-scrollbar mt-5 flex items-center gap-2 overflow-x-auto pb-2">
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
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Showing <strong className="text-foreground">{visible.length}</strong> of{" "}
              {companies.length} recruiting partners
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
        <div className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-border bg-card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-12 w-12 rounded-xl" />
                    <Skeleton className="h-6 w-24 rounded-full" />
                  </div>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-24 w-full rounded-xl" />
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
                onClick={() => refetch()}
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
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((c) => (
                <CompanyCard key={c.id} company={c} onSelect={onSelect} />
              ))}
            </div>
          ) : (
            /* Enterprise Table View Mode */
            <div className="overflow-hidden rounded-2xl border border-border bg-card dark:border-zinc-800 dark:bg-[#0c0c0e] shadow-xs">
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
                      <th className="px-5 py-3.5 text-right">Dossier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border dark:divide-zinc-800/70">
                    {visible.map((c) => {
                      const down = c.yoyGrowthRate.trim().startsWith("-");
                      return (
                        <tr
                          key={c.id}
                          onClick={() => onSelect(c)}
                          className="cursor-pointer transition-colors duration-150 hover:bg-card-sub/80 dark:hover:bg-zinc-900/60"
                        >
                          <td className="px-5 py-4 font-medium">
                            <div className="flex items-center gap-3">
                              <CompanyLogo
                                name={c.name}
                                logoUrl={c.logoUrl}
                                websiteUrl={c.websiteUrl}
                                className="h-10 w-10 rounded-lg border border-border bg-card dark:border-zinc-800 dark:bg-zinc-950"
                              />
                              <div>
                                <p className="font-heading font-semibold text-foreground">
                                  {c.name}
                                </p>
                                <p className="text-xs text-muted-foreground">{c.shortName}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-xs text-muted-foreground">
                            {c.category ? (
                              <span className="rounded bg-muted px-2 py-0.5 border border-border text-foreground">
                                {c.category}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-5 py-4">
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
                          </td>
                          <td className="px-5 py-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
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
        </div>

        {/* 7. Strategic Placement Preparation Callout */}
        <div className="mt-16 rounded-3xl border border-border bg-gradient-to-b from-card to-card-sub dark:border-zinc-800 dark:from-[#111114] dark:to-[#070709] p-8 shadow-xs sm:p-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card dark:border-zinc-700 dark:bg-zinc-900 px-3 py-1 text-xs font-semibold text-foreground dark:text-zinc-300">
                <GraduationCap className="h-3.5 w-3.5 text-primary dark:text-zinc-200" />
                Strategic Career Intelligence
              </div>
              <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground dark:text-white sm:text-3xl">
                Ready to evaluate company requirements?
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground dark:text-zinc-400">
                Inspect structured Bloom&apos;s Taxonomy skill ladders, difficulty benchmarks, and
                corporate culture dossiers to sharpen your preparation before sitting for technical
                interviews.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                to="/company/skills"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary bg-primary px-5 py-3 text-xs font-bold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
              >
                <Layers className="h-4 w-4" />
                Explore Skill Ladders
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* 8. Institutional Footer */}
      <footer className="mt-16 border-t border-border bg-card-sub dark:border-zinc-800/80 dark:bg-[#050506] py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 font-heading text-xs font-bold text-primary">
                  PI
                </div>
                <span className="font-heading text-base font-bold text-foreground">{APP_NAME}</span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                {COLLEGE_NAME} (JSSATEN)
                <br />
                Department of Training and Placement
                <br />
                C-20/1, Sector 62, Noida, Uttar Pradesh 201301
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground dark:text-zinc-300">
                Quick Navigation
              </h4>
              <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                <li>
                  <a href="#directory" className="transition-colors hover:text-foreground">
                    Recruiter Directory
                  </a>
                </li>
                <li>
                  <Link to="/company/skills" className="transition-colors hover:text-foreground">
                    Skill Matrix & Cognitive Levels
                  </Link>
                </li>
                <li>
                  <Link
                    to="/company/intelligence"
                    className="transition-colors hover:text-foreground"
                  >
                    Corporate Dossiers
                  </Link>
                </li>
                <li>
                  <Link
                    to="/talent-check"
                    className="transition-colors hover:text-foreground text-emerald-600 dark:text-emerald-400 font-medium"
                  >
                    Talent Check & Readiness Benchmarking
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground dark:text-zinc-300">
                Accreditation & Standards
              </h4>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                Approved by AICTE, Ministry of Education, Govt. of India. Affiliated to Dr. A.P.J.
                Abdul Kalam Technical University (AKTU), Lucknow.
              </p>
              <p className="mt-3 text-[11px] text-muted-foreground">
                © {new Date().getFullYear()} {APP_NAME} · JSSATEN T&P Cell. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
