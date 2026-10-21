import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { memo, useEffect, useMemo, useState } from "react";
import { ArrowRight, MapPin, Search, TrendingDown, TrendingUp, Users, X } from "lucide-react";
import { CompanyLogo } from "@/components/CompanyLogo";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCompany } from "@/lib/company-context";
import { getCompanySummaries, isNullish, type CompanySummary, type CompanyType } from "@/lib/companyData";
import { COLLEGE_SHORT, PORTAL_TITLE } from "@/lib/college";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${COLLEGE_SHORT} Companies Research & Placement Analytics Portal` },
      { name: "description", content: "Browse recruiting companies and research them before campus placements at JSS Academy of Technical Education." },
      { property: "og:title", content: `${COLLEGE_SHORT} Companies Research & Placement Analytics Portal` },
      { property: "og:description", content: "Your strategic edge for campus placements." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const FILTERS: ("All" | CompanyType)[] = ["All", "Super Dream", "Dream", "Standard", "Regular"];
export const TYPE_STYLES: Record<CompanyType, string> = {
  "Super Dream": "bg-super-dream/10 text-super-dream border-super-dream/30",
  Dream: "bg-dream/10 text-dream border-dream/30",
  Standard: "bg-standard/10 text-standard border-standard/30",
  Regular: "bg-regular/10 text-regular border-regular/30",
};
const ACTIVE_STYLES: Record<string, string> = {
  All: "bg-foreground text-background border-foreground",
  "Super Dream": "bg-super-dream text-primary-foreground border-super-dream",
  Dream: "bg-dream text-primary-foreground border-dream",
  Standard: "bg-standard text-primary-foreground border-standard",
  Regular: "bg-regular text-primary-foreground border-regular",
};

function Val({ v }: { v: string }) {
  return isNullish(v) ? <span className="italic text-muted-foreground">not publicly available</span> : <>{v}</>;
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
    <button
      onClick={() => onSelect(company)}
      className="group relative flex flex-col gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-2">
        <CompanyLogo name={company.name} logoUrl={company.logoUrl} websiteUrl={company.websiteUrl} />
        <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", TYPE_STYLES[company.companyType])}>
          {company.companyType}
        </span>
      </div>
      <div>
        <h3 className="font-heading text-base font-semibold leading-tight">{company.name}</h3>
        <p className="text-sm text-muted-foreground">{company.shortName}</p>
      </div>
      <ul className="space-y-1.5 text-sm text-muted-foreground">
        <li className="flex items-center gap-2"><MapPin className="h-4 w-4 shrink-0" /><Val v={company.headquarters} /></li>
        <li className="flex items-center gap-2"><Users className="h-4 w-4 shrink-0" /><Val v={company.employeeSize} /></li>
        <li className={cn("flex items-center gap-2", down ? "text-destructive" : "text-success")}>
          {down ? <TrendingDown className="h-4 w-4 shrink-0" /> : <TrendingUp className="h-4 w-4 shrink-0" />}
          <span>YoY growth <Val v={company.yoyGrowthRate} /></span>
        </li>
      </ul>
      <ArrowRight className="absolute bottom-4 right-4 h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
    </button>
  );
});

function Index() {
  const navigate = useNavigate();
  const { selectCompany } = useCompany();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [ready, setReady] = useState(false);
  const companies = useMemo(() => getCompanySummaries(), []);

  useEffect(() => setReady(true), []);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim().toLowerCase()), 200);
    return () => clearTimeout(t);
  }, [query]);

  const searched = useMemo(
    () =>
      companies.filter((c) =>
        !debounced || [c.name, c.shortName, c.headquarters, c.category].some((s) => s.toLowerCase().includes(debounced)),
      ),
    [companies, debounced],
  );
  const visible = filter === "All" ? searched : searched.filter((c) => c.companyType === filter);
  const count = (f: (typeof FILTERS)[number]) => (f === "All" ? searched.length : searched.filter((c) => c.companyType === f).length);

  const onSelect = (c: CompanySummary) => {
    selectCompany({ companyId: c.id, companyName: c.name, logoUrl: c.logoUrl });
    navigate({ to: "/company/intelligence" });
  };
  const reset = () => { setQuery(""); setDebounced(""); setFilter("All"); };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
          <span className="inline-flex rounded-full border bg-secondary px-3 py-1 text-xs font-semibold tracking-wider text-muted-foreground">
            {COLLEGE_SHORT} · INTELLIGENCE PLATFORM
          </span>
          <h1 className="mt-4 max-w-4xl text-2xl font-semibold leading-tight tracking-tight sm:text-4xl">{PORTAL_TITLE}</h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">Your strategic edge for campus placements</p>
          <div className="relative mt-6 max-w-2xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search companies, locations, categories…"
              aria-label="Search companies"
              className="h-11 w-full rounded-lg border bg-background pl-10 pr-10 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                filter === f ? ACTIVE_STYLES[f] : f === "All" ? "bg-background text-foreground" : TYPE_STYLES[f as CompanyType],
              )}
            >
              {f} <span className="ml-1 opacity-75">{count(f)}</span>
            </button>
          ))}
        </div>

        {!ready ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-xl border border-dashed py-16 text-center">
            <p className="font-heading text-lg font-semibold">No companies match</p>
            <p className="mt-1 text-sm text-muted-foreground">Try a different search or category.</p>
            <Button variant="outline" className="mt-4" onClick={reset}>Reset filters</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {visible.map((c) => <CompanyCard key={c.id} company={c} onSelect={onSelect} />)}
          </div>
        )}
      </main>
    </div>
  );
}
