import React from "react";
import type { SkillMatchMatrix } from "../service/skillMatch.api";

interface Props {
  matrix: SkillMatchMatrix;
  onSelectCell?: (profileId: string, jdId: string) => void;
}

export const MatchMatrix: React.FC<Props> = ({ matrix, onSelectCell }) => {
  if (!matrix || matrix.profiles.length === 0 || matrix.jds.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/60 p-8 text-center text-xs text-muted-foreground">
        No candidate profiles or job postings available in the matrix.
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 75)
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20";
    if (score >= 50)
      return "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 hover:bg-blue-500/20";
    return "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/20";
  };

  const cellMap = new Map<string, number>();
  for (const c of matrix.cells) {
    cellMap.set(`${c.profile_id}:${c.jd_id}`, c.match_score);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-heading text-sm font-semibold text-foreground">
            Candidate × Job Posting Match Grid (sm-1.0)
          </h4>
          <p className="text-xs text-muted-foreground">Click any cell to inspect the breakdown</p>
        </div>
      </div>

      <div className="no-scrollbar overflow-x-auto rounded-xl border border-border bg-card p-4 shadow-sm">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="p-2 font-medium">Candidate</th>
              {matrix.jds.map((jd) => (
                <th
                  key={jd.id}
                  className="p-2 font-medium text-center max-w-[130px] truncate"
                  title={`${jd.company} - ${jd.role}`}
                >
                  <div className="font-semibold text-foreground truncate">{jd.role}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{jd.company}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {matrix.profiles.map((p) => {
              const bestJd = matrix.best_jd_by_profile[p.id];
              return (
                <tr key={p.id} className="hover:bg-muted/40 transition-colors">
                  <td className="p-2.5 font-medium text-foreground whitespace-nowrap">{p.name}</td>
                  {matrix.jds.map((jd) => {
                    const score = cellMap.get(`${p.id}:${jd.id}`) ?? 0;
                    const isBest = bestJd === jd.id;

                    return (
                      <td key={jd.id} className="p-2 text-center">
                        <button
                          onClick={() => onSelectCell && onSelectCell(p.id, jd.id)}
                          className={`w-full py-2 px-1 rounded-lg border text-xs font-bold transition-all relative cursor-pointer ${getScoreColor(
                            score,
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
