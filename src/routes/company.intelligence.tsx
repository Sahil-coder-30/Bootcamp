import { createFileRoute } from "@tanstack/react-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  Calendar,
  ChevronUp,
  Compass,
  Copy,
  ExternalLink,
  Globe,
  Linkedin,
  MapPin,
  PlayCircle,
  Search,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { CompanyLogo } from "@/components/CompanyLogo";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { buildIntelligenceSections, type IntelField, type IntelSection } from "@/data/intelligenceData";
import { useSelectedCompanyGuard } from "@/hooks/use-selected-company";
import { useCompanyProfile } from "@/lib/companyApi";
import { isNullish, splitItems } from "@/lib/companyData";
import { COLLEGE_SHORT } from "@/lib/college";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/company/intelligence")({
  head: () => ({
    meta: [
      { title: `Company Intelligence · ${COLLEGE_SHORT} Placement Hub` },
      { name: "description", content: "22-section research profile of the selected recruiting company." },
      { property: "og:title", content: `Company Intelligence · ${COLLEGE_SHORT} Placement Hub` },
      { property: "og:description", content: "Deep research profile of a recruiting company for campus placements." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CompanyIntelligence,
});

const NotAvailable = () => (
  <span className="inline-flex rounded-full bg-secondary/80 px-2.5 py-0.5 text-xs font-medium text-muted-foreground/80">
    Not Publicly Disclosed
  </span>
);

const Pills = ({ items }: { items: string[] }) => (
  <div className="flex flex-wrap gap-1.5">
    {items.map((i, k) => (
      <span
        key={k}
        className="rounded-lg border border-border/70 bg-secondary/60 px-2.5 py-1 text-xs font-medium text-secondary-foreground shadow-2xs"
      >
        {i}
      </span>
    ))}
  </div>
);

function renderValue(field: IntelField) {
  const v = field.value ?? "";
  if (isNullish(v)) return <NotAvailable />;
  const isUrl = /^https?:\/\//i.test(v);

  if (field.type === "video" && isUrl) {
    return (
      <a
        href={v}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
      >
        <PlayCircle className="h-4 w-4" /> Watch Official Showcase
      </a>
    );
  }

  if (field.type === "url" || isUrl) {
    return (
      <a
        href={v}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 break-all text-xs font-medium text-primary hover:underline"
      >
        <span>{v.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</span>
        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
      </a>
    );
  }

  if (field.type === "rating") {
    const m = v.match(/([\d.]+)\s*\/\s*(\d+)/);
    if (m) {
      const score = Number(m[1]);
      const max = Number(m[2]);
      const pct = (score / max) * 100;
      return (
        <div className="inline-flex items-center gap-2.5">
          <div className="flex items-center gap-1 text-amber-500">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span className="font-heading text-sm font-bold text-foreground">{v}</span>
          </div>
          <div className="h-2 w-28 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      );
    }
  }

  if (field.type === "paragraph") {
    return (
      <p className="leading-relaxed text-sm text-foreground/90 whitespace-pre-line">
        {v}
      </p>
    );
  }

  if (field.type === "list" || v.includes(";")) {
    const items = splitItems(v);
    if (items.length > 1) return <Pills items={items} />;
  }

  if (field.type === "auto" && v.includes(",") && v.length < 160 && !/\d,\d/.test(v)) {
    const items = v.split(",").map((s) => s.trim()).filter(Boolean);
    if (items.length > 2) return <Pills items={items} />;
  }

  return <span className="font-medium text-foreground">{v}</span>;
}

function FieldRow({ field }: { field: IntelField }) {
  return (
    <div className="flex flex-col gap-1.5 border-b border-border/50 py-3.5 last:border-0 sm:flex-row sm:items-start sm:gap-6">
      <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:w-1/3">
        {field.label}
      </dt>
      <dd className="text-sm sm:w-2/3">{renderValue(field)}</dd>
    </div>
  );
}

const SectionCard = memo(function SectionCard({
  section,
  index,
}: {
  section: IntelSection;
  index: number;
}) {
  const filled = section.fields.filter((f) => !isNullish(f.value)).length;
  const Icon = section.icon;

  return (
    <section
      id={section.id}
      data-section
      className="scroll-mt-36 rounded-2xl border border-border/80 bg-card shadow-xs transition-shadow duration-200 hover:shadow-md"
    >
      <header className="flex items-center gap-3 border-b border-border/70 bg-secondary/30 px-5 py-3.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-2xs">
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              Section {String(index + 1).padStart(2, "0")}
            </span>
          </div>
          <h2 className="font-heading text-base font-bold tracking-tight text-foreground">
            {section.title}
          </h2>
        </div>
        <span
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-xs font-semibold",
            filled === section.fields.length
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "border-border/80 bg-secondary text-muted-foreground",
          )}
        >
          {filled}/{section.fields.length} Verified
        </span>
      </header>
      <dl className="px-5 divide-y divide-border/40">
        {section.fields.map((f) => (
          <FieldRow key={f.key} field={f} />
        ))}
      </dl>
    </section>
  );
});

function CompanyIntelligence() {
  const selected = useSelectedCompanyGuard();
  const {
    data: profile,
    isLoading,
    isError,
    error,
    refetch,
  } = useCompanyProfile(selected?.companyId);

  const sections = useMemo(() => buildIntelligenceSections(profile ?? undefined), [profile]);
  const [active, setActive] = useState(0);
  const [filterQuery, setFilterQuery] = useState("");
  const isScrollingRef = useRef(false);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Calculate completeness statistics
  const { totalFields, filledFields, coveragePct } = useMemo(() => {
    let total = 0;
    let filled = 0;
    sections.forEach((s) => {
      s.fields.forEach((f) => {
        total++;
        if (!isNullish(f.value)) filled++;
      });
    });
    const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
    return { totalFields: total, filledFields: filled, coveragePct: pct };
  }, [sections]);

  useEffect(() => {
    if (!profile) return;
    const onScroll = () => {
      if (isScrollingRef.current) return;
      const els = Array.from(document.querySelectorAll<HTMLElement>("[data-section]"));
      let idx = 0;
      els.forEach((el, i) => {
        if (el.getBoundingClientRect().top < 200) idx = i;
      });
      setActive(idx);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [profile]);

  useEffect(() => {
    tabRefs.current[active]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [active]);

  const scrollToSection = useCallback((idx: number) => {
    isScrollingRef.current = true;
    setActive(idx);
    document.getElementById(`section-${idx}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      isScrollingRef.current = false;
    }, 800);
  }, []);

  const copyIntelSummary = () => {
    if (!profile) return;
    const summary = `${profile.name} (${profile.short_name || profile.name})\nCategory: ${profile.category || "N/A"}\nHeadquarters: ${profile["headquarters_address"] || "N/A"}\nWebsite: ${profile.website_url || "N/A"}`;
    navigator.clipboard.writeText(summary);
    toast.success("Company research summary copied to clipboard!");
  };

  if (!selected || isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="grid gap-4">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8">
          <h2 className="font-heading text-lg font-bold text-destructive">
            Failed to load company intelligence
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Unable to retrieve intelligence parameters."}
          </p>
          <Button variant="outline" className="mt-4 rounded-xl" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Filter sections if user is searching within sections
  const filteredSections = sections.filter((s) => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    return (
      s.title.toLowerCase().includes(q) ||
      s.fields.some((f) => f.label.toLowerCase().includes(q) || String(f.value || "").toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Executive Hero Summary Banner */}
      <div className="border-b border-border/80 bg-gradient-to-b from-card via-card/80 to-background px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4">
              <CompanyLogo
                name={profile.name}
                logoUrl={profile.logo_url}
                websiteUrl={profile.website_url}
                className="h-16 w-16 shadow-md md:h-20 md:w-20"
              />
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    {profile.name}
                  </h1>
                  {profile.short_name && profile.short_name !== profile.name && (
                    <span className="rounded-lg border border-border/80 bg-secondary px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                      {profile.short_name}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {profile.category && (
                    <span className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">
                      {profile.category}
                    </span>
                  )}
                  {profile["nature_of_company"] && (
                    <span className="rounded-full border border-border/80 px-2.5 py-0.5">
                      {profile["nature_of_company"]}
                    </span>
                  )}
                  {profile["incorporation_year"] && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> Est. {profile["incorporation_year"]}
                    </span>
                  )}
                </div>

                {profile["headquarters_address"] && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 text-primary/80" />
                    <span>{profile["headquarters_address"]}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {!isNullish(profile.website_url) && (
                <Button asChild variant="outline" size="sm" className="rounded-xl shadow-2xs">
                  <a href={profile.website_url} target="_blank" rel="noreferrer">
                    <Globe className="mr-1.5 h-3.5 w-3.5" />
                    Website
                  </a>
                </Button>
              )}
              {!isNullish(profile.linkedin_url) && (
                <Button asChild variant="outline" size="sm" className="rounded-xl shadow-2xs">
                  <a href={profile.linkedin_url} target="_blank" rel="noreferrer">
                    <Linkedin className="mr-1.5 h-3.5 w-3.5 text-blue-600" />
                    LinkedIn
                  </a>
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={copyIntelSummary}
                className="rounded-xl shadow-2xs"
              >
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                Copy Summary
              </Button>
            </div>
          </div>

          {/* Research Completeness Metric Bar */}
          <div className="mt-6 rounded-2xl border border-border/80 bg-background/80 p-4 shadow-xs">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-heading text-xs font-bold uppercase tracking-wider text-foreground">
                  Intelligence Completeness
                </span>
                <span className="text-xs text-muted-foreground">
                  ({filledFields} of {totalFields} parameters documented across 22 sections)
                </span>
              </div>
              <span className="font-heading text-sm font-bold text-primary">
                {coveragePct}% Profile Coverage
              </span>
            </div>
            <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-blue-500 transition-all duration-500"
                style={{ width: `${coveragePct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Interactive Section Navigation Rail */}
      <div className="sticky top-14 z-20 border-b border-border/80 bg-background/95 px-4 py-2.5 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <nav className="no-scrollbar flex flex-1 gap-1.5 overflow-x-auto py-1">
            {sections.map((s, i) => {
              const Icon = s.icon;
              const isActive = active === i;
              return (
                <button
                  key={s.id}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  onClick={() => scrollToSection(i)}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{s.title}</span>
                </button>
              );
            })}
          </nav>

          {/* Section quick search */}
          <div className="relative hidden w-48 sm:block">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Search in sections..."
              className="h-8 w-full rounded-lg border border-border/70 bg-card pl-8 pr-3 text-xs outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* 22 Intelligence Section Cards */}
      <div className="mx-auto max-w-5xl space-y-5 p-4 py-8 pb-24 sm:px-6">
        {filteredSections.map((s) => {
          const originalIndex = sections.findIndex((orig) => orig.id === s.id);
          return <SectionCard key={s.id} section={s} index={originalIndex} />;
        })}
      </div>

      {/* Floating Back to Top Button */}
      <div className="fixed bottom-6 right-6 z-30">
        <Button
          size="icon"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="h-10 w-10 rounded-full shadow-lg"
          aria-label="Scroll to top"
        >
          <ChevronUp className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
