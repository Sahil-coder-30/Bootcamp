import React, { useEffect, useState } from "react";
import { useResume } from "../Hooks/resume.hooks";
import { ResumeUploadCard } from "./ResumeUploadCard";
import { SkillFingerprintRadar } from "./SkillFingerprintRadar";
import { ResumeParsedView } from "./ResumeParsedView";
import { HowWeGotThisDrawer } from "./HowWeGotThisDrawer";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Sliders,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Layers,
  AlertCircle,
  HelpCircle,
  UploadCloud,
  CheckCircle2,
  Cpu,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { useNavigate, Link } from "@tanstack/react-router";

export const ResumeParsePage: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentExtraction,
    compareExtraction,
    status,
    isLoading,
    error,
    activeTab,
    highlightedSkill,
    isDrawerOpen,
    uploadAndParse,
    loadUserResume,
    loadSample,
    loadCompare,
    recalculateLevels,
    setTab,
    setHighlight,
    setDrawer,
    reset,
  } = useResume();

  // Attempt to load the user's saved resume if authenticated, without auto-loading dummy data
  useEffect(() => {
    if (!currentExtraction && status === "idle") {
      void loadUserResume();
    }
  }, [currentExtraction, status, loadUserResume]);

  const handleSendToTalentCheck = () => {
    navigate({ to: "/talent-check" });
  };

  const handleGoToProfile = () => {
    navigate({ to: "/profile" });
  };

  return (
    <div className="min-h-screen w-full max-w-full min-w-0 overflow-x-hidden bg-background text-foreground selection:bg-primary selection:text-white">
      {/* Background ambient gradient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primary/10 blur-[128px]" />
        <div className="absolute top-1/3 -right-40 h-96 w-96 rounded-full bg-sky-500/10 blur-[128px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 space-y-6">
        {/* Page Top Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 border-b border-border pb-5 sm:pb-6">
          <div className="min-w-0">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] sm:text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Role 2 Engine · Format-Invariant Resume Intelligence</span>
            </div>
            <h1 className="mt-2.5 font-heading text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground break-words">
              Resume Parsing &{" "}
              <span className="bg-gradient-to-r from-primary to-sky-400 bg-clip-text text-transparent">
                Bloom Skill Fingerprint
              </span>
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Deterministic contact extraction, PII masking, RapidFuzz evidence grounding, and a
              12-dimensional Bloom skill taxonomy with verifiable audit basis.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDrawer(true)}
              className="flex-1 sm:flex-none border-border bg-card text-foreground hover:bg-muted cursor-pointer text-xs justify-center"
            >
              <HelpCircle className="mr-1.5 h-3.5 w-3.5 text-primary shrink-0" />
              <span>How We Got This</span>
            </Button>

            {currentExtraction && (
              <Button
                size="sm"
                onClick={handleGoToProfile}
                className="flex-1 sm:flex-none bg-primary text-primary-foreground font-semibold shadow-xs hover:bg-primary/90 cursor-pointer text-xs justify-center"
              >
                <span>Next</span>
                <ArrowRight className="ml-1.5 h-3.5 w-3.5 shrink-0" />
              </Button>
            )}

            <Button
              variant={currentExtraction ? "outline" : "default"}
              size="sm"
              onClick={handleSendToTalentCheck}
              className={
                currentExtraction
                  ? "flex-1 sm:flex-none border-border bg-card text-foreground hover:bg-muted cursor-pointer text-xs justify-center"
                  : "flex-1 sm:flex-none bg-primary text-primary-foreground font-semibold shadow-xs hover:bg-primary/90 cursor-pointer text-xs justify-center"
              }
            >
              <span>Evaluate in Talent Check</span>
              <ArrowRight className="ml-1.5 h-3.5 w-3.5 shrink-0" />
            </Button>
          </div>
        </div>

        {/* Error notification banner if any */}
        {error && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => {
                reset();
                void loadUserResume();
              }}
              className="font-bold underline hover:no-underline cursor-pointer shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* Upload Dropzone (Clean, direct API integration) */}
        <ResumeUploadCard
          onFileUpload={uploadAndParse}
          isLoading={isLoading}
          status={status}
          currentCandidateName={currentExtraction?.candidate?.name}
          onClear={reset}
          onNext={handleGoToProfile}
          showSamples={false}
        />

        {/* Main Content Dashboard */}
        {isLoading && !currentExtraction ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-primary/30 bg-card/60 p-12 text-center shadow-xs">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-foreground">
              {status === "uploading"
                ? "Uploading Document..."
                : "Analyzing Resume Structure & Evidence..."}
            </h3>
            <p className="mt-1.5 text-xs text-muted-foreground max-w-md">
              Extracting candidate contact, career timeline, RapidFuzz grounded skills, and 12 Bloom rubric bands.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Grounding evidence
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Masking PII
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Computing Bloom levels
              </span>
            </div>
          </div>
        ) : currentExtraction ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
              {/* Left Column: 12-Axis Skill Fingerprint Radar */}
              <div className="lg:col-span-5 space-y-6 min-w-0 max-w-full">
                <SkillFingerprintRadar
                  primary={currentExtraction}
                />

                {/* Instant Re-score / Recalculate Levels Box */}
                <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sliders className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-semibold text-foreground">
                        Deterministic Engine Controls
                      </h4>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={recalculateLevels}
                      className="text-xs text-primary hover:bg-primary/10 cursor-pointer"
                    >
                      <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                      Recalculate
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    Model version: <code className="text-primary font-mono">lv-1.0</code>.
                    Recalculates all 12 category levels and Bloom gates without invoking an external
                    LLM in under 20ms.
                  </p>
                </div>
              </div>

              {/* Right Column: Tabbed Parsed Entities & Highlighted Evidence */}
              <div className="lg:col-span-7 min-w-0 max-w-full">
                <ResumeParsedView
                  extraction={currentExtraction}
                  activeTab={activeTab}
                  onTabChange={setTab}
                  highlightedSkill={highlightedSkill}
                  onSkillClick={(skillName) =>
                    setHighlight(skillName === highlightedSkill ? null : skillName)
                  }
                />
              </div>
            </div>

            {/* Bottom Next Step Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-card p-5 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    Parsing Complete · Profile Ready
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Your resume has been parsed and synchronized with your candidate profile. Proceed to your profile to review all details.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <Button
                  variant="outline"
                  onClick={handleSendToTalentCheck}
                  className="border-border bg-card text-foreground hover:bg-muted cursor-pointer text-xs"
                >
                  Evaluate in Talent Check
                </Button>
                <Button
                  onClick={handleGoToProfile}
                  className="bg-primary text-primary-foreground font-semibold shadow-xs hover:bg-primary/90 cursor-pointer text-xs"
                >
                  Next
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card py-16 px-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
              <UploadCloud className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-foreground">
              No Resume Analyzed Yet
            </h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-md">
              Upload your resume (PDF, DOCX, or TXT) above. The offline parser will extract contact
              info, work history, education, verified skills, and compute your 12-category Bloom fingerprint.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> 100% Offline (Zero LLM calls)
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> 12 Bloom Category Levels
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Evidence Audit Trail
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Observability & Provenance Drawer */}
      <HowWeGotThisDrawer
        isOpen={isDrawerOpen}
        onClose={() => setDrawer(false)}
        extraction={currentExtraction}
      />
    </div>
  );
};
