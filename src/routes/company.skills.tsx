import { createFileRoute } from "@tanstack/react-router";
import { memo, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, Lock } from "lucide-react";
import { CompanyLogo } from "@/components/CompanyLogo";
import { Skeleton } from "@/components/ui/skeleton";
import { SKILL_TOPICS } from "@/data/skillTopics";
import { useSelectedCompanyGuard } from "@/hooks/use-selected-company";
import {
  getCompanyProfile, getCompanySkills, proficiencyToBloom, scoreToCriticality,
  type Bloom, type Criticality, type DashboardSkill,
} from "@/lib/companyData";
import { COLLEGE_SHORT } from "@/lib/college";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/company/skills")({
  head: () => ({
    meta: [
      { title: `Skill Intelligence · ${COLLEGE_SHORT} Placement Hub` },
      { name: "description", content: "Skills a recruiting company expects, with Bloom levels and a 10-step roadmap." },
      { property: "og:title", content: `Skill Intelligence · ${COLLEGE_SHORT} Placement Hub` },
      { property: "og:description", content: "Required skills, criticality and learning roadmaps for campus placements." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SkillIntelligence,
});

const BLOOM: Record<Bloom, { label: string; badge: string; bar: string }> = {
  CU: { label: "Comprehend & Understand", badge: "bg-bloom-cu/10 text-bloom-cu border-bloom-cu/30", bar: "bg-bloom-cu" },
  AP: { label: "Apply", badge: "bg-bloom-ap/10 text-bloom-ap border-bloom-ap/30", bar: "bg-bloom-ap" },
  AS: { label: "Analyse & Synthesise", badge: "bg-bloom-as/10 text-bloom-as border-bloom-as/30", bar: "bg-bloom-as" },
  EV: { label: "Evaluate", badge: "bg-bloom-ev/10 text-bloom-ev border-bloom-ev/30", bar: "bg-bloom-ev" },
  CR: { label: "Create", badge: "bg-bloom-cr/10 text-bloom-cr border-bloom-cr/30", bar: "bg-bloom-cr" },
};
const CRIT: Record<Criticality, { desc: string; cls: string }> = {
  Critical: { desc: "Score 7+ — must be strong before interviews", cls: "text-destructive" },
  Important: { desc: "Score 5–6 — solid working knowledge expected", cls: "text-regular" },
  Baseline: { desc: "Below 5 — familiarity is enough", cls: "text-muted-foreground" },
};

const SkillCard = memo(function SkillCard({ skill }: { skill: DashboardSkill }) {
  const [open, setOpen] = useState(false);
  const bloom = proficiencyToBloom(skill.level);
  const crit = scoreToCriticality(skill.level);
  const topics = SKILL_TOPICS[skill.id] ?? [];
  return (
    <div className="rounded-xl border bg-card">
      <button onClick={() => setOpen((o) => !o)} className="w-full p-4 text-left" aria-expanded={open}>
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold">{skill.name}</h3>
              <span className={cn("rounded-full border px-2 py-0.5 text-xs font-semibold", BLOOM[bloom].badge)}>{bloom}</span>
            </div>
            <p className={cn("mt-1 text-xs font-medium", CRIT[crit].cls)}>{crit} · {skill.proficiency}</p>
          </div>
          <span className="font-heading text-lg font-semibold">{skill.level}<span className="text-sm text-muted-foreground">/10</span></span>
          <ChevronDown className={cn("mt-1 h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full rounded-full", BLOOM[bloom].bar)} style={{ width: `${skill.level * 10}%` }} />
        </div>
      </button>
      {open && (
        <ol className="border-t px-4 py-3">
          {topics.map((t, i) => {
            const lvl = i + 1;
            const locked = lvl > skill.level;
            return (
              <li key={lvl} className={cn("flex items-center gap-3 py-1.5 text-sm", locked && "text-muted-foreground")}>
                <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold", locked ? "bg-muted" : cn(BLOOM[proficiencyToBloom(lvl)].bar, "text-primary-foreground"))}>{lvl}</span>
                <span className="flex-1">{t}</span>
                {locked ? (
                  <span className="inline-flex items-center gap-1 text-xs"><Lock className="h-3 w-3" />Beyond scope</span>
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
});

function SkillIntelligence() {
  const selected = useSelectedCompanyGuard();
  const profile = useMemo(() => (selected ? getCompanyProfile(selected.companyId) : null), [selected]);
  const skills = useMemo(() => (selected ? getCompanySkills(selected.companyId) : []), [selected]);

  if (!selected || !profile) return <div className="space-y-4 p-4"><Skeleton className="h-16" /><Skeleton className="h-64" /></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 pb-24">
      <div className="flex items-center gap-3 border-b pb-4">
        <CompanyLogo name={profile.name} logoUrl={profile.logo_url} websiteUrl={profile.website_url} />
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">{profile.short_name || profile.name} Skill Intelligence</h1>
          <p className="text-sm text-muted-foreground">{skills.length} skills, sorted by required level</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {(Object.keys(BLOOM) as Bloom[]).map((b) => (
          <div key={b} className={cn("rounded-lg border p-3", BLOOM[b].badge)}>
            <p className="font-heading text-sm font-bold">{b}</p>
            <p className="text-xs">{BLOOM[b].label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {(Object.keys(CRIT) as Criticality[]).map((c) => (
          <div key={c} className="rounded-lg border bg-card p-3">
            <p className={cn("text-sm font-semibold", CRIT[c].cls)}>{c}</p>
            <p className="text-xs text-muted-foreground">{CRIT[c].desc}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">{skills.map((s) => <SkillCard key={s.id} skill={s} />)}</div>
    </div>
  );
}
