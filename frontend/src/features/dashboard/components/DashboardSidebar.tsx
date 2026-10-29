import React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FileText,
  Target,
  ShieldCheck,
  GraduationCap,
  FileCheck2,
  Building2,
  LogOut,
  Settings,
  Sparkles,
} from "lucide-react";
import { APP_NAME, COLLEGE_NAME, COLLEGE_SHORT } from "@/lib/college";
import { clearStoredUser, type CandidateUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface DashboardSidebarProps {
  currentUser: CandidateUser | null;
  activeItem?: string | undefined;
  onOpenJDMatcher: () => void;
  onOpenATSModal: () => void;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  currentUser,
  activeItem = "dashboard",
  onOpenJDMatcher,
  onOpenATSModal,
}) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearStoredUser();
    navigate({ to: "/" });
  };

  const displayName = currentUser?.name || "Ananya Rao";
  const displayRole = currentUser?.role || "B.Tech CSE '26";
  const avatarText = currentUser?.avatarText || "AR";

  return (
    <aside className="w-64 shrink-0 flex flex-col justify-between border-r border-sidebar-border bg-sidebar p-4 h-screen overflow-y-auto overflow-x-hidden select-none transition-colors sticky top-0">
      {/* 1. Top Brand Block */}
      <div>
        <Link
          to="/"
          className="flex items-center gap-3 p-2 rounded-2xl hover:bg-sidebar-accent/50 transition-colors"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-card border border-border text-foreground font-heading text-xs font-bold shadow-xs">
            PI
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-heading text-base font-bold tracking-tight text-sidebar-foreground">
                {APP_NAME}
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span className="rounded-full border border-primary/40 bg-primary/10 px-1.5 py-0.2 text-[9px] font-bold text-primary">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              {COLLEGE_SHORT} Placement Hub
            </p>
          </div>
        </Link>

        {/* 2. Middle Navigation Items */}
        <nav className="mt-6 space-y-1">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
            Core Modules
          </p>

          {/* Dashboard */}
          <Link
            to="/"
            className={cn(
              "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all",
              activeItem === "dashboard"
                ? "border-l-2 border-primary bg-primary/10 text-foreground font-bold shadow-xs"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
            )}
          >
            <LayoutDashboard
              className={cn("h-4 w-4", activeItem === "dashboard" ? "text-primary" : "text-muted-foreground")}
            />
            <span>Dashboard</span>
          </Link>

          {/* Resume Parsing */}
          <Link
            to="/resume"
            className={cn(
              "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all",
              activeItem === "resume"
                ? "border-l-2 border-primary bg-primary/10 text-foreground font-bold shadow-xs"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
            )}
          >
            <FileText
              className={cn("h-4 w-4", activeItem === "resume" ? "text-primary" : "text-muted-foreground")}
            />
            <span>Resume Parsing</span>
            <span className="ml-auto text-[10px] font-mono rounded-full bg-muted border border-border px-2 py-0.5 text-muted-foreground font-semibold">
              128
            </span>
          </Link>

          {/* JD Matcher */}
          <button
            type="button"
            onClick={onOpenJDMatcher}
            className="w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground transition-all text-left cursor-pointer"
          >
            <Target className="h-4 w-4 text-muted-foreground" />
            <span>JD Matcher</span>
            <span className="ml-auto text-[10px] font-semibold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
              Beta
            </span>
          </button>

          {/* Talent Check */}
          <Link
            to="/talent-check"
            className={cn(
              "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all",
              activeItem === "talent-check"
                ? "border-l-2 border-primary bg-primary/10 text-foreground font-bold shadow-xs"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
            )}
          >
            <ShieldCheck
              className={cn("h-4 w-4", activeItem === "talent-check" ? "text-primary" : "text-muted-foreground")}
            />
            <span>Talent Check</span>
          </Link>

          {/* Skill Matching / Ladders */}
          <Link
            to="/company/skills"
            className={cn(
              "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all",
              activeItem === "skills"
                ? "border-l-2 border-primary bg-primary/10 text-foreground font-bold shadow-xs"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
            )}
          >
            <GraduationCap
              className={cn("h-4 w-4", activeItem === "skills" ? "text-primary" : "text-muted-foreground")}
            />
            <span>Skill Matching</span>
          </Link>

          {/* ATS Resume Audit */}
          <button
            type="button"
            onClick={onOpenATSModal}
            className="w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground transition-all text-left cursor-pointer"
          >
            <FileCheck2 className="h-4 w-4 text-muted-foreground" />
            <span>ATS Resume</span>
            <span className="ml-auto text-[10px] font-mono font-bold text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded-full">
              91
            </span>
          </button>

          {/* 118 Company Data */}
          <Link
            to="/companies"
            className={cn(
              "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all",
              activeItem === "companies"
                ? "border-l-2 border-primary bg-primary/10 text-foreground font-bold shadow-xs"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
            )}
          >
            <Building2
              className={cn("h-4 w-4", activeItem === "companies" ? "text-primary" : "text-muted-foreground")}
            />
            <span>118 Company Data</span>
            <span className="ml-auto text-[10px] font-mono rounded-full bg-muted border border-border px-2 py-0.5 text-muted-foreground font-semibold">
              115+
            </span>
          </Link>
        </nav>
      </div>

      {/* 3. Bottom User Profile Block */}
      <div className="pt-4 border-t border-sidebar-border">
        <div className="flex items-center justify-between gap-2 rounded-2xl bg-card p-2.5 border border-border shadow-xs">
          <div className="flex items-center gap-2.5 truncate">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground font-heading text-xs font-bold border border-border">
              {avatarText}
            </div>
            <div className="truncate text-left">
              <p className="font-bold text-xs text-foreground truncate">
                {displayName}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {displayRole}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Log Out"
            className="p-1.5 rounded-xl text-primary hover:bg-primary/10 transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
