import React, { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  FileText,
  Loader2,
  Building2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/store";
import { useJdLibrary } from "@/features/jd/Hooks/jd.hooks";
import { runSkillMatchAPI, type SkillMatchResult } from "@/features/skillMatch/service/skillMatch.api";
import { setMatchResult } from "@/features/skillMatch/slice/skillMatch.slice";
import { toErrorMessage } from "@/services/apiClient";
import { getStoredUser } from "@/lib/auth";

interface JDMatcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JDMatcherModal: React.FC<JDMatcherModalProps> = ({ isOpen, onClose }) => {
  const dispatch = useAppDispatch();
  const { items: jdItems, isLoading: isJdLoading } = useJdLibrary();
  const authUser = useAppSelector((s) => s.auth.user);

  // Match profile ID (prioritize logged in user's profile)
  const storedUser = getStoredUser();
  const profileId =
    authUser?.candidateProfileId ||
    (storedUser?.id && storedUser.id !== "3a000000-0000-4000-8000-000000000001" ? storedUser.id : "") ||
    (authUser?.id && authUser.id.startsWith("6f1c") ? authUser.id : "");

  const [selectedJdId, setSelectedJdId] = useState<string>("b2f4-google-swe");
  const [customText, setCustomText] = useState(
    "Looking for a Software Development Engineer (SDE-1) skilled in Distributed Systems, Go/Python, Concurrency, PostgreSQL, Kubernetes, and REST API design.",
  );
  const [analyzing, setAnalyzing] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [localResult, setLocalResult] = useState<SkillMatchResult | null>(null);

  // Redux cache check
  const reduxKey = `${profileId}:${selectedJdId}`;
  const reduxResult = useAppSelector((s) => s.skillMatch.byKey[reduxKey]);

  useEffect(() => {
    if (reduxResult) {
      setLocalResult(reduxResult);
    }
  }, [reduxResult]);

  useEffect(() => {
    if (jdItems.length > 0 && !selectedJdId) {
      setSelectedJdId(jdItems[0]?.jd_id || "b2f4-google-swe");
    }
  }, [jdItems, selectedJdId]);

  if (!isOpen) return null;

  const handleAnalyze = async () => {
    if (!profileId) {
      setMatchError("Please upload your resume first to compare your skills against this job description.");
      return;
    }
    setAnalyzing(true);
    setMatchError(null);

    try {
      // Connect to real Skill Match microservice
      const targetJd = selectedJdId || "b2f4-google-swe";
      const result = await runSkillMatchAPI({
        profile_id: profileId,
        jd_id: targetJd,
        refresh: true,
      });

      // Update Redux Store
      dispatch(setMatchResult({ key: `${profileId}:${targetJd}`, result }));
      setLocalResult(result);
    } catch (err) {
      setMatchError(toErrorMessage(err, "Failed to run deterministic skill matching against JD"));
    } finally {
      setAnalyzing(false);
    }
  };

  const result = localResult || reduxResult;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card text-foreground p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted border border-border text-foreground">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading text-lg font-bold text-foreground">
                  Job Description (JD) Matcher
                </h3>
                <span className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                  Live Service
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Deterministic RapidFuzz &amp; Bloom taxonomy benchmark against candidate profile
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Recruiter JD Selection from real library */}
        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-primary" /> Target Job Description
            </label>
            <Link
              to="/jd"
              onClick={onClose}
              className="text-[11px] font-medium text-primary hover:underline inline-flex items-center gap-1"
            >
              Open Full JD Library <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          <select
            value={selectedJdId}
            onChange={(e) => {
              setSelectedJdId(e.target.value);
              setLocalResult(null);
            }}
            className="w-full rounded-xl border border-border bg-card-sub px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="b2f4-google-swe">Google LLC — Software Engineer (SDE-1)</option>
            <option value="c3a1-msft-data">Microsoft Corporation — Data Analyst</option>
            <option value="d4e2-oracle-fss">Oracle Financial Services — Application Support</option>
            {jdItems
              .filter(
                (item) =>
                  !["b2f4-google-swe", "c3a1-msft-data", "d4e2-oracle-fss"].includes(item.jd_id),
              )
              .map((item) => (
                <option key={item.jd_id} value={item.jd_id}>
                  {item.company_name || "Company"} — {item.role || item.file_name || "Role"}
                </option>
              ))}
          </select>
        </div>

        {/* Textarea for Role Requirements */}
        <div className="mt-4 space-y-2">
          <label className="text-xs font-semibold text-foreground">
            Role Requirements &amp; Stack Requirements
          </label>
          <textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-border bg-card-sub p-3 text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
            placeholder="Paste role requirements, tech stack, and responsibilities here..."
          />
        </div>

        {/* Error notification if any */}
        {matchError && (
          <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-500 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{matchError}</span>
          </div>
        )}

        {/* Match Action */}
        <div className="mt-4 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            Deterministic 7-stage cascade with live Redux state
          </span>
          <Button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs h-9 px-5 cursor-pointer shadow-md"
          >
            {analyzing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Benchmarking Skills...
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Run JD Match
              </>
            )}
          </Button>
        </div>

        {/* Results Live from Service */}
        {result && (
          <div className="mt-5 rounded-xl border border-primary/40 bg-card-sub p-4 animate-in slide-in-from-top-2 space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-bold text-foreground">
                  {result.score_breakdown?.raw_score ?? result.match_score}% Match with Candidate Profile
                </span>
              </div>
              <span className="rounded-full bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 text-xs font-bold">
                Must-Have: {result.score_breakdown?.must_coverage ?? 0}%
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-card p-3 border border-border">
                <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                  ✓ Strong Matches ({result.matched_skills.length})
                </p>
                <p className="text-[11px] text-muted-foreground mt-1 line-clamp-3">
                  {result.matched_skills.length > 0
                    ? result.matched_skills.map((m) => m.candidate_skill).join(", ")
                    : "No exact skill matches"}
                </p>
              </div>

              <div className="rounded-lg bg-card p-3 border border-border">
                <p className="font-semibold text-amber-700 dark:text-amber-400">
                  ⚡ Recommended Prep ({result.missing_skills.length} Gaps)
                </p>
                <p className="text-[11px] text-muted-foreground mt-1 line-clamp-3">
                  {result.missing_skills.length > 0
                    ? result.missing_skills.map((m) => m.skill_name).join(", ")
                    : "Zero blocking gaps identified"}
                </p>
              </div>
            </div>

            {/* Quick Actions to Full Pages */}
            <div className="pt-2 flex items-center justify-between text-xs">
              <span className="text-muted-foreground text-[11px]">
                Algorithm: {result.meta.taxonomy_version || "Bloom v1.0"}
              </span>
              <div className="flex items-center gap-2">
                <Link to="/skill-match" onClick={onClose}>
                  <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg cursor-pointer">
                    View Match Matrix <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
                <Link to="/jd" onClick={onClose}>
                  <Button size="sm" className="h-7 text-xs rounded-lg bg-primary text-white cursor-pointer">
                    Full JD Analytics
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
