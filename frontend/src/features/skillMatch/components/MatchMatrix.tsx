import React from "react";
import type { SkillMatchMatrix } from "../service/skillMatch.api";

interface Props {
  matrix: SkillMatchMatrix;
  onSelectCell?: (profileId: string, jdId: string) => void;
}

export const MatchMatrix: React.FC<Props> = ({ matrix, onSelectCell }) => {
  const getScoreColor = (score: number) => {
    if (score >= 75) return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30";
    if (score >= 50) return "bg-blue-500/20 text-blue-300 border-blue-500/40 hover:bg-blue-500/30";
    return "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30";
  };

  const cellMap = new Map<string, number>();
  for (const c of matrix.cells) {
    cellMap.set(`${c.profile_id}:${c.jd_id}`, c.match_score);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-heading text-sm font-semibold text-zinc-100">
            Candidate × Job Posting Match Grid (sm-1.0)
          </h4>
          <p className="text-xs text-zinc-400">Click any cell to inspect the breakdown</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-400">
              <th className="p-2 font-medium">Candidate</th>
              {matrix.jds.map((jd) => (
                <th key={jd.id} className="p-2 font-medium text-center max-w-[130px] truncate" title={`${jd.company} - ${jd.role}`}>
                  <div className="font-semibold text-zinc-200 truncate">{jd.role}</div>
                  <div className="text-[10px] text-zinc-500 truncate">{jd.company}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {matrix.profiles.map((p) => {
              const bestJd = matrix.best_jd_by_profile[p.id];
              return (
                <tr key={p.id} className="hover:bg-zinc-900/30 transition-colors">
                  <td className="p-2.5 font-medium text-zinc-200 whitespace-nowrap">
                    {p.name}
                  </td>
                  {matrix.jds.map((jd) => {
                    const score = cellMap.get(`${p.id}:${jd.id}`) ?? 0;
                    const isBest = bestJd === jd.id;

                    return (
                      <td key={jd.id} className="p-2 text-center">
                        <button
                          onClick={() => onSelectCell && onSelectCell(p.id, jd.id)}
                          className={`w-full py-2 px-1 rounded-lg border text-xs font-bold transition-all relative ${getScoreColor(
                            score
                          )}`}
                        >
                          {score}
                          {isBest && (
                            <span className="absolute -top-1 -right-1 flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                            </span>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

