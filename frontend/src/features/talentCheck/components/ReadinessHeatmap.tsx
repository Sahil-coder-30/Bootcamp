/**
 * ReadinessHeatmap.tsx
 * Multi-candidate x Multi-company comparative matrix heatmap.
 * Demonstrates 'visibly different results' across candidates and hiring bars.
 */

import React from "react";
import type { TalentMatrixResult } from "../service/talentCheck.api";
import { Users, Building2, AlertCircle } from "lucide-react";

interface ReadinessHeatmapProps {
  matrix?: TalentMatrixResult | null;
  onSelectCell?: (profileId: string, companyId: number) => void;
}

export const ReadinessHeatmap: React.FC<ReadinessHeatmapProps> = ({
  matrix,
  onSelectCell,
}) => {
  if (!matrix || matrix.cells.length === 0) {
    return (
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-sm">
        No matrix data available.
      </div>
    );
  }

  // Group cells by profile_id and company_id
  const cellMap = new Map<string, { score: number; verdict: string; blocking: number }>();
  for (const c of matrix.cells) {
    cellMap.set(`${c.profile_id}:${c.company_id}`, {
      score: c.readiness_score,
      verdict: c.verdict,
      blocking: c.blocking_count || 0,
    });
  }

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-md overflow-x-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            Candidate Comparison Matrix
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Compare candidate readiness scores across companies. Click any cell to inspect detailed gaps.
          </p>
        </div>
      </div>

      <table className="w-full border-collapse text-left">
        <thead>
          <tr>
            <th className="p-3 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              Candidate
            </th>
            {matrix.companies.map((comp) => (
              <th
                key={comp.company_id}
                className="p-3 text-xs font-semibold text-slate-300 uppercase tracking-wider border-b border-slate-800 text-center"
              >
                <div className="flex items-center justify-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>{comp.company_name}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/80">
          {matrix.profiles.map((prof) => (
            <tr key={prof.id} className="hover:bg-slate-900/40 transition-colors">
              <td className="p-3.5 font-semibold text-sm text-white">
                {prof.name}
              </td>
              {matrix.companies.map((comp) => {
                const data = cellMap.get(`${prof.id}:${comp.company_id}`);
                if (!data) return <td key={comp.company_id} className="p-3 text-center text-slate-600">—</td>;

                const isReady = data.verdict === "ready";
                const isAlmost = data.verdict === "almost";

                const bgStyle = isReady
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25"
                  : isAlmost
                  ? "bg-amber-500/15 border-amber-500/30 text-amber-400 hover:bg-amber-500/25"
                  : "bg-rose-500/15 border-rose-500/30 text-rose-400 hover:bg-rose-500/25";

                return (
                  <td key={comp.company_id} className="p-2 text-center">
                    <button
                      onClick={() => onSelectCell?.(prof.id, comp.company_id)}
                      className={`w-full py-2.5 px-3 rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-center ${bgStyle}`}
                    >
                      <span className="text-lg font-black font-mono leading-none">
                        {data.score}
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider mt-1 opacity-90">
                        {data.verdict.replace("_", " ")}
                      </span>
                      {data.blocking > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] text-rose-400 mt-0.5">
                          <AlertCircle className="w-2.5 h-2.5" /> {data.blocking} blk
                        </span>
                      )}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
