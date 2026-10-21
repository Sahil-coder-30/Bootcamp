import { createFileRoute } from "@tanstack/react-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Linkedin, Globe, PlayCircle, Star } from "lucide-react";
import { CompanyLogo } from "@/components/CompanyLogo";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { buildIntelligenceSections, type IntelField, type IntelSection } from "@/data/intelligenceData";
import { useSelectedCompanyGuard } from "@/hooks/use-selected-company";
import { getCompanyProfile, isNullish, splitItems } from "@/lib/companyData";
import { COLLEGE_SHORT } from "@/lib/college";
import { cn } from "@/lib/utils";

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
  <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">Not Available</span>
);

const Pills = ({ items }: { items: string[] }) => (
  <div className="flex flex-wrap gap-1.5">
    {items.map((i, k) => (
      <span key={k} className="rounded-md border bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{i}</span>
    ))}
  </div>
);

function renderValue(field: IntelField) {
  const v = field.value ?? "";
  if (isNullish(v)) return <NotAvailable />;
  const isUrl = /^https?:\/\//i.test(v);
  if (field.type === "video" && isUrl)
    return (
      <a href={v} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-primary hover:underline">
        <PlayCircle className="h-4 w-4" /> Watch video
      </a>
    );
  if (field.type === "url" || isUrl)
    return (
      <a href={v} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 break-all text-primary hover:underline">
        {v.replace(/^https?:\/\/(www\.)?/, "")} <ExternalLink className="h-3 w-3 shrink-0" />
      </a>
    );
  if (field.type === "rating") {
    const m = v.match(/([\d.]+)\s*\/\s*(\d+)/);
    if (m) {
      const pct = (Number(m[1]) / Number(m[2])) * 100;
      return (
        <span className="inline-flex items-center gap-2">
          <Star className="h-4 w-4 fill-regular text-regular" />
          <span className="font-medium">{v}</span>
          <span className="h-1.5 w-20 overflow-hidden rounded-full bg-muted"><span className="block h-full bg-regular" style={{ width: `${pct}%` }} /></span>
        </span>
      );
    }
  }
  if (field.type === "paragraph") return <p className="leading-relaxed">{v}</p>;
  if (field.type === "list" || v.includes(";")) {
    const items = splitItems(v);
    if (items.length > 1) return <Pills items={items} />;
  }
  if (field.type === "auto" && v.includes(",") && v.length < 160 && !/\d,\d/.test(v)) {
    const items = v.split(",").map((s) => s.trim()).filter(Boolean);
    if (items.length > 2) return <Pills items={items} />;
  }
  return <span>{v}</span>;
}

function FieldRow({ field }: { field: IntelField }) {
  return (
    <div className="flex flex-col gap-1 border-b py-3 last:border-0 sm:flex-row sm:gap-4">
      <dt className="text-sm font-medium text-muted-foreground sm:w-1/3">{field.label}</dt>
      <dd className="text-sm sm:w-2/3">{renderValue(field)}</dd>
    </div>
  );
}

const SectionCard = memo(function SectionCard({ section }: { section: IntelSection }) {
  const filled = section.fields.filter((f) => !isNullish(f.value)).length;
  const Icon = section.icon;
  return (
    <section id={section.id} data-section className="scroll-mt-32 rounded-xl border bg-card">
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-accent-foreground"><Icon className="h-4 w-4" /></span>
        <h2 className="flex-1 text-base font-semibold">{section.title}</h2>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">{filled}/{section.fields.length}</span>
      </header>
      <dl className="px-4">{section.fields.map((f) => <FieldRow key={f.key} field={f} />)}</dl>
    </section>
  );
});

function CompanyIntelligence() {
  const selected = useSelectedCompanyGuard();
  const profile = useMemo(() => (selected ? getCompanyProfile(selected.companyId) : null), [selected]);
  const sections = useMemo(() => buildIntelligenceSections(profile ?? undefined), [profile]);
  const [active, setActive] = useState(0);
  const isScrollingRef = useRef(false);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!profile) return;
    const onScroll = () => {
      if (isScrollingRef.current) return;
      const els = Array.from(document.querySelectorAll<HTMLElement>("[data-section]"));
      let idx = 0;
      els.forEach((el, i) => { if (el.getBoundingClientRect().top < 160) idx = i; });
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
    window.setTimeout(() => { isScrollingRef.current = false; }, 800);
  }, []);

  if (!selected || !profile) {
    return <div className="space-y-4 p-4"><Skeleton className="h-16" /><Skeleton className="h-64" /></div>;
  }

  return (
    <div>
      <div className="sticky top-0 z-20 border-b bg-background">
        <div className="flex items-center gap-3 px-4 py-3">
          <CompanyLogo name={profile.name} logoUrl={profile.logo_url} websiteUrl={profile.website_url} className="h-10 w-10" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold sm:text-xl">{profile.name}</h1>
            {profile.category && <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">{profile.category}</span>}
          </div>
          {!isNullish(profile.website_url) && (
            <Button asChild variant="outline" size="sm"><a href={profile.website_url} target="_blank" rel="noreferrer"><Globe className="h-4 w-4" /><span className="hidden sm:inline">Website</span></a></Button>
          )}
          {!isNullish(profile.linkedin_url) && (
            <Button asChild variant="outline" size="sm"><a href={profile.linkedin_url} target="_blank" rel="noreferrer"><Linkedin className="h-4 w-4" /><span className="hidden sm:inline">LinkedIn</span></a></Button>
          )}
        </div>
        <nav className="no-scrollbar flex gap-1 overflow-x-auto border-t px-2 py-2">
          {sections.map((s, i) => (
            <button
              key={s.id}
              ref={(el) => { tabRefs.current[i] = el; }}
              onClick={() => scrollToSection(i)}
              className={cn(
                "shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm",
                active === i ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              {s.title}
            </button>
          ))}
        </nav>
      </div>
      <div className="mx-auto max-w-5xl space-y-4 p-4 pb-24">
        {sections.map((s) => <SectionCard key={s.id} section={s} />)}
      </div>
    </div>
  );
}
