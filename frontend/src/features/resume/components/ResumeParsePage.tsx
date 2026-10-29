import React, { useEffect, useState } from "react";
import { useResume } from "../Hooks/resume.hooks";
import { ResumeUploadCard } from "./ResumeUploadCard";
import { SkillFingerprintRadar } from "./SkillFingerprintRadar";
import { ResumeParsedView } from "./ResumeParsedView";
import { HowWeGotThisDrawer } from "./HowWeGotThisDrawer";
import { FormatInvarianceCard } from "./FormatInvarianceCard";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Sliders,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  BarChart3,
  Layers,
  AlertCircle,
  HelpCircle,
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
    loadSample,
    loadCompare,
    recalculateLevels,
    setTab,
    setHighlight,
    setDrawer,
  } = useResume();

  const handleSendToTalentCheck = () => {
    navigate({ to: "/talent-check" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-white">
      {/* Background ambient gradient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primary/10 blur-[128px]" />
        <div className="absolute top-1/3 -right-40 h-96 w-96 rounded-full bg-sky-500/10 blur-[128px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Top Breadcrumb Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              Home
            </Link>
            <span className="text-muted-foreground/40">/</span>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary transition-colors hover:underline"
            >
              Dashboard
            </Link>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-xs font-semibold text-foreground">Resume Parsing</span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/companies"
              className="rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              115 Companies
            </Link>
            <Link
              to="/talent-check"
              className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20"
            >
              Talent Check
            </Link>
          </div>
        </div>

        {/* Page Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border pb-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Role 2 Engine · Format-Invariant Resume Intelligence
            </div>
            <h1 className="mt-3 font-heading text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
              Resume Parsing &{" "}
              <span className="bg-gradient-to-r from-primary to-sky-400 bg-clip-text text-transparent">
                Bloom Skill Fingerprint
              </span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
              Deterministic contact extraction, PII masking, RapidFuzz evidence grounding, and a
              12-dimensional Bloom skill taxonomy with verifiable audit basis.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setDrawer(true)}
              className="border-border bg-card text-foreground hover:bg-muted cursor-pointer"
            >
              <HelpCircle className="mr-2 h-4 w-4 text-primary" />
              How We Got This
            </Button>

            <Button
              onClick={handleSendToTalentCheck}
              className="bg-primary text-primary-foreground font-semibold shadow-xs hover:bg-primary/90 cursor-pointer"
            >
              Evaluate in Talent Check
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Error notification banner if any */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-500/40 bg-red-950/30 p-4 text-sm text-red-300">
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        {/* Upload Dropzone */}
        <ResumeUploadCard
          onFileUpload={uploadAndParse}
          isLoading={isLoading}
          currentCandidateName={currentExtraction?.candidate?.name}
        />

        {/* Main Content Dashboard */}
        {currentExtraction ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: 12-Axis Skill Fingerprint Radar */}
              <div className="lg:col-span-5 space-y-6">
                <SkillFingerprintRadar
                  primary={currentExtraction}
                />

                {/* Instant Re-score / Recalculate Levels Box */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
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
              <div className="lg:col-span-7">
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

            {/* Format Invariance Proof Card */}
            <FormatInvarianceCard />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card py-20 text-center">
            <Layers className="h-12 w-12 text-muted-foreground animate-pulse" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              No Resume Uploaded Yet
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Drop a candidate PDF/DOCX resume file above to extract skills and compute the 12-axis fingerprint.
            </p>
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
