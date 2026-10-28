import React, { useMemo } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { ResumeExtraction } from "../service/resume.api";
import { Badge } from "@/components/ui/badge";

const CATEGORY_NAMES: Record<string, string> = {
  COD: "Coding & Core Languages",
  DSA: "Data Structures & Algos",
  APTI: "Aptitude & Problem Solving",
  COMM: "Communication & Leadership",
  OOD: "Object-Oriented Design",
  AI: "AI Native Engineering",
  SQL: "SQL & Data Modeling",
  SYSD: "System Design & Arch",
  CLOUD: "DevOps & Cloud Scale",
  SWE: "Software Engineering",
  NETW: "Computer Networking",
  OS: "Operating Systems",
};

const AXIS_ORDER = [
  "COD",
  "DSA",
  "APTI",
  "COMM",
  "OOD",
  "AI",
  "SQL",
  "SYSD",
  "CLOUD",
  "SWE",
  "NETW",
  "OS",
];

interface SkillFingerprintRadarProps {
  primary: ResumeExtraction;
  compare?: ResumeExtraction | null;
  onSelectCompare?: (candidateKey: string | null) => void;
}

export const SkillFingerprintRadar: React.FC<SkillFingerprintRadarProps> = ({
  primary,
  compare,
  onSelectCompare,
}) => {
  const chartData = useMemo(() => {
    return AXIS_ORDER.map((code) => {
      const primaryLevel = primary.category_levels[code] || 1;
      const compareLevel = compare?.category_levels[code] || 0;
      const detail = primary.category_level_details?.[code];

      return {
        code,
        fullName: CATEGORY_NAMES[code] || code,
        candidateLevel: primaryLevel,
        compareLevel: compareLevel,
        bloom: detail?.bloom || "CU",
        confidence: detail?.confidence || "medium",
        basis: detail?.basis || "Derived from resume evidence",
      };
    });
  }, [primary, compare]);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#0c0c10] p-6 shadow-xl backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
            <h3 className="font-heading text-base font-bold text-white">
              12-Dimensional Skill Fingerprint (Bloom Rubric lv-1.0)
            </h3>
          </div>
          <p className="mt-0.5 text-xs text-zinc-400">
            Hover any axis to inspect the deterministic audit basis and cited resume evidence.
          </p>
        </div>

        {/* Overlay comparison selector */}
        {onSelectCompare && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">Compare with:</span>
            <select
              value={
                compare?.candidate.name?.toLowerCase().includes("karthik")
                  ? "karthik"
                  : compare?.candidate.name?.toLowerCase().includes("priya")
                    ? "priya"
                    : compare?.candidate.name?.toLowerCase().includes("rohan")
                      ? "rohan"
                      : compare?.candidate.name?.toLowerCase().includes("ananya")
                        ? "ananya"
                        : ""
              }
              onChange={(e) => onSelectCompare(e.target.value || null)}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-200 outline-none focus:border-orange-500"
            >
              <option value="">None (Single)</option>
              <option value="ananya">Ananya Rao (Systems)</option>
              <option value="karthik">Karthik (Data)</option>
              <option value="priya">Priya (Support)</option>
              <option value="rohan">Rohan (All-Rounder)</option>
            </select>
          </div>
        )}
      </div>

      <div className="mt-4 h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
            <PolarGrid stroke="#27272a" />
            <PolarAngleAxis
              dataKey="code"
              tick={{ fill: "#a1a1aa", fontSize: 11, fontWeight: 600 }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 10]}
              tick={{ fill: "#71717a", fontSize: 9 }}
              stroke="#27272a"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload;
                if (!d) return null;
                return (
                  <div className="rounded-xl border border-zinc-800 bg-[#0e0e12] p-3 text-xs shadow-2xl backdrop-blur-xl">
                    <div className="flex items-center justify-between gap-3 border-b border-zinc-800 pb-1.5">
                      <span className="font-bold text-white">{d.fullName}</span>
                      <span className="font-mono text-orange-400 font-bold">
                        Level {d.candidateLevel}/10 ({d.bloom})
                      </span>
                    </div>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-zinc-400">Confidence:</span>
                        <Badge variant="outline" className="text-[9px] uppercase border-zinc-700">
                          {d.confidence}
                        </Badge>
                      </div>
                      <p className="text-[11px] leading-relaxed text-zinc-300">
                        <span className="text-zinc-500 font-semibold">Audit Basis:</span> {d.basis}
                      </p>
                    </div>
                    {compare && (
                      <div className="mt-2 border-t border-zinc-800 pt-1.5 text-[11px] text-cyan-400">
                        {compare.candidate.name}: Level {d.compareLevel}/10
                      </div>
                    )}
                  </div>
                );
              }}
            />
            <Radar
              name={primary.candidate.name}
              dataKey="candidateLevel"
              stroke="#f97316"
              fill="#f97316"
              fillOpacity={0.35}
            />
            {compare && (
              <Radar
                name={compare.candidate.name}
                dataKey="compareLevel"
                stroke="#06b6d4"
                fill="#06b6d4"
                fillOpacity={0.25}
              />
            )}
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-[11px] text-zinc-400 border-t border-zinc-800/80 pt-3">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-orange-500" />
          <span className="font-medium text-white">
            {primary.candidate.name} (Active Candidate)
          </span>
        </div>
        {compare && (
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <span className="font-medium text-cyan-300">
              {compare.candidate.name} (Comparison Overlay)
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
