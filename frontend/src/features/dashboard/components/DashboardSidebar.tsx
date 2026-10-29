import React from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  User,
  FileText,
  Target,
  ShieldCheck,
  GraduationCap,
  Building2,
  LogOut,
} from "lucide-react";
import { APP_NAME, COLLEGE_SHORT } from "@/lib/college";
import { clearStoredUser, formatNameFromEmail, type CandidateUser } from "@/lib/auth";
import { clearSession } from "@/lib/authStorage";
import { useAppSelector } from "@/store";
import { cn } from "@/lib/utils";

interface DashboardSidebarProps {
  currentUser?: CandidateUser | null;
  activeItem?: string | undefined;
  onOpenJDMatcher?: () => void;
  onOpenATSModal?: () => void;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  currentUser: propUser,
  activeItem,
  onOpenJDMatcher,
  onOpenATSModal,
}) => {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Redux-connected states
  const authUser = useAppSelector((s) => s.auth.user);
  const companiesCount = useAppSelector((s) => s.companies.list.length);

  const handleLogout = () => {
    clearStoredUser();
    clearSession();
    navigate({ to: "/" });
  };

  const displayName =
    propUser?.name ||
    authUser?.name ||
    (propUser?.email ? formatNameFromEmail(propUser.email) : "") ||
    (authUser?.email ? formatNameFromEmail(authUser.email) : "") ||
    "Candidate";
  const displayRole =
    propUser?.role ||
    authUser?.branch ||
    propUser?.email ||
    authUser?.email ||
    "Campus Candidate";
  const avatarText =
    propUser?.avatarText ||
    (displayName ? displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "CU");

  // Derive active item from router state or prop
  const effectiveActive =
    activeItem ??
    (pathname === "/dashboard"
      ? "dashboard"
      : pathname.startsWith("/profile")
        ? "profile"
        : pathname.startsWith("/resume")
          ? "resume"
          : pathname.startsWith("/jd")
            ? "jd"
            : pathname.startsWith("/talent-check")
              ? "talent-check"
              : pathname.startsWith("/skill-match") || pathname.startsWith("/company/skills")
                ? "skills"
                : pathname.startsWith("/companies") || pathname.startsWith("/company")
                  ? "companies"
                  : "dashboard");

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

        {/* 2. Middle Navigation Items - Core Modules without Duplication */}
        <nav className="mt-6 space-y-1">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
            Core Modules
          </p>

          {/* 1. Dashboard */}
          <Link
            to="/dashboard"
            className={cn(
              "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all",
              effectiveActive === "dashboard"
                ? "border-l-2 border-primary bg-primary/10 text-foreground font-bold shadow-xs"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
            )}
          >
            <LayoutDashboard
              className={cn(
                "h-4 w-4",
                effectiveActive === "dashboard" ? "text-primary" : "text-muted-foreground",
              )}
            />
            <span>Dashboard</span>
          </Link>

          {/* 2. Candidate Profile */}
          <Link
            to="/profile"
            className={cn(
              "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all",
              effectiveActive === "profile"
                ? "border-l-2 border-primary bg-primary/10 text-foreground font-bold shadow-xs"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
            )}
          >
            <User
              className={cn(
                "h-4 w-4",
                effectiveActive === "profile" ? "text-primary" : "text-muted-foreground",
              )}
            />
            <span>Candidate Profile</span>
            <span className="ml-auto text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded-full">
              Public
            </span>
          </Link>

          {/* 3. Resume Parsing */}
          <div className="flex items-center justify-between group rounded-xl">
            <Link
              to="/resume"
              className={cn(
                "flex-1 flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all",
                effectiveActive === "resume"
                  ? "border-l-2 border-primary bg-primary/10 text-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              )}
            >
              <FileText
                className={cn(
                  "h-4 w-4",
                  effectiveActive === "resume" ? "text-primary" : "text-muted-foreground",
                )}
              />
              <span>Resume Parsing</span>
              <span
                onClick={(e) => {
                  if (onOpenATSModal) {
                    e.preventDefault();
                    e.stopPropagation();
                    onOpenATSModal();
                  }
                }}
                title={onOpenATSModal ? "Click to open ATS Compliance Audit" : "ATS Validated"}
                className="ml-auto text-[10px] font-mono rounded-full bg-muted border border-border px-2 py-0.5 text-muted-foreground font-semibold hover:border-primary/50 transition-colors"
              >
                ATS
              </span>
            </Link>
          </div>

          {/* 3. JD Matcher */}
          <div className="flex items-center justify-between group rounded-xl">
            <Link
              to="/jd"
              onClick={(e) => {
                if (onOpenJDMatcher && effectiveActive === "dashboard") {
                  e.preventDefault();
                  onOpenJDMatcher();
                }
              }}
              className={cn(
                "flex-1 flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all",
                effectiveActive === "jd"
                  ? "border-l-2 border-primary bg-primary/10 text-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              )}
            >
              <Target
                className={cn(
                  "h-4 w-4",
                  effectiveActive === "jd" ? "text-primary" : "text-muted-foreground",
                )}
              />
              <span>JD Matcher</span>
              <span
                onClick={(e) => {
                  if (onOpenJDMatcher) {
                    e.preventDefault();
                    e.stopPropagation();
                    onOpenJDMatcher();
                  }
                }}
                title={onOpenJDMatcher ? "Quick JD Matcher modal" : "Beta Feature"}
                className="ml-auto text-[10px] font-semibold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full hover:bg-primary/20 transition-colors cursor-pointer"
              >
                Beta
              </span>
            </Link>
          </div>

          {/* 4. Talent Check */}
          <Link
            to="/talent-check"
            className={cn(
              "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all",
              effectiveActive === "talent-check"
                ? "border-l-2 border-primary bg-primary/10 text-foreground font-bold shadow-xs"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
            )}
          >
            <ShieldCheck
              className={cn(
                "h-4 w-4",
                effectiveActive === "talent-check" ? "text-primary" : "text-muted-foreground",
              )}
            />
            <span>Talent Check</span>
          </Link>

          {/* 5. Skill Matching */}
          <Link
            to="/skill-match"
            className={cn(
              "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all",
              effectiveActive === "skills"
                ? "border-l-2 border-primary bg-primary/10 text-foreground font-bold shadow-xs"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
            )}
          >
            <GraduationCap
              className={cn(
                "h-4 w-4",
                effectiveActive === "skills" ? "text-primary" : "text-muted-foreground",
              )}
            />
            <span>Skill Matching</span>
          </Link>

          {/* 6. 115 Company Data */}
          <Link
            to="/companies"
            className={cn(
              "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all",
              effectiveActive === "companies"
                ? "border-l-2 border-primary bg-primary/10 text-foreground font-bold shadow-xs"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
            )}
          >
            <Building2
              className={cn(
                "h-4 w-4",
                effectiveActive === "companies" ? "text-primary" : "text-muted-foreground",
              )}
            />
            <span>115 Company Data</span>
            <span className="ml-auto text-[10px] font-mono rounded-full bg-muted border border-border px-2 py-0.5 text-muted-foreground font-semibold">
              {companiesCount > 0 ? `${companiesCount}+` : "115+"}
            </span>
          </Link>
        </nav>
      </div>

      {/* 3. Bottom User Profile Block */}
      <div className="pt-4 border-t border-sidebar-border">
        <div className="flex items-center justify-between gap-2 rounded-2xl bg-card p-2.5 border border-border shadow-xs">
          <Link
            to="/profile"
            className="flex items-center gap-2.5 truncate hover:opacity-85 transition-opacity group cursor-pointer"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground font-heading text-xs font-bold border border-border group-hover:border-primary/50 transition-colors">
              {avatarText}
            </div>
            <div className="truncate text-left">
              <p className="font-bold text-xs text-foreground group-hover:text-primary transition-colors truncate">{displayName}</p>
              <p className="text-[10px] text-muted-foreground truncate">{displayRole}</p>
            </div>
          </Link>

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
