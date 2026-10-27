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
import { isNullish, type CompanySummary, type CompanyType } from "@/lib/companyData";
import { APP_NAME, COLLEGE_NAME, COLLEGE_SHORT, PORTAL_TITLE } from "@/lib/college";
import { cn } from "@/lib/utils";

const FILTERS: ("All" | CompanyType)[] = ["All", "Super Dream", "Dream", "Standard", "Regular"];

// Monochromatic, luxury black-and-zinc styling (strictly no blue)
const TYPE_STYLES: Record<CompanyType, string> = {
  "Super Dream": "bg-zinc-100/10 text-zinc-100 border-zinc-400/50 shadow-xs",
  Dream: "bg-zinc-700/25 text-zinc-200 border-zinc-600/60 shadow-xs",
  Standard: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-xs",
  Regular: "bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-xs",
};

const TYPE_DOTS: Record<CompanyType, string> = {
  "Super Dream": "bg-zinc-100 shadow-[0_0_8px_rgba(255,255,255,0.7)]",
  Dream: "bg-zinc-400 shadow-[0_0_6px_rgba(161,161,170,0.5)]",
  Standard: "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]",
  Regular: "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]",
};

const ACTIVE_STYLES: Record<string, string> = {
  All: "bg-white text-zinc-950 border-white shadow-md font-semibold",
  "Super Dream": "bg-zinc-100 text-zinc-950 border-zinc-200 shadow-md font-semibold",
  Dream: "bg-zinc-300 text-zinc-950 border-zinc-400 shadow-md font-semibold",
  Standard: "bg-emerald-500 text-white border-emerald-400 shadow-md font-semibold",
  Regular: "bg-amber-500 text-white border-amber-400 shadow-md font-semibold",
};

