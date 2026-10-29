import React, { useState, useEffect, useMemo } from "react";
import { useSkillMatch, useSkillMatchMatrix } from "../Hooks/skillMatch.hooks";
import { MatchScoreCard } from "./MatchScoreCard";
import { GapList } from "./GapList";
import { MatchLinksView } from "./MatchLinksView";
import { HowComputedDrawer } from "./HowComputedDrawer";
import { MatchMatrix } from "./MatchMatrix";
import { useJdLibrary } from "@/features/jd/Hooks/jd.hooks";
import { useProfiles } from "@/features/profile/Hooks/useProfiles";
import { useAuth } from "@/features/auth/Hooks/auth.hooks";
import { getStoredUser } from "@/lib/auth";
import { Loader2, RefreshCw } from "lucide-react";

export const SkillMatchPage: React.FC = () => {
  const { profileId, jdId, result, isLoading, error, fetchMatch, selectProfile, selectJd } =
    useSkillMatch();

  const { matrix, isLoading: matrixLoading, error: matrixError, fetchMatrix } = useSkillMatchMatrix();
  const [activeTab, setActiveTab] = useState<"gaps" | "links" | "matrix">("gaps");
  const [showDrawer, setShowDrawer] = useState(false);

  // Dynamic candidate profiles hook
  const { items: profileItems = [], loading: loadingCandidates } = useProfiles({ limit: 50 });

  // Dynamic JDs from JD library
  const { items: jdItems = [], isLoading: jdsLoading } = useJdLibrary();

  const jobPostings = useMemo(() => {
    return (jdItems || []).map((j) => ({
      id: j.jd_id,
      company: j.company_name || "Company",
      role: j.role || "Job Role",
    }));
  }, [jdItems]);

  const { user: authUser } = useAuth();
  const storedUser = getStoredUser();

  const candidates = useMemo(() => {
    const list = (profileItems || []).map((p) => ({
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
    return list;
  }, [profileItems, authUser?.candidateProfileId, authUser?.id, authUser?.name, storedUser?.id, storedUser?.name]);

  // Load matrix when matrix tab is opened
  useEffect(() => {
    if (activeTab === "matrix" && !matrix && !matrixLoading) {
      void fetchMatrix();
    }
  }, [activeTab, matrix, matrixLoading, fetchMatrix]);

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
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 space-y-6 min-w-0 overflow-x-hidden">
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
        <div className="w-full lg:w-auto flex flex-col sm:flex-row sm:items-end gap-3.5">
          <div className="w-full sm:w-auto sm:min-w-[220px]">
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Candidate Profile
            </label>
            <select
              value={profileId}
              onChange={(e) => selectProfile(e.target.value)}
              disabled={loadingCandidates || candidates.length === 0}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary disabled:opacity-50 truncate"
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

          <div className="w-full sm:w-auto sm:min-w-[220px]">
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Target Job Posting
            </label>
            <select
              value={jdId}
              onChange={(e) => selectJd(e.target.value)}
              disabled={jdsLoading || jobPostings.length === 0}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary disabled:opacity-50 truncate"
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

          <div className="w-full sm:w-auto">
            <button
              onClick={() => fetchMatch(true)}
              disabled={isLoading || !profileId || !jdId}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-lg border border-primary bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Matching...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Re-run</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error View */}
      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-600 dark:text-rose-400">
          <div>
            <span className="font-bold">Error:</span> {error}
          </div>
          <button
            onClick={() => void fetchMatch(true)}
            className="font-bold underline hover:no-underline cursor-pointer shrink-0 ml-3"
          >
            Retry
          </button>
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
          <div className="border-b border-border pb-1">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto scroll-smooth py-1 -mb-px min-w-0 flex-1">
                <button
                  onClick={() => setActiveTab("gaps")}
                  className={`shrink-0 whitespace-nowrap border-b-2 py-2 px-3 text-xs font-semibold transition-colors cursor-pointer ${
                    activeTab === "gaps"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Missing Gaps First ({result.missing_skills.length})
                </button>
                <button
                  onClick={() => setActiveTab("links")}
                  className={`shrink-0 whitespace-nowrap border-b-2 py-2 px-3 text-xs font-semibold transition-colors cursor-pointer ${
                    activeTab === "links"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  How We Matched ({result.matched_skills.length})
                </button>
                <button
                  onClick={() => setActiveTab("matrix")}
                  className={`shrink-0 whitespace-nowrap border-b-2 py-2 px-3 text-xs font-semibold transition-colors cursor-pointer ${
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
                className="self-end sm:self-auto shrink-0 text-xs text-muted-foreground hover:text-foreground underline cursor-pointer py-1.5"
              >
                How this was computed
              </button>
            </div>
          </div>

          {/* Active Tab View */}
          {activeTab === "gaps" && <GapList missingSkills={result.missing_skills} />}
          {activeTab === "links" && <MatchLinksView matchedSkills={result.matched_skills} />}
          {activeTab === "matrix" && (
            matrixLoading ? (
              <div className="rounded-xl border border-border bg-card p-12 text-center space-y-3">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">Loading cross-candidate match matrix...</p>
              </div>
            ) : matrixError ? (
              <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-5 text-xs text-rose-600 dark:text-rose-400 space-y-3">
                <p className="font-bold">Failed to load match matrix:</p>
                <p>{matrixError}</p>
                <div>
                  <button
                    onClick={() => fetchMatrix(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/20 px-3 py-1.5 text-xs font-semibold hover:bg-rose-500/30 transition-colors cursor-pointer text-rose-700 dark:text-rose-300"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Retry Matrix Load
                  </button>
                </div>
              </div>
            ) : matrix ? (
              <MatchMatrix
                matrix={matrix}
                onSelectCell={(p, j) => {
                  selectProfile(p);
                  selectJd(j);
                  setActiveTab("gaps");
                }}
              />
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-xs text-muted-foreground space-y-3">
                <p>Matrix data is not available yet.</p>
                <button
                  onClick={() => fetchMatrix(true)}
                  className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-card-sub transition-colors cursor-pointer"
                >
                  Generate Matrix
                </button>
              </div>
            )
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
