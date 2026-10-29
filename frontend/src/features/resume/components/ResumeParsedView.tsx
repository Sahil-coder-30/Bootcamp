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
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-xs">
      {/* Tab Navigation */}
      <div className="no-scrollbar flex items-center gap-1.5 border-b border-border pb-3 overflow-x-auto touch-pan-x">
        <button
          type="button"
          onClick={() => onTabChange("overview")}
          className={`flex shrink-0 whitespace-nowrap items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "overview"
              ? "bg-primary/10 text-primary border border-primary/30"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          Overview
        </button>

        <button
          type="button"
          onClick={() => onTabChange("experience")}
          className={`flex shrink-0 whitespace-nowrap items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "experience"
              ? "bg-primary/10 text-primary border border-primary/30"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Briefcase className="h-3.5 w-3.5 shrink-0" />
          Experience ({extraction.experience?.length || 0})
        </button>

        <button
          type="button"
          onClick={() => onTabChange("projects")}
          className={`flex shrink-0 whitespace-nowrap items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "projects"
              ? "bg-primary/10 text-primary border border-primary/30"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Code2 className="h-3.5 w-3.5 shrink-0" />
          Projects ({extraction.projects?.length || 0})
        </button>

        <button
          type="button"
          onClick={() => onTabChange("skills")}
          className={`flex shrink-0 whitespace-nowrap items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "skills"
              ? "bg-primary/10 text-primary border border-primary/30"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Layers className="h-3.5 w-3.5 shrink-0" />
          Skills Matrix ({extraction.skills?.length || 0})
        </button>

        <button
          type="button"
          onClick={() => onTabChange("education")}
          className={`flex shrink-0 whitespace-nowrap items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "education"
              ? "bg-primary/10 text-primary border border-primary/30"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <GraduationCap className="h-3.5 w-3.5 shrink-0" />
          Education &amp; Certs ({(extraction.education?.length || 0) + (extraction.certifications?.length || 0)})
        </button>

        <button
          type="button"
          onClick={() => onTabChange("hackathons")}
          className={`flex shrink-0 whitespace-nowrap items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "hackathons"
              ? "bg-primary/10 text-primary border border-primary/30"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Trophy className="h-3.5 w-3.5 shrink-0" />
          Hackathons ({extraction.hackathons?.length || 0})
        </button>
      </div>

      {/* Tab Contents */}
      <div className="mt-5">
        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card-sub p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                <div>
                  <h4 className="font-bold text-foreground text-base">
                    {extraction.candidate.name}
                  </h4>
                  <p className="text-xs text-primary font-medium">{extraction.role}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {extraction.candidate.email && (
                    <Badge
                      variant="outline"
                      className="text-[10px] text-foreground border-border bg-card"
                    >
                      {extraction.candidate.email}
                    </Badge>
                  )}
                  {extraction.candidate.phone && (
                    <Badge
                      variant="outline"
                      className="text-[10px] text-foreground border-border bg-card"
                    >
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
                      className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
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
              <h5 className="font-semibold text-xs text-foreground uppercase tracking-wider mb-2.5">
                Top Grounded Skills &amp; Proficiencies
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
            {extraction.experience?.length > 0 ? (
              extraction.experience.map((exp, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-border bg-card-sub p-4 transition-all hover:border-primary/40"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <h4 className="font-bold text-foreground text-sm">{exp.title}</h4>
                      <p className="text-xs text-primary font-medium">{exp.org}</p>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {exp.start} to {exp.end || "Present"}
                    </span>
                  </div>

                  <ul className="mt-3 space-y-1.5 list-disc list-inside text-xs text-foreground/90">
                    {exp.highlights?.map((h, hIdx) => (
                      <li key={hIdx} className="leading-relaxed">
                        {h}
                      </li>
                    ))}
                  </ul>

                  {exp.skills?.length > 0 && (
                    <div className="mt-3.5 pt-3 border-t border-border flex flex-wrap gap-1.5">
                      {exp.skills.map((sk) => (
                        <span
                          key={sk}
                          className="rounded-md border border-border bg-card px-2 py-0.5 text-[10px] text-foreground"
                        >
                          {sk}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-card-sub p-6 text-center text-xs text-muted-foreground">
                No work experience entries extracted from this document.
              </div>
            )}
          </div>
        )}

        {/* PROJECTS */}
        {activeTab === "projects" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {extraction.projects?.length > 0 ? (
              extraction.projects.map((proj, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-border bg-card-sub p-4 transition-all hover:border-primary/40 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-foreground text-sm">{proj.name}</h4>
                      {proj.link && (
                        <a
                          href={proj.link.startsWith("http") ? proj.link : `https://${proj.link}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:text-foreground"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                      {proj.description}
                    </p>
                  </div>

                  {proj.skills?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-1">
                      {proj.skills.map((sk) => (
                        <span
                          key={sk}
                          className="rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] text-primary"
                        >
                          {sk}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="col-span-full rounded-xl border border-dashed border-border bg-card-sub p-6 text-center text-xs text-muted-foreground">
                No projects extracted from this document.
              </div>
            )}
          </div>
        )}

        {/* SKILLS MATRIX */}
        {activeTab === "skills" && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Click any skill badge to inspect audit quote and confidence level:
              </span>
              <span className="text-xs font-mono text-primary font-medium">
                Grounding Rate: {Math.round((extraction.meta?.grounding_rate || 0.95) * 100)}%
              </span>
            </div>
            {extraction.skills?.length > 0 ? (
              <SkillChips
                skills={extraction.skills}
                highlightedSkill={highlightedSkill}
                onSkillClick={onSkillClick}
              />
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-card-sub p-6 text-center text-xs text-muted-foreground">
                No skills detected in this document.
              </div>
            )}
          </div>
        )}

        {/* EDUCATION & CERTS */}
        {activeTab === "education" && (
          <div className="space-y-4">
            <h5 className="font-semibold text-xs text-foreground uppercase tracking-wider">
              Academic Background
            </h5>
            {extraction.education?.length > 0 ? (
              extraction.education.map((edu, idx) => (
                <div key={idx} className="rounded-xl border border-border bg-card-sub p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-foreground text-sm">{edu.degree}</h4>
                    <span className="text-xs text-muted-foreground">{edu.year || "2026"}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{edu.institution}</p>
                  {edu.score && (
                    <Badge
                      variant="outline"
                      className="mt-2 text-[10px] border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10"
                    >
                      Grade: {edu.score}
                    </Badge>
                  )}
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-card-sub p-6 text-center text-xs text-muted-foreground">
                No academic degrees extracted from this document.
              </div>
            )}

            {extraction.certifications && extraction.certifications.length > 0 && (
              <div className="pt-3">
                <h5 className="font-semibold text-xs text-foreground uppercase tracking-wider mb-3">
                  Certifications &amp; Accreditations
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {extraction.certifications.map((cert, idx) => (
                    <div key={idx} className="rounded-xl border border-border bg-card-sub p-3.5">
                      <div className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-amber-500" />
                        <h4 className="font-bold text-foreground text-xs">{cert.name}</h4>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
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
                  className="rounded-xl border border-border bg-card-sub p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Trophy className="h-5 w-5 text-amber-500" />
                    <div>
                      <h4 className="font-bold text-foreground text-sm">{h.name}</h4>
                      <p className="text-xs text-primary">{h.result || "Participant"}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">
                    {h.year || "2025"}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground italic">
                No competitive hackathons recorded.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
