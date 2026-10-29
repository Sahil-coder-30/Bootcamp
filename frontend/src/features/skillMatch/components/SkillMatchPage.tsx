import React, { useState } from "react";
import { useSkillMatch, useSkillMatchMatrix } from "../Hooks/skillMatch.hooks";
import { MatchScoreCard } from "./MatchScoreCard";
import { GapList } from "./GapList";
import { MatchLinksView } from "./MatchLinksView";
import { HowComputedDrawer } from "./HowComputedDrawer";
import { MatchMatrix } from "./MatchMatrix";

const CANDIDATES = [
  { id: "6f1c-ananya", name: "Systems / SWE Profile" },
  { id: "6f1c-karthik", name: "Data Engineering Profile" },
  { id: "6f1c-priya", name: "Support Analyst Profile" },
  { id: "6f1c-rohan", name: "Full-Stack Generalist Profile" },
];

const JOB_POSTINGS = [
  { id: "b2f4-google-swe", company: "Google LLC", role: "Software Engineer" },
  { id: "c3a1-msft-data", company: "Microsoft Corporation", role: "Data Analyst" },
  {
    id: "d4e2-oracle-fss",
    company: "Oracle Financial Services",
    role: "Application Support Analyst",
  },
];

export const SkillMatchPage: React.FC = () => {
  const { profileId, jdId, result, isLoading, error, fetchMatch, selectProfile, selectJd } =
    useSkillMatch();

  const { matrix, isLoading: matrixLoading } = useSkillMatchMatrix();
  const [activeTab, setActiveTab] = useState<"gaps" | "links" | "matrix">("gaps");
  const [showDrawer, setShowDrawer] = useState(false);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-6">
      {/* Top Header & Selector */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
              Skill Matching &amp; Gap Analysis
            </h1>
            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-xs font-mono text-emerald-700 dark:text-emerald-400">
              Role 5
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Prioritizes missing skill counterfactuals first, backed by a deterministic 7-stage
            cascade.
          </p>
        </div>

        {/* Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">
              Candidate Profile
            </label>
            <select
              value={profileId}
              onChange={(e) => selectProfile(e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
            >
              {CANDIDATES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">
              Target Job Posting
            </label>
            <select
              value={jdId}
              onChange={(e) => selectJd(e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
            >
              {JOB_POSTINGS.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.company} - {j.role}
                </option>
              ))}
            </select>
          </div>

          <div className="self-end">
            <button
              onClick={() => fetchMatch(true)}
              disabled={isLoading}
              className="rounded-lg border border-primary bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
            >
              {isLoading ? "Matching..." : "Re-run"}
            </button>
          </div>
        </div>
      </div>

      {/* Error View */}
      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-600 dark:text-rose-400">
          <span className="font-bold">Error:</span> {error}
        </div>
      )}

      {/* Main Content */}
      {result && (
        <div className="space-y-6">
          {/* Score Card */}
          <MatchScoreCard
            score={result.match_score}
            band={result.match_band}
            breakdown={result.score_breakdown}
            roleName={JOB_POSTINGS.find((j) => j.id === jdId)?.role}
            companyName={JOB_POSTINGS.find((j) => j.id === jdId)?.company}
          />

          {/* Tab Navigation */}
          <div className="flex items-center justify-between border-b border-border">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab("gaps")}
                className={`border-b-2 py-2 px-3 text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === "gaps"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Missing Gaps First ({result.missing_skills.length})
              </button>
              <button
                onClick={() => setActiveTab("links")}
                className={`border-b-2 py-2 px-3 text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === "links"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                How We Matched ({result.matched_skills.length})
              </button>
              <button
                onClick={() => setActiveTab("matrix")}
                className={`border-b-2 py-2 px-3 text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === "matrix"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Compare Candidates (4 × 3 Matrix)
              </button>
            </div>

            <button
              onClick={() => setShowDrawer(true)}
              className="text-xs text-muted-foreground hover:text-foreground underline cursor-pointer"
            >
              How this was computed
            </button>
          </div>

          {/* Active Tab View */}
          {activeTab === "gaps" && <GapList missingSkills={result.missing_skills} />}
          {activeTab === "links" && <MatchLinksView matchedSkills={result.matched_skills} />}
          {activeTab === "matrix" && matrix && (
            <MatchMatrix
              matrix={matrix}
              onSelectCell={(p, j) => {
                selectProfile(p);
                selectJd(j);
                setActiveTab("gaps");
              }}
            />
          )}

          {/* How Computed Modal Drawer */}
          <HowComputedDrawer
            meta={result.meta}
            isOpen={showDrawer}
            onClose={() => setShowDrawer(false)}
          />
        </div>
      )}
    </div>
  );
};
