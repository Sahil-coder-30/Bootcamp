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

  const displayName = currentUser?.name || "Himanshu";
  const displayRole = currentUser?.role || "B.Tech CSE '26";
  const avatarText = currentUser?.avatarText || "H";

  return (
    <aside className="w-64 shrink-0 flex flex-col justify-between border-r border-[#dfd5c5] dark:border-[#2b241e] bg-[#ede6db] dark:bg-[#0f0d0b] p-4 h-screen overflow-y-auto overflow-x-hidden select-none transition-colors sticky top-0">
      {/* 1. Top Brand Block */}
      <div>
        <Link
          to="/"
          className="flex items-center gap-3 p-2 rounded-2xl hover:bg-[#dfd5c5]/50 dark:hover:bg-[#241e19] transition-colors"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1e1b18] text-white dark:bg-[#c8965a] dark:text-[#141210] font-heading text-xs font-bold shadow-xs">
            PI
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-heading text-base font-bold tracking-tight text-[#1e1b18] dark:text-[#ede5db]">
                {APP_NAME}
              </span>
              <span className="rounded-full border border-[#dfd5c5] dark:border-[#3d3328] bg-[#e6dcce] dark:bg-[#2a221a] px-1.5 py-0.2 text-[9px] font-bold text-[#5c5346] dark:text-[#c8965a]">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-[#7c7468] dark:text-[#8c8072] truncate">
              {COLLEGE_SHORT} Placement Hub
            </p>
          </div>
        </Link>

        {/* 2. Middle Navigation Items */}
        <nav className="mt-6 space-y-1">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[#9c9182] dark:text-[#6e6355]">
            Core Modules
          </p>

          {/* Dashboard */}
          <Link
            to="/"
            className={cn(
              "flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-semibold transition-all",
              activeItem === "dashboard"
                ? "bg-[#c86432] dark:bg-gradient-to-r dark:from-[#c86432] dark:to-[#a85024] text-white shadow-sm font-bold"
                : "text-[#5c5346] dark:text-[#9c9081] hover:bg-[#dfd5c5]/60 dark:hover:bg-[#241e19] hover:text-[#1e1b18] dark:hover:text-[#ede5db]"
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Dashboard</span>
          </Link>

          {/* Resume Parsing */}
          <Link
            to="/resume"
            className={cn(
              "flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-semibold transition-all",
              activeItem === "resume"
                ? "bg-[#c86432] text-white shadow-sm font-bold"
                : "text-[#5c5346] dark:text-[#9c9081] hover:bg-[#dfd5c5]/60 dark:hover:bg-[#241e19] hover:text-[#1e1b18] dark:hover:text-[#ede5db]"
            )}
          >
            <FileText className="h-4 w-4 text-[#7c7468] dark:text-[#8c8072]" />
            <span>Resume Parsing</span>
            <span className="ml-auto text-[10px] font-mono rounded-full bg-[#dfd5c5] dark:bg-[#28211b] px-2 py-0.5 text-[#5c5346] dark:text-[#9c9081] font-semibold">
              120
            </span>
          </Link>

          {/* JD Matcher */}
          <button
            type="button"
            onClick={onOpenJDMatcher}
            className="w-full flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-[#5c5346] dark:text-[#9c9081] hover:bg-[#dfd5c5]/60 dark:hover:bg-[#241e19] hover:text-[#1e1b18] dark:hover:text-[#ede5db] transition-all text-left cursor-pointer"
          >
            <Target className="h-4 w-4 text-[#7c7468] dark:text-[#8c8072]" />
            <span>JD Matcher</span>
            <span className="ml-auto text-[10px] font-semibold text-[#5c5346] dark:text-[#9c9081] bg-[#dfd5c5] dark:bg-[#28211b] px-2 py-0.5 rounded-full">
              Beta
            </span>
          </button>

          {/* Talent Check */}
          <Link
            to="/talent-check"
            className={cn(
              "flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-semibold transition-all",
              activeItem === "talent-check"
                ? "bg-[#c86432] text-white shadow-sm font-bold"
                : "text-[#5c5346] dark:text-[#9c9081] hover:bg-[#dfd5c5]/60 dark:hover:bg-[#241e19] hover:text-[#1e1b18] dark:hover:text-[#ede5db]"
            )}
          >
            <ShieldCheck className="h-4 w-4 text-[#7c7468] dark:text-[#8c8072]" />
            <span>Talent Check</span>
          </Link>

          {/* Skill Matching / Ladders */}
          <Link
            to="/company/skills"
            className={cn(
              "flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-semibold transition-all",
              activeItem === "skills"
                ? "bg-[#c86432] text-white shadow-sm font-bold"
                : "text-[#5c5346] dark:text-[#9c9081] hover:bg-[#dfd5c5]/60 dark:hover:bg-[#241e19] hover:text-[#1e1b18] dark:hover:text-[#ede5db]"
            )}
          >
            <GraduationCap className="h-4 w-4 text-[#7c7468] dark:text-[#8c8072]" />
            <span>Skill Matching</span>
          </Link>

          {/* ATS Resume Audit */}
          <button
            type="button"
            onClick={onOpenATSModal}
            className="w-full flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-[#5c5346] dark:text-[#9c9081] hover:bg-[#dfd5c5]/60 dark:hover:bg-[#241e19] hover:text-[#1e1b18] dark:hover:text-[#ede5db] transition-all text-left cursor-pointer"
          >
            <FileCheck2 className="h-4 w-4 text-[#7c7468] dark:text-[#8c8072]" />
            <span>ATS Resume</span>
            <span className="ml-auto text-[10px] font-mono font-bold text-[#5c5346] dark:text-[#9c9081] bg-[#dfd5c5] dark:bg-[#28211b] px-2 py-0.5 rounded-full">
              91
            </span>
          </button>

          {/* 118 Company Data */}
          <Link
            to="/companies"
            className={cn(
              "flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-semibold transition-all",
              activeItem === "companies"
                ? "bg-[#c86432] text-white shadow-sm font-bold"
                : "text-[#5c5346] dark:text-[#9c9081] hover:bg-[#dfd5c5]/60 dark:hover:bg-[#241e19] hover:text-[#1e1b18] dark:hover:text-[#ede5db]"
            )}
          >
            <Building2 className="h-4 w-4 text-[#7c7468] dark:text-[#8c8072]" />
            <span>118 Company Data</span>
            <span className="ml-auto text-[10px] font-mono rounded-full bg-[#dfd5c5] dark:bg-[#28211b] px-2 py-0.5 text-[#5c5346] dark:text-[#9c9081] font-semibold">
              115+
            </span>
          </Link>
        </nav>
      </div>

      {/* 3. Bottom User Profile Block */}
      <div className="pt-4 border-t border-[#dfd5c5] dark:border-[#2b241e]">
        <div className="flex items-center justify-between gap-2 rounded-2xl bg-[#fdfbf7] dark:bg-[#181512] p-2.5 border border-[#dfd5c5] dark:border-[#2e2720] shadow-xs">
          <div className="flex items-center gap-2.5 truncate">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1e1b18] text-white dark:bg-[#241e19] dark:text-[#ede5db] font-heading text-xs font-bold">
              {avatarText}
            </div>
            <div className="truncate text-left">
              <p className="font-bold text-xs text-[#1e1b18] dark:text-[#ede5db] truncate">
                {displayName}
              </p>
              <p className="text-[10px] text-[#7c7468] dark:text-[#8c8072] truncate">
                {displayRole}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Log Out"
            className="p-1.5 rounded-xl text-[#c86432] dark:text-[#d96e34] hover:bg-[#c86432]/10 transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
