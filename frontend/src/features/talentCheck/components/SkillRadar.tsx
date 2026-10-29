/**
 * SkillRadar.tsx
 * 12-axis polygonal radar overlay comparing Candidate Skill Envelope vs Company Bar.
 * Built using Recharts with dark obsidian aesthetics.
 */

import React from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { GapRow } from "../service/talentCheck.api";

interface SkillRadarProps {
  rows: GapRow[];
  candidateName?: string | undefined;
  companyName?: string | undefined;
}

export const SkillRadar: React.FC<SkillRadarProps> = ({
  rows = [],
  candidateName = "Candidate",
  companyName = "Required Bar",
}) => {
  const data = (rows || []).map((r) => ({
    subject: r.category_code,
    candidate: r.candidate_level,
    required: r.required_level,
    fullMark: 10,
  }));

  if (data.length === 0) {
    return (
      <div className="w-full h-[360px] flex items-center justify-center text-xs text-muted-foreground">
        No skillset gap data available for radar envelope.
      </div>
    );
  }

  return (
    <div className="w-full h-[360px] flex flex-col items-center justify-center relative">
      {/* Legend Header */}
      <div className="flex items-center gap-6 mb-2 text-xs font-medium">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-xs" />
          <span className="text-foreground">{candidateName}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-primary shadow-xs" />
          <span className="text-foreground">{companyName}</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
          <PolarGrid stroke="var(--color-border, rgba(148, 163, 184, 0.25))" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{
              fill: "currentColor",
              className: "text-muted-foreground",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "monospace",
            }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 10]}
            tick={{ fill: "currentColor", className: "text-muted-foreground", fontSize: 10 }}
            stroke="var(--color-border, rgba(148, 163, 184, 0.2))"
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length > 0 && payload[0]?.payload) {
                const item = payload[0].payload as {
                  subject: string;
                  candidate: number;
                  required: number;
                };
                return (
                  <div className="bg-card border border-border rounded-lg p-2.5 text-xs shadow-md">
                    <div className="font-bold text-foreground mb-1">{item.subject}</div>
                    <div className="text-emerald-700 dark:text-emerald-400 font-medium">
                      {candidateName}: Level {item.candidate}
                    </div>
                    <div className="text-primary font-medium">
                      {companyName}: Level {item.required}
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          {/* Required Bar Polygon (Primary) */}
          <Radar
            name={companyName}
            dataKey="required"
            stroke="var(--color-primary, #6366f1)"
            strokeWidth={2}
            fill="var(--color-primary, #6366f1)"
            fillOpacity={0.15}
          />
          {/* Candidate Polygon (Emerald) */}
          <Radar
            name={candidateName}
            dataKey="candidate"
            stroke="var(--color-success, #10B981)"
            strokeWidth={2}
            fill="var(--color-success, #10B981)"
            fillOpacity={0.28}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};
