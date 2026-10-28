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
import { useNavigate } from "@tanstack/react-router";

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

  const [compareKey, setCompareKey] = useState<string | null>(null);

  // Auto-load Ananya on first arrival if empty, providing instant interactive experience
  useEffect(() => {
    if (!currentExtraction && status === "idle") {
      loadSample("ananya");
    }
  }, [currentExtraction, status, loadSample]);

  const handleCompareSelect = (candidateKey: string | null) => {
    setCompareKey(candidateKey);
    if (candidateKey) {
      loadCompare(candidateKey);
    } else {
      // clear compare
      loadCompare("");
    }
  };

  const handleSendToTalentCheck = () => {
    navigate({ to: "/talent-check" });
  };

  return (
    <div className="min-h-screen bg-[#08080a] text-zinc-100 selection:bg-orange-500/30 selection:text-orange-200">
      {/* Background ambient gradient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-orange-600/10 blur-[128px]" />
        <div className="absolute top-1/3 -right-40 h-96 w-96 rounded-full bg-cyan-600/10 blur-[128px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Page Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-800/80 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-950/20 px-3 py-1 text-xs font-semibold text-orange-400">
              <Sparkles className="h-3.5 w-3.5" />
              Role 2 Engine · Format-Invariant Resume Intelligence
            </div>
            <h1 className="mt-3 font-heading text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
              Resume Parsing &{" "}
              <span className="bg-gradient-to-r from-orange-400 to-amber-200 bg-clip-text text-transparent">
                Bloom Skill Fingerprint
              </span>
            </h1>
            <p className="mt-2 text-sm text-zinc-400 max-w-2xl">
              Deterministic contact extraction, PII masking, RapidFuzz evidence grounding, and a
              12-dimensional Bloom skill taxonomy with verifiable audit basis.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setDrawer(true)}
              className="border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800 hover:text-white cursor-pointer"
            >
              <HelpCircle className="mr-2 h-4 w-4 text-orange-400" />
              How We Got This
            </Button>

            <Button
              onClick={handleSendToTalentCheck}
              className="bg-gradient-to-r from-orange-500 to-orange-600 font-semibold text-white shadow-lg shadow-orange-500/20 hover:from-orange-600 hover:to-orange-700 cursor-pointer"
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

        {/* Upload Dropzone & Sample Candidates */}
        <ResumeUploadCard
          onFileUpload={uploadAndParse}
          onSelectSample={(key) => {
            loadSample(key);
            setCompareKey(null);
          }}
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
                  compare={compareKey ? compareExtraction : null}
                  onSelectCompare={handleCompareSelect}
                />

                {/* Instant Re-score / Recalculate Levels Box */}
                <div className="rounded-2xl border border-zinc-800 bg-[#0c0c10] p-5 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sliders className="h-4 w-4 text-orange-400" />
                      <h4 className="text-sm font-semibold text-white">
                        Deterministic Engine Controls
                      </h4>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={recalculateLevels}
                      className="text-xs text-orange-400 hover:bg-orange-500/10 cursor-pointer"
                    >
                      <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                      Recalculate
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                    Model version: <code className="text-orange-300 font-mono">lv-1.0</code>.
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
          <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-[#0c0c10] py-20 text-center">
            <Layers className="h-12 w-12 text-zinc-600 animate-pulse" />
            <h3 className="mt-4 text-lg font-semibold text-white">
              Loading resume intelligence...
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              Select one of the sample candidates or drop a PDF/DOCX file above.
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
