import React from "react";
import type { ResumeExtraction } from "../service/resume.api";
import { SkillChips } from "./SkillChips";
import {
  Briefcase,
  Code2,
  GraduationCap,
  Award,
  Trophy,
  ExternalLink,
  Layers,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

import type { ResumeTab } from "../slice/resume.slice";

interface ResumeParsedViewProps {
  extraction: ResumeExtraction;
  activeTab: string;
  onTabChange: (tab: ResumeTab) => void;
  highlightedSkill: string | null;
  onSkillClick: (skillName: string) => void;
}

export const ResumeParsedView: React.FC<ResumeParsedViewProps> = ({
  extraction,
  activeTab,
  onTabChange,
  highlightedSkill,
  onSkillClick,
}) => {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#0c0c10] p-6 shadow-xl backdrop-blur-md">
      {/* Tab Navigation */}
      <div className="no-scrollbar flex items-center gap-1.5 border-b border-zinc-800 pb-3 overflow-x-auto">
        <button
          type="button"
          onClick={() => onTabChange("overview")}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "overview"
              ? "bg-orange-500/10 text-orange-400 border border-orange-500/30"
              : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Overview
        </button>

        <button
          type="button"
          onClick={() => onTabChange("experience")}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "experience"
              ? "bg-orange-500/10 text-orange-400 border border-orange-500/30"
              : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
          }`}
        >
          <Briefcase className="h-3.5 w-3.5" />
          Experience ({extraction.experience.length})
        </button>

        <button
          type="button"
          onClick={() => onTabChange("projects")}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "projects"
              ? "bg-orange-500/10 text-orange-400 border border-orange-500/30"
              : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
          }`}
        >
          <Code2 className="h-3.5 w-3.5" />
          Projects ({extraction.projects.length})
        </button>

        <button
          type="button"
          onClick={() => onTabChange("skills")}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "skills"
              ? "bg-orange-500/10 text-orange-400 border border-orange-500/30"
              : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          Skills Matrix ({extraction.skills.length})
        </button>

        <button
          type="button"
          onClick={() => onTabChange("education")}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "education"
              ? "bg-orange-500/10 text-orange-400 border border-orange-500/30"
              : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
          }`}
        >
          <GraduationCap className="h-3.5 w-3.5" />
          Education & Certs ({extraction.education.length + extraction.certifications.length})
        </button>

        <button
          type="button"
          onClick={() => onTabChange("hackathons")}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "hackathons"
              ? "bg-orange-500/10 text-orange-400 border border-orange-500/30"
              : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
          }`}
        >
          <Trophy className="h-3.5 w-3.5" />
          Hackathons ({extraction.hackathons.length})
        </button>
      </div>

      {/* Tab Contents */}
      <div className="mt-5">
        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
                <div>
                  <h4 className="font-bold text-white text-base">{extraction.candidate.name}</h4>
                  <p className="text-xs text-orange-400">{extraction.role}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {extraction.candidate.email && (
                    <Badge variant="outline" className="text-[10px] text-zinc-300 border-zinc-700">
                      {extraction.candidate.email}
                    </Badge>
                  )}
                  {extraction.candidate.phone && (
                    <Badge variant="outline" className="text-[10px] text-zinc-300 border-zinc-700">
                      {extraction.candidate.phone}
                    </Badge>
                  )}
                </div>
              </div>

              {extraction.candidate.links.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {extraction.candidate.links.map((link) => (
                    <a
                      key={link}
                      href={link.startsWith("http") ? link : `https://${link}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-orange-400 hover:underline"
                    >
                      {link}
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Skills Summary */}
            <div>
              <h5 className="font-semibold text-xs text-zinc-300 uppercase tracking-wider mb-2.5">
                Top Grounded Skills & Proficiencies
              </h5>
              <SkillChips
                skills={extraction.skills}
                highlightedSkill={highlightedSkill}
                onSkillClick={onSkillClick}
              />
            </div>
          </div>
        )}

        {/* EXPERIENCE */}
        {activeTab === "experience" && (
          <div className="space-y-4">
            {extraction.experience.map((exp, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 transition-all hover:border-zinc-700"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <h4 className="font-bold text-white text-sm">{exp.title}</h4>
                    <p className="text-xs text-orange-400 font-medium">{exp.org}</p>
                  </div>
                  <span className="text-[11px] text-zinc-400">
                    {exp.start} — {exp.end || "Present"}
                  </span>
                </div>

                <ul className="mt-3 space-y-1.5 list-disc list-inside text-xs text-zinc-300">
                  {exp.highlights.map((h, hIdx) => (
                    <li key={hIdx} className="leading-relaxed">
                      {h}
                    </li>
                  ))}
                </ul>

                {exp.skills.length > 0 && (
                  <div className="mt-3.5 pt-3 border-t border-zinc-800/80 flex flex-wrap gap-1.5">
                    {exp.skills.map((sk) => (
                      <span
                        key={sk}
                        className="rounded-md border border-zinc-700 bg-zinc-800/80 px-2 py-0.5 text-[10px] text-zinc-300"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* PROJECTS */}
        {activeTab === "projects" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {extraction.projects.map((proj, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 transition-all hover:border-orange-500/40 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-white text-sm">{proj.name}</h4>
                    {proj.link && (
                      <a
                        href={proj.link.startsWith("http") ? proj.link : `https://${proj.link}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-orange-400 hover:text-white"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-zinc-300 leading-relaxed">{proj.description}</p>
                </div>

                {proj.skills.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-zinc-800/80 flex flex-wrap gap-1">
                    {proj.skills.map((sk) => (
                      <span
                        key={sk}
                        className="rounded-md border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 text-[10px] text-orange-300"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* SKILLS MATRIX */}
        {activeTab === "skills" && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs text-zinc-400">
                Click any skill badge to inspect audit quote and confidence level:
              </span>
              <span className="text-xs font-mono text-orange-400">
                Grounding Rate: {Math.round((extraction.meta.grounding_rate || 0.95) * 100)}%
              </span>
            </div>
            <SkillChips
              skills={extraction.skills}
              highlightedSkill={highlightedSkill}
              onSkillClick={onSkillClick}
            />
          </div>
        )}

        {/* EDUCATION & CERTS */}
        {activeTab === "education" && (
          <div className="space-y-4">
            <h5 className="font-semibold text-xs text-zinc-300 uppercase tracking-wider">
              Academic Background
            </h5>
            {extraction.education.map((edu, idx) => (
              <div key={idx} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-sm">{edu.degree}</h4>
                  <span className="text-xs text-zinc-400">{edu.year || "2026"}</span>
                </div>
                <p className="mt-1 text-xs text-zinc-400">{edu.institution}</p>
                {edu.score && (
                  <Badge
                    variant="outline"
                    className="mt-2 text-[10px] border-emerald-500/30 text-emerald-400"
                  >
                    Grade: {edu.score}
                  </Badge>
                )}
              </div>
            ))}

            {extraction.certifications.length > 0 && (
              <div className="pt-3">
                <h5 className="font-semibold text-xs text-zinc-300 uppercase tracking-wider mb-3">
                  Certifications & Accreditations
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {extraction.certifications.map((cert, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3.5"
                    >
                      <div className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-amber-400" />
                        <h4 className="font-bold text-white text-xs">{cert.name}</h4>
                      </div>
                      <p className="mt-1 text-[11px] text-zinc-400">
                        Issuer: {cert.issuer || "Verified"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* HACKATHONS */}
        {activeTab === "hackathons" && (
          <div className="space-y-3">
            {extraction.hackathons.length > 0 ? (
              extraction.hackathons.map((h, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Trophy className="h-5 w-5 text-amber-400" />
                    <div>
                      <h4 className="font-bold text-white text-sm">{h.name}</h4>
                      <p className="text-xs text-orange-400">{h.result || "Participant"}</p>
                    </div>
                  </div>
                  <span className="text-xs text-zinc-400 font-mono">{h.year || "2025"}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-zinc-500 italic">No competitive hackathons recorded.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
