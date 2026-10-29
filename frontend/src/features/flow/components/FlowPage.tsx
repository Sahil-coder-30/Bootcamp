/**
 * FlowPage.tsx
 * One guided path through the product: pick or upload a JD, add a resume (saved as a profile),
 * run Skill Match against that JD, then Talent Check against the JD's company.
 */

import React, { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Loader2, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompanies } from "@/features/companies/Hooks/companies.hooks";
import { useFlow } from "../Hooks/flow.hooks";

const SAMPLES = [
  { key: "ananya", label: "Ananya (SWE)" },
  { key: "karthik", label: "Karthik (Data)" },
  { key: "priya", label: "Priya (Support)" },
  { key: "rohan", label: "Rohan (All-rounder)" },
];

function Step({
  n,
  title,
  done,
  children,
}: {
  n: number;
  title: string;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        {done ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        ) : (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
            {n}
          </span>
        )}
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm">{children}</div>
    </section>
  );
}

const verdictLabel = { ready: "Ready", almost: "Almost there", not_yet: "Not yet" } as const;

export const FlowPage: React.FC = () => {
  const flow = useFlow();
  const { data: companies } = useCompanies();
  const jdFile = useRef<HTMLInputElement>(null);
  const cvFile = useRef<HTMLInputElement>(null);
  const [companyId, setCompanyId] = useState<number | null>(null);

  const jdCompany = flow.jd?.company_id ?? null;
  useEffect(() => {
    if (jdCompany) setCompanyId(jdCompany);
  }, [jdCompany]);

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight">
          <Workflow className="h-6 w-6 text-primary" /> Guided flow
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          JD → resume and profile → skill match → talent check, in one pass.
        </p>
      </div>

      {flow.error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 p-3 text-sm text-destructive"
        >
          {flow.error}
        </p>
      )}

      <Step n={1} title="Job description" done={!!flow.jd}>
        {flow.jd ? (
          <p>
            <b>{flow.jd.company ?? "Unknown company"}</b> · {flow.jd.role ?? "Role"} ·{" "}
            {flow.jd.skill_count} skills
          </p>
        ) : (
          <p className="text-muted-foreground">Pick a saved JD or upload a new one.</p>
        )}
        {flow.library.length > 0 && (
          <select
            aria-label="Saved JD"
            className="w-full rounded-md border border-border bg-background p-2"
            value={flow.jd?.jd_id ?? ""}
            onChange={(e) => {
              const s = flow.library.find((x) => x.jd_id === e.target.value);
              if (s) flow.pickJd(s);
            }}
          >
            <option value="">Select a saved JD…</option>
            {flow.library.map((j) => (
              <option key={j.jd_id} value={j.jd_id}>
                {j.company_name ?? "JD"} – {j.role ?? j.file_name} ({j.skill_count} skills)
              </option>
            ))}
          </select>
        )}
        <input
          ref={jdFile}
          type="file"
          accept=".pdf,.docx,.txt"
          hidden
          data-testid="jd-file"
          onChange={(e) => e.target.files?.[0] && void flow.uploadJd(e.target.files[0])}
        />
        <Button
          variant="outline"
          disabled={flow.busy === "jd"}
          onClick={() => jdFile.current?.click()}
        >
          {flow.busy === "jd" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Upload JD (PDF/DOCX/TXT)
        </Button>
      </Step>

      <Step n={2} title="Resume and profile" done={!!flow.profile}>
        {flow.profile ? (
          <p>
            <b>{flow.profile.profile.name}</b> · {flow.profile.profile.skills.length} skills ·{" "}
            {flow.profile.created ? "profile created" : "profile updated"} ·{" "}
            <Link
              to="/profile/$profileId"
              params={{ profileId: flow.profile.profile_id }}
              className="text-primary underline"
            >
              review / edit profile
            </Link>
          </p>
        ) : (
          <p className="text-muted-foreground">
            Upload a resume (levels are inferred) or use a sample candidate.
          </p>
        )}
        <input
          ref={cvFile}
          type="file"
          accept=".pdf,.docx,.txt"
          hidden
          data-testid="cv-file"
          onChange={(e) => e.target.files?.[0] && void flow.uploadResume(e.target.files[0])}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={flow.busy === "resume"}
            onClick={() => cvFile.current?.click()}
          >
            {flow.busy === "resume" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Upload resume
          </Button>
          {SAMPLES.map((s) => (
            <Button
              key={s.key}
              size="sm"
              variant="secondary"
              disabled={flow.busy === "resume"}
              onClick={() => void flow.useSample(s.key)}
            >
              {s.label}
            </Button>
          ))}
        </div>
      </Step>

      <Step n={3} title="Skill match" done={!!flow.match}>
        <Button
          disabled={!flow.jd || !flow.profile || flow.busy === "match"}
          onClick={() => void flow.runMatch()}
        >
          {flow.busy === "match" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Match profile against JD
        </Button>
        {flow.match && (
          <div data-testid="match-result">
            <p className="text-3xl font-black">
              {flow.match.match_score}
              <span className="text-base font-normal text-muted-foreground">
                {" "}
                / 100 · {flow.match.match_band}
              </span>
            </p>
            <p>
              {flow.match.matched_skills.length} matched, {flow.match.missing_skills.length} missing
              {flow.match.missing_skills.length > 0 &&
                ` (top: ${flow.match.missing_skills
                  .slice(0, 3)
                  .map((m) => m.skill_name)
                  .join(", ")})`}
            </p>
          </div>
        )}
      </Step>

      <Step n={4} title="Talent check" done={!!flow.check}>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Company"
            className="rounded-md border border-border bg-background p-2"
            value={companyId ?? ""}
            onChange={(e) => setCompanyId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Select company…</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Button
            disabled={!flow.profile || !companyId || flow.busy === "check"}
            onClick={() => companyId && void flow.runCheck(companyId)}
          >
            {flow.busy === "check" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Check readiness
          </Button>
        </div>
        {flow.check && (
          <div data-testid="check-result">
            <p className="text-3xl font-black">
              {Math.round(flow.check.readiness_score)}
              <span className="text-base font-normal text-muted-foreground">
                {" "}
                / 100 · {verdictLabel[flow.check.verdict]} for {flow.check.company}
              </span>
            </p>
            {flow.check.top_gaps.length > 0 && <p>Top gaps: {flow.check.top_gaps.join(", ")}</p>}
            <Link to="/talent-check" className="text-primary underline">
              Open full Talent Check
            </Link>
          </div>
        )}
      </Step>

      <Button variant="ghost" onClick={flow.reset}>
        Start over
      </Button>
    </div>
  );
};
