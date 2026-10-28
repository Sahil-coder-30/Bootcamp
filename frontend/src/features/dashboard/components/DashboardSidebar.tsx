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
  Sparkles,
} from "lucide-react";
import { APP_NAME, COLLEGE_NAME, COLLEGE_SHORT } from "@/lib/college";
import { clearStoredUser, type CandidateUser } from "@/lib/auth";
import { clearSession } from "@/lib/authStorage";
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
    clearSession();
    navigate({ to: "/" });
  };

  const displayName = currentUser?.name || "Ananya Rao";
  const displayRole = currentUser?.role || "B.Tech CSE '26";
  const avatarText = currentUser?.avatarText || "AR";

  return (
    <aside className="w-64 shrink-0 flex flex-col justify-between border-r border-border bg-card p-4 h-screen overflow-y-auto overflow-x-hidden select-none transition-colors sticky top-0">
      {/* 1. Top Brand Block */}
      <div>
        <Link
          to="/"
          className="flex items-center gap-3 p-2 rounded-2xl hover:bg-muted transition-colors"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-indigo-700 text-white font-heading text-xs font-black shadow-md shadow-primary/20">
            PI
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-heading text-base font-bold tracking-tight text-foreground">
                {APP_NAME}
              </span>
              <span className="rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.2 text-[9px] font-bold text-primary">
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
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Placement Modules
          </p>

          {/* Dashboard */}
          <Link
            to="/dashboard"
            className={cn(
              "flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-semibold transition-all cursor-pointer",
              activeItem === "dashboard"
                ? "bg-primary text-primary-foreground shadow-sm font-bold"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Dashboard</span>
          </Link>

          {/* 115 Company Data */}
          <Link
            to="/companies"
            className={cn(
              "flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-semibold transition-all cursor-pointer",
              activeItem === "companies"
                ? "bg-primary text-primary-foreground shadow-sm font-bold"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Building2 className="h-4 w-4" />
            <span>115 Companies</span>
            <span className="ml-auto text-[10px] font-mono rounded-full bg-card-sub border border-border px-2 py-0.5 text-muted-foreground font-semibold">
              Live
            </span>
          </Link>

          {/* Talent Check */}
          <Link
            to="/talent-check"
            className={cn(
              "flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-semibold transition-all cursor-pointer",
              activeItem === "talent-check"
                ? "bg-primary text-primary-foreground shadow-sm font-bold"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Talent Check</span>
          </Link>

          {/* Resume Parsing */}
          <Link
            to="/resume"
            className={cn(
              "flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-semibold transition-all cursor-pointer",
              activeItem === "resume"
                ? "bg-primary text-primary-foreground shadow-sm font-bold"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <FileText className="h-4 w-4" />
            <span>Resume Parsing</span>
            <span className="ml-auto text-[10px] font-mono rounded-full bg-card-sub border border-border px-2 py-0.5 text-muted-foreground font-semibold">
              ATS
            </span>
          </Link>

          {/* Skill Matching / Ladders */}
          <Link
            to="/company/skills"
            className={cn(
              "flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-semibold transition-all cursor-pointer",
              activeItem === "skills"
                ? "bg-primary text-primary-foreground shadow-sm font-bold"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <GraduationCap className="h-4 w-4" />
            <span>Bloom Skill Ladders</span>
          </Link>

          {/* JD Matcher */}
          <button
            type="button"
            onClick={onOpenJDMatcher}
            className="w-full flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all text-left cursor-pointer"
          >
            <Target className="h-4 w-4" />
            <span>JD Matcher</span>
            <span className="ml-auto text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              Beta
            </span>
          </button>

          {/* ATS Resume Audit */}
          <button
            type="button"
            onClick={onOpenATSModal}
            className="w-full flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all text-left cursor-pointer"
          >
            <FileCheck2 className="h-4 w-4" />
            <span>ATS Resume Audit</span>
            <span className="ml-auto text-[10px] font-mono font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              94%
            </span>
          </button>
        </nav>
      </div>

      {/* 3. Bottom User Profile Block */}
      <div className="pt-4 border-t border-border">
        <div className="flex items-center justify-between gap-2 rounded-2xl bg-card-sub p-2.5 border border-border shadow-2xs">
          <div className="flex items-center gap-2.5 truncate">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-mono text-xs font-bold">
              {avatarText}
            </div>
            <div className="truncate text-left">
              <p className="font-bold text-xs text-foreground truncate">{displayName}</p>
              <p className="text-[10px] text-muted-foreground truncate">{displayRole}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Log Out"
            className="p-1.5 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
