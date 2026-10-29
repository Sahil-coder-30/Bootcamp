import React, { useState, useEffect, useMemo } from "react";
import { useSkillMatch, useSkillMatchMatrix } from "../Hooks/skillMatch.hooks";
import { MatchScoreCard } from "./MatchScoreCard";
import { GapList } from "./GapList";
import { MatchLinksView } from "./MatchLinksView";
import { HowComputedDrawer } from "./HowComputedDrawer";
import { MatchMatrix } from "./MatchMatrix";
import { useJdLibrary } from "@/features/jd/Hooks/jd.hooks";
import { listProfilesAPI } from "@/features/profile/service/profile.api";
import { getStoredUser } from "@/lib/auth";
import { useAppSelector } from "@/store";

export const SkillMatchPage: React.FC = () => {
  const { profileId, jdId, result, isLoading, error, fetchMatch, selectProfile, selectJd } =
    useSkillMatch();

  const { matrix } = useSkillMatchMatrix();
  const [activeTab, setActiveTab] = useState<"gaps" | "links" | "matrix">("gaps");
  const [showDrawer, setShowDrawer] = useState(false);

  // Dynamic candidate profiles state
  const [candidates, setCandidates] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingCandidates, setLoadingCandidates] = useState<boolean>(true);

  // Dynamic JDs from JD library
  const { items: jdItems, isLoading: jdsLoading } = useJdLibrary();

  const jobPostings = useMemo(() => {
    return jdItems.map((j) => ({
      id: j.jd_id,
      company: j.company_name || "Company",
      role: j.role || "Job Role",
    }));
  }, [jdItems]);

  const authUser = useAppSelector((s) => s.auth.user);
  const storedUser = getStoredUser();

  // Load real candidate profiles dynamically
  useEffect(() => {
    let active = true;

    async function loadCandidates() {
      setLoadingCandidates(true);
      try {
        const data = await listProfilesAPI({ limit: 50 });
        if (!active) return;

        const list = (data.items || []).map((p) => ({
          id: p.id,
          name: p.name || p.email || "Candidate Profile",
        }));

        // Include logged-in candidate profile if available
        const loggedInId =
          authUser?.candidateProfileId ||
          (storedUser?.id && storedUser.id !== "3a000000-0000-4000-8000-000000000001" ? storedUser.id : "") ||
          (authUser?.id && authUser.id.startsWith("6f1c") ? authUser.id : "");
        const loggedInName = authUser?.name || storedUser?.name || "My Profile";

        if (loggedInId && !list.some((c) => c.id === loggedInId)) {
          list.unshift({ id: loggedInId, name: `${loggedInName} (Current)` });
        }

        setCandidates(list);
      } catch (err) {
        console.warn("Could not list candidate profiles, checking auth fallback", err);
        const loggedInId =
          authUser?.candidateProfileId ||
          (storedUser?.id && storedUser.id !== "3a000000-0000-4000-8000-000000000001" ? storedUser.id : "") ||
          (authUser?.id && authUser.id.startsWith("6f1c") ? authUser.id : "");

        if (loggedInId && active) {
          setCandidates([
            {
              id: loggedInId,
              name: authUser?.name || storedUser?.name || "Current Candidate",
            },
          ]);
        }
      } finally {
        if (active) setLoadingCandidates(false);
      }
    }

    loadCandidates();

    return () => {
      active = false;
    };
  }, [authUser?.candidateProfileId, authUser?.id, authUser?.name, storedUser?.id, storedUser?.name]);

  // Dynamic default: select first candidate when candidates load if none selected
  useEffect(() => {
    if (candidates.length > 0) {
      if (!profileId || !candidates.some((c) => c.id === profileId)) {
        const first = candidates[0];
        if (first) selectProfile(first.id);
      }
    }
  }, [candidates, profileId, selectProfile]);

  // Dynamic default: select first JD when JDs load if none selected
  useEffect(() => {
    if (jobPostings.length > 0) {
      if (!jdId || !jobPostings.some((j) => j.id === jdId)) {
        const first = jobPostings[0];
        if (first) selectJd(first.id);
      }
    }
  }, [jobPostings, jdId, selectJd]);

  const selectedJd = useMemo(
    () => jobPostings.find((j) => j.id === jdId),
    [jobPostings, jdId],
  );

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
              disabled={loadingCandidates || candidates.length === 0}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary disabled:opacity-50"
            >
              {candidates.length === 0 ? (
                <option value="">
                  {loadingCandidates ? "Loading profiles..." : "No candidates found"}
                </option>
              ) : (
                candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">
              Target Job Posting
            </label>
            <select
              value={jdId}
              onChange={(e) => selectJd(e.target.value)}
              disabled={jdsLoading || jobPostings.length === 0}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary disabled:opacity-50"
            >
              {jobPostings.length === 0 ? (
                <option value="">
                  {jdsLoading ? "Loading JDs..." : "No job postings found"}
                </option>
              ) : (
                jobPostings.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.company} - {j.role}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="self-end">
            <button
              onClick={() => fetchMatch(true)}
              disabled={isLoading || !profileId || !jdId}
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

      {/* Loading state when match is loading and no result yet */}
      {isLoading && !result && (
        <div className="rounded-xl border border-border bg-card p-12 text-center space-y-3">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground">
            Analyzing skills against job requirements...
          </p>
        </div>
      )}

      {/* Empty State when no profile or JD or waiting */}
      {!result && !isLoading && !error && (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
          <p className="text-sm font-medium text-foreground">
            {loadingCandidates || jdsLoading
              ? "Loading candidate profiles and job postings..."
              : candidates.length === 0
              ? "No candidate profiles found. Please upload a resume or create a profile to start matching."
              : jobPostings.length === 0
              ? "No job postings found. Please upload a JD to start matching."
              : "Select a candidate profile and target job posting to view skill match analysis."}
          </p>
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
            roleName={selectedJd?.role}
            companyName={selectedJd?.company}
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
                Compare Candidates{" "}
                {candidates.length > 0 && jobPostings.length > 0
                  ? `(${candidates.length} × ${jobPostings.length} Matrix)`
                  : "(Matrix)"}
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
