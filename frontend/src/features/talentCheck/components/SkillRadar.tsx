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
  rows,
  candidateName = "Candidate",
  companyName = "Required Bar",
}) => {
  const data = rows.map((r) => ({
    subject: r.category_code,
    candidate: r.candidate_level,
    required: r.required_level,
    fullMark: 10,
  }));

  return (
    <div className="w-full h-[360px] flex flex-col items-center justify-center relative">
      {/* Legend Header */}
      <div className="flex items-center gap-6 mb-2 text-xs font-medium">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
          <span className="text-slate-300">{candidateName}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
          <span className="text-slate-300">{companyName}</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
          <PolarGrid stroke="rgba(255, 255, 255, 0.08)" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: "#94A3B8", fontSize: 12, fontWeight: 600, fontFamily: "monospace" }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 10]}
            tick={{ fill: "#64748B", fontSize: 10 }}
            stroke="rgba(255, 255, 255, 0.05)"
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
                  <div className="bg-slate-900/95 border border-slate-700/80 rounded-lg p-2.5 text-xs shadow-xl backdrop-blur-md">
                    <div className="font-bold text-white mb-1">{item.subject}</div>
                    <div className="text-emerald-400">
                      {candidateName}: Level {item.candidate}
                    </div>
                    <div className="text-blue-400">
                      {companyName}: Level {item.required}
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          {/* Required Bar Polygon (Azure) */}
          <Radar
            name={companyName}
            dataKey="required"
            stroke="#3B82F6"
            strokeWidth={2}
            fill="#3B82F6"
            fillOpacity={0.15}
          />
          {/* Candidate Polygon (Emerald) */}
          <Radar
            name={candidateName}
            dataKey="candidate"
            stroke="#10B981"
            strokeWidth={2}
            fill="#10B981"
            fillOpacity={0.28}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};