function Val({ v }: { v: string }) {
  return isNullish(v) ? (
    <span className="italic text-zinc-500">not publicly available</span>
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
      className="group relative flex flex-col justify-between rounded-2xl border border-zinc-800/90 bg-[#0c0c0e]/90 p-5 text-left shadow-lg backdrop-blur-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-zinc-500/70 hover:bg-[#121215] hover:shadow-2xl hover:shadow-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
    >
      {/* Top subtle highlight shimmer on hover */}
      <div className="absolute inset-x-0 top-0 h-[1px] rounded-t-2xl bg-gradient-to-r from-transparent via-zinc-600/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="space-y-4">
        {/* Header: Logo + Tier Badge */}
        <div className="flex items-start justify-between gap-3">
          <CompanyLogo
            name={company.name}
            logoUrl={company.logoUrl}
            websiteUrl={company.websiteUrl}
            className="h-13 w-13 rounded-xl border border-zinc-800 bg-zinc-950/80 shadow-md"
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
              <span className="max-w-[150px] truncate rounded-md bg-zinc-900 px-2 py-0.5 text-[10px] font-medium text-zinc-400 border border-zinc-800">
                {company.category}
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <div>
          <h3 className="font-heading text-lg font-bold leading-snug tracking-tight text-white transition-colors duration-200 group-hover:text-zinc-100">
            {company.name}
          </h3>
          <p className="text-xs font-medium text-zinc-400">{company.shortName}</p>
        </div>

        {/* Key Metrics Capsule */}
        <div className="space-y-2 rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-3 text-xs text-zinc-300">
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
            <span className="truncate">
              <Val v={company.headquarters} />
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
            <span className="truncate">
              <Val v={company.employeeSize} />
            </span>
          </div>
          <div
            className={cn(
              "flex items-center gap-1.5 font-medium",
              down ? "text-rose-400" : "text-emerald-400",
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
      <div className="mt-4 flex items-center justify-between border-t border-zinc-800/80 pt-3 text-xs font-semibold text-zinc-300 transition-colors group-hover:text-white">
        <span className="flex items-center gap-1.5">
          <Briefcase className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-200" />
          Explore Intelligence Profile
        </span>
        <ArrowRight className="h-4 w-4 text-zinc-400 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-white" />
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
    <div className="min-h-screen bg-[#050506] text-zinc-100 selection:bg-zinc-800 selection:text-white">
      {/* 1. Institutional Top Status Bar */}
      <div className="border-b border-zinc-800/80 bg-[#09090b] py-2">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 text-xs font-medium text-zinc-400 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="font-semibold text-zinc-200">{COLLEGE_SHORT}</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline text-zinc-400">
              Department of Training & Placement
            </span>
            <span className="hidden md:inline">·</span>
            <span className="hidden md:inline text-zinc-500">Autonomous Institute</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700/60 bg-zinc-900 px-2.5 py-0.5 text-[11px] font-medium text-zinc-300">
              <ShieldCheck className="h-3 w-3 text-zinc-400" />
              Academic Drive 2025–26
            </span>
            <a
              href="https://jssaten.ac.in"
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-1 text-[11px] text-zinc-400 transition-colors hover:text-white sm:flex"
            >
              jssaten.ac.in
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
        </div>
      </div>

      {/* 2. Executive Navigation Header */}
      <nav className="sticky top-0 z-40 border-b border-zinc-800/80 bg-[#050506]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700 bg-gradient-to-b from-zinc-800 to-black font-heading text-sm font-bold text-white shadow-md">
              PI
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading text-lg font-bold tracking-tight text-white">
                  {APP_NAME}
                </span>
                <span className="rounded-full border border-zinc-700/80 bg-zinc-900 px-2 py-0.5 text-[10px] font-semibold text-zinc-300">
                  CAMPUS PRO
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">JSSATEN Placement Intelligence Hub</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="#directory"
              className="hidden rounded-xl border border-zinc-800 bg-zinc-900/60 px-3.5 py-2 text-xs font-semibold text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white sm:inline-flex items-center gap-1.5"
            >
              <Building2 className="h-3.5 w-3.5 text-zinc-400" />
              Recruiters ({companies.length})
            </a>
            <Link
              to="/company/skills"
              className="hidden rounded-xl border border-zinc-800 bg-zinc-900/60 px-3.5 py-2 text-xs font-semibold text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white sm:inline-flex items-center gap-1.5"
            >
              <GraduationCap className="h-3.5 w-3.5 text-zinc-400" />
              Skill Ladders
            </Link>
            <Link
              to="/talent-check"
              className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-3.5 py-2 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-900/50 hover:text-emerald-100 inline-flex items-center gap-1.5 shadow-sm"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              Talent Check
            </Link>
          </div>
        </div>
      </nav>

      {/* 3. Hero Section (Deep Obsidian & Ambient Atmosphere) */}
      <header className="relative overflow-hidden border-b border-zinc-800/80 bg-[#050506] py-12 sm:py-16">
        {/* Ambient Dark Grid Background */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#222227_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />

        {/* Soft overhead light cone (Pure monochrome, 0 blue) */}
        <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-96 w-[700px] -translate-x-1/2 rounded-full bg-gradient-to-b from-white/[0.08] to-transparent blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-3xl">
            {/* Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-700/80 bg-zinc-900/90 px-3.5 py-1 text-xs font-medium text-zinc-300 shadow-sm backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-zinc-300" />
              <span>JSSATEN Placement Intelligence Engine · Session 2025–26</span>
            </div>

            {/* Title */}
            <h1 className="mt-4 font-heading text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Campus Placement <br />
              <span className="bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                Intelligence & Benchmarking
              </span>
            </h1>

            {/* Description */}
            <p className="mt-4 text-sm leading-relaxed text-zinc-300 sm:text-base">
              Corporate dossiers, salary tier analytics, and Bloom&apos;s Taxonomy technical skill
              ladders designed to give students and recruiters at{" "}
              <span className="font-semibold text-zinc-100">{COLLEGE_NAME}</span> an institutional
              strategic edge.
            </p>

            {/* Hero Quick Action Buttons */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a
                href="#directory"
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-white px-4 py-2.5 text-xs font-bold text-zinc-950 shadow-md transition-all hover:bg-zinc-200"
              >
                <Briefcase className="h-4 w-4" />
                Explore Recruiting Companies
              </a>
              <Link
                to="/company/skills"
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-2.5 text-xs font-semibold text-zinc-200 shadow-sm transition-colors hover:border-zinc-700 hover:text-white"
              >
                <Layers className="h-4 w-4 text-zinc-400" />
                View Skill Matrix
              </Link>
              <Link
                to="/talent-check"
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-4 py-2.5 text-xs font-semibold text-emerald-300 shadow-sm transition-colors hover:bg-emerald-900/50 hover:text-emerald-100"
              >
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Talent Check & Readiness
              </Link>
            </div>
          </div>

          {/* 4. Executive KPI Dashboard Bar */}
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {/* Recruiters Card */}
            <div className="group relative rounded-2xl border border-zinc-800 bg-[#0b0b0d] p-4.5 shadow-md transition-all duration-300 hover:border-zinc-600 hover:bg-[#111114]">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-semibold tracking-wide">Recruiting Partners</span>
                <Building2 className="h-4 w-4 text-zinc-300" />
              </div>
              <p className="mt-2.5 font-heading text-3xl font-extrabold tracking-tight text-white">
                {companies.length}
              </p>
              <p className="mt-1 text-[11px] font-medium text-zinc-400">Active Campus Recruiters</p>
            </div>

            {/* Super Dream Card */}
            <div className="group relative rounded-2xl border border-zinc-800 bg-[#0b0b0d] p-4.5 shadow-md transition-all duration-300 hover:border-zinc-500 hover:bg-[#111114]">
              <div className="flex items-center justify-between text-zinc-200">
                <span className="text-xs font-semibold tracking-wide">Super Dream Roles</span>
                <Trophy className="h-4 w-4 text-zinc-100" />
              </div>
              <p className="mt-2.5 font-heading text-3xl font-extrabold tracking-tight text-white">
                {superDreamCount}
              </p>
              <p className="mt-1 text-[11px] font-medium text-zinc-400">₹18+ LPA Premium Tier</p>
            </div>

            {/* Dream Card (Monochrome Titanium, No Blue) */}
            <div className="group relative rounded-2xl border border-zinc-800 bg-[#0b0b0d] p-4.5 shadow-md transition-all duration-300 hover:border-zinc-500 hover:bg-[#111114]">
              <div className="flex items-center justify-between text-zinc-300">
                <span className="text-xs font-semibold tracking-wide">Dream Roles</span>
                <GraduationCap className="h-4 w-4 text-zinc-300" />
              </div>
              <p className="mt-2.5 font-heading text-3xl font-extrabold tracking-tight text-white">
                {dreamCount}
              </p>
              <p className="mt-1 text-[11px] font-medium text-zinc-400">₹10–18 LPA High CTC</p>
            </div>

            {/* Standard & Regular Card */}
            <div className="group relative rounded-2xl border border-zinc-800 bg-[#0b0b0d] p-4.5 shadow-md transition-all duration-300 hover:border-zinc-600 hover:bg-[#111114]">
              <div className="flex items-center justify-between text-emerald-400">
                <span className="text-xs font-semibold tracking-wide">Standard & Regular</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="mt-2.5 font-heading text-3xl font-extrabold tracking-tight text-white">
                {standardRegularCount}
              </p>
              <p className="mt-1 text-[11px] font-medium text-zinc-400">Core IT & Consulting</p>
            </div>
          </div>
        </div>
      </header>

      {/* 5. Spotlight Highlights Strip */}
      <section className="border-b border-zinc-800/80 bg-[#09090b]/80 py-3">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 text-xs text-zinc-400 sm:px-6">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-zinc-300" />
            <span className="font-semibold text-zinc-200">Placement Preparation Protocol:</span>
            <span>
              Review technical competencies, system design requirements, and past hiring patterns.
            </span>
          </div>
          <div className="flex items-center gap-4 text-zinc-500">
            <span>Verified Data Sources</span>
            <span>·</span>
            <span>Live Sync Supabase</span>
            <span>·</span>
            <span className="text-zinc-400">JSSATEN T&P Verified</span>
          </div>
        </div>
      </section>

      {/* 6. Main Directory & Controls */}
      <main id="directory" className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Controls Bar: Search & Sort & View */}
        <div className="flex flex-col gap-3 rounded-2xl border border-zinc-800/80 bg-[#0c0c0e] p-4 shadow-md sm:flex-row sm:items-center">
          {/* Omni Search Bar */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              ref={searchInputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by company name, location, domain, or placement tier... (Press / to focus)"
              aria-label="Search companies"
              className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950/80 pl-10 pr-16 text-sm text-zinc-100 placeholder-zinc-500 shadow-inner outline-none transition-colors focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400"
            />
            <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
              {query ? (
                <button
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : (
                <kbd className="pointer-events-none hidden rounded border border-zinc-700 bg-zinc-800/80 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 sm:inline-block">
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
                <Compass className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-zinc-400" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  aria-label="Filter by industry category"
                  className="h-11 rounded-xl border border-zinc-800 bg-zinc-950/80 pl-8 pr-4 text-xs font-medium text-zinc-200 shadow-sm outline-none transition-colors focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400"
                >
                  {categories.map((c) => (
                    <option key={c} value={c} className="bg-zinc-900 text-zinc-100">
                      {c === "All" ? "All Domains" : c}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Sort Selector */}
            <div className="relative flex items-center">
              <ArrowUpDown className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-zinc-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                aria-label="Sort companies"
                className="h-11 rounded-xl border border-zinc-800 bg-zinc-950/80 pl-8 pr-4 text-xs font-medium text-zinc-200 shadow-sm outline-none transition-colors focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400"
              >
                <option value="default" className="bg-zinc-900 text-zinc-100">
                  Sort: Default
                </option>
                <option value="name" className="bg-zinc-900 text-zinc-100">
                  Sort: Name (A–Z)
                </option>
                <option value="growth" className="bg-zinc-900 text-zinc-100">
                  Sort: YoY Growth
                </option>
                <option value="tier" className="bg-zinc-900 text-zinc-100">
                  Sort: Role Tier
                </option>
              </select>
            </div>

            {/* View Switcher */}
            <div className="flex h-11 items-center rounded-xl border border-zinc-800 bg-zinc-950/80 p-1 shadow-sm">
              <button
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                  viewMode === "grid"
                    ? "bg-white text-zinc-950 shadow-xs"
                    : "text-zinc-400 hover:text-white",
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
                    ? "bg-white text-zinc-950 shadow-xs"
                    : "text-zinc-400 hover:text-white",
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
                      ? "border-zinc-800 bg-[#0c0c0e] text-zinc-300 hover:border-zinc-600 hover:text-white"
                      : TYPE_STYLES[f as CompanyType],
                )}
              >
                {f}
                <span
                  className={cn(
                    "ml-1.5 rounded-full px-1.5 py-0.2 text-[10px]",
                    active ? "bg-black/20 text-current" : "bg-white/10 text-zinc-300",
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
          <div className="mt-3 flex items-center justify-between text-xs text-zinc-400">
            <span>
              Showing <strong className="text-white">{visible.length}</strong> of {companies.length}{" "}
              recruiting partners
            </span>
            <button
              onClick={reset}
              className="text-xs font-semibold text-zinc-300 underline hover:text-white cursor-pointer"
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
                <div
                  key={i}
                  className="rounded-2xl border border-zinc-800 bg-[#0c0c0e] p-5 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-12 w-12 rounded-xl bg-zinc-800" />
                    <Skeleton className="h-6 w-24 rounded-full bg-zinc-800" />
                  </div>
                  <Skeleton className="h-6 w-3/4 bg-zinc-800" />
                  <Skeleton className="h-4 w-1/2 bg-zinc-800" />
                  <Skeleton className="h-24 w-full rounded-xl bg-zinc-800/60" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-12 text-center">
              <p className="font-heading text-lg font-semibold text-rose-400">
                Failed to load recruiting company profiles
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                {error ?? "Unable to retrieve company intelligence records."}
              </p>
              <Button
                variant="outline"
                className="mt-4 border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-white"
                onClick={() => refetch()}
              >
                Retry Request
              </Button>
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 bg-[#0c0c0e]/60 py-16 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-zinc-400">
                <Search className="h-6 w-6" />
              </div>
              <p className="mt-4 font-heading text-lg font-bold text-white">
                No recruiting companies found
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                Try adjusting your search query, clearing domain filters, or switching the placement
                tier.
              </p>
              <Button
                variant="outline"
                className="mt-5 rounded-xl border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-white"
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
            <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#0c0c0e] shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-zinc-300">
                  <thead className="border-b border-zinc-800 bg-[#121215] text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
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
                  <tbody className="divide-y divide-zinc-800/70">
                    {visible.map((c) => {
                      const down = c.yoyGrowthRate.trim().startsWith("-");
                      return (
                        <tr
                          key={c.id}
                          onClick={() => onSelect(c)}
                          className="cursor-pointer transition-colors duration-150 hover:bg-zinc-900/60"
                        >
                          <td className="px-5 py-4 font-medium">
                            <div className="flex items-center gap-3">
                              <CompanyLogo
                                name={c.name}
                                logoUrl={c.logoUrl}
                                websiteUrl={c.websiteUrl}
                                className="h-10 w-10 rounded-lg border border-zinc-800 bg-zinc-950"
                              />
                              <div>
                                <p className="font-heading font-semibold text-white">{c.name}</p>
                                <p className="text-xs text-zinc-400">{c.shortName}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-xs text-zinc-300">
                            {c.category ? (
                              <span className="rounded bg-zinc-900 px-2 py-0.5 border border-zinc-800 text-zinc-300">
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
                          <td className="px-5 py-4 text-xs text-zinc-400">
                            <Val v={c.headquarters} />
                          </td>
                          <td className="px-5 py-4 text-xs text-zinc-400">
                            <Val v={c.employeeSize} />
                          </td>
                          <td className="px-5 py-4 text-xs">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 font-semibold",
                                down ? "text-rose-400" : "text-emerald-400",
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
                              className="rounded-lg text-zinc-300 hover:bg-zinc-800 hover:text-white"
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
        <div className="mt-16 rounded-3xl border border-zinc-800 bg-gradient-to-b from-[#111114] to-[#070709] p-8 shadow-2xl sm:p-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs font-semibold text-zinc-300">
                <GraduationCap className="h-3.5 w-3.5 text-zinc-200" />
                Strategic Career Intelligence
              </div>
              <h2 className="font-heading text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Ready to evaluate company requirements?
              </h2>
              <p className="text-sm leading-relaxed text-zinc-400">
                Inspect structured Bloom&apos;s Taxonomy skill ladders, difficulty benchmarks, and
                corporate culture dossiers to sharpen your preparation before sitting for technical
                interviews.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                to="/company/skills"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-white px-5 py-3 text-xs font-bold text-zinc-950 shadow-md transition-colors hover:bg-zinc-200"
              >
                <Layers className="h-4 w-4" />
                Explore Skill Ladders
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* 8. Institutional Footer */}
      <footer className="mt-16 border-t border-zinc-800/80 bg-[#050506] py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 font-heading text-xs font-bold text-white">
                  PI
                </div>
                <span className="font-heading text-base font-bold text-white">{APP_NAME}</span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-zinc-400">
                {COLLEGE_NAME} (JSSATEN)
                <br />
                Department of Training and Placement
                <br />
                C-20/1, Sector 62, Noida, Uttar Pradesh 201301
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                Quick Navigation
              </h4>
              <ul className="mt-3 space-y-2 text-xs text-zinc-400">
                <li>
                  <a href="#directory" className="transition-colors hover:text-white">
                    Recruiter Directory
                  </a>
                </li>
                <li>
                  <Link to="/company/skills" className="transition-colors hover:text-white">
                    Skill Matrix & Cognitive Levels
                  </Link>
                </li>
                <li>
                  <Link to="/company/intelligence" className="transition-colors hover:text-white">
                    Corporate Dossiers
                  </Link>
                </li>
                <li>
                  <Link to="/talent-check" className="transition-colors hover:text-white text-emerald-400">
                    Talent Check & Readiness Benchmarking
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                Accreditation & Standards
              </h4>
              <p className="mt-3 text-xs leading-relaxed text-zinc-400">
                Approved by AICTE, Ministry of Education, Govt. of India. Affiliated to Dr. A.P.J.
                Abdul Kalam Technical University (AKTU), Lucknow.
              </p>
              <p className="mt-3 text-[11px] text-zinc-500">
                © {new Date().getFullYear()} {APP_NAME} · JSSATEN T&P Cell. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
