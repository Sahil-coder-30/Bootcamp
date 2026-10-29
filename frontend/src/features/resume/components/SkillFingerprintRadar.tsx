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
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-primary shadow-xs" />
            <h3 className="font-heading text-base font-bold text-foreground">
              12-Dimensional Skill Fingerprint (Bloom Rubric lv-1.0)
            </h3>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Hover any axis to inspect the deterministic audit basis and cited resume evidence.
          </p>
        </div>

      </div>

      <div className="mt-4 h-[280px] sm:h-[340px] w-full min-w-0 max-w-full overflow-hidden flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={260}>
          <RadarChart
            cx="50%"
            cy="50%"
            outerRadius="58%"
            margin={{ top: 12, right: 18, bottom: 12, left: 18 }}
            data={chartData}
          >
            <PolarGrid stroke="var(--border, rgba(148, 163, 184, 0.2))" />
            <PolarAngleAxis
              dataKey="code"
              tick={{
                fill: "currentColor",
                className: "text-muted-foreground",
                fontSize: 10,
                fontWeight: 600,
              }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 10]}
              tick={{ fill: "currentColor", className: "text-muted-foreground", fontSize: 9 }}
              stroke="var(--border, rgba(148, 163, 184, 0.2))"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload;
                if (!d) return null;
                return (
                  <div className="rounded-xl border border-border bg-card p-3 text-xs shadow-xl max-w-[280px] sm:max-w-xs">
                    <div className="flex items-center justify-between gap-3 border-b border-border pb-1.5">
                      <span className="font-bold text-foreground">{d.fullName}</span>
                      <span className="font-mono text-primary font-bold">
                        Level {d.candidateLevel}/10 ({d.bloom})
                      </span>
                    </div>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground">Confidence:</span>
                        <Badge
                          variant="outline"
                          className="text-[9px] uppercase border-border text-foreground"
                        >
                          {d.confidence}
                        </Badge>
                      </div>
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        <span className="text-foreground font-semibold">Audit Basis:</span>{" "}
                        {d.basis}
                      </p>
                    </div>
                    {compare && (
                      <div className="mt-2 border-t border-border pt-1.5 text-[11px] text-cyan-600 dark:text-cyan-400 font-medium">
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
              stroke="#4f46e5"
              fill="#4f46e5"
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

      <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-[11px] text-muted-foreground border-t border-border pt-3">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-primary" />
          <span className="font-medium text-foreground">
            {primary.candidate.name} (Active Candidate)
          </span>
        </div>
        {compare && (
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-cyan-500" />
            <span className="font-medium text-cyan-700 dark:text-cyan-300">
              {compare.candidate.name} (Comparison Overlay)
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
