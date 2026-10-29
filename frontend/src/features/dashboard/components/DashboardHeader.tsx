import React, { useRef, useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Search,
  Sparkles,
  Sun,
  Bell,
  Menu,
  Calendar,
  ChevronDown,
  User,
  LogOut,
  Check,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { getStoredUser, clearStoredUser, type CandidateUser } from "@/lib/auth";
import { clearSession } from "@/lib/authStorage";

interface DashboardHeaderProps {
  currentUser?: CandidateUser | null | undefined;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  onToggleMobileSidebar?: (() => void) | undefined;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  currentUser: propUser,
  searchQuery = "",
  onSearchChange = () => {},
  onToggleMobileSidebar,
}) => {
  const { theme, toggleTheme } = useTheme();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const currentUser = propUser ?? getStoredUser();
  const candidateName = currentUser?.name || currentUser?.email?.split("@")[0] || "Candidate";
  const avatarText = currentUser?.avatarText || (candidateName[0] || "C").toUpperCase();

  const getBreadcrumb = () => {
    if (pathname === "/dashboard") return { title: "Dashboard", sub: "Placement Intelligence" };
    if (pathname.startsWith("/profile")) return { title: "Candidate Profile", sub: "Bloom Radar & Verification" };
    if (pathname.startsWith("/resume")) return { title: "Resume Parser", sub: "Deterministic ATS Extraction" };
    if (pathname.startsWith("/jd")) return { title: "JD Analytics", sub: "12 RADIX Skill Mapping" };
    if (pathname.startsWith("/talent-check")) return { title: "Talent Check", sub: "Hiring Bar & Readiness Analysis" };
    if (pathname.startsWith("/skill-match")) return { title: "Skill Matching", sub: "JD vs Resume Gap Analysis" };
    if (pathname.startsWith("/company/skills")) return { title: "Skill Intelligence", sub: "Company Skill Roadmaps" };
    if (pathname.startsWith("/company/intelligence")) return { title: "Company Intelligence", sub: "Placement History & Hiring Bars" };
    if (pathname.startsWith("/companies")) return { title: "Companies Directory", sub: "115 Recruiting Firms" };
    if (pathname.startsWith("/flow")) return { title: "Guided Flow", sub: "JD to Skill Match Pipeline" };
    return { title: "Dashboard", sub: "Placement Intelligence" };
  };
  const breadcrumb = getBreadcrumb();

  // Global hotkey: Ctrl+K or '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === "/" || (e.key === "k" && (e.metaKey || e.ctrlKey))) &&
        document.activeElement !== searchInputRef.current
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    clearStoredUser();
    clearSession();
    window.location.href = "/login";
  };

  return (
    <header className="sticky top-0 z-30 shrink-0 flex items-center justify-between gap-4 border-b border-border bg-background/95 px-4 sm:px-8 h-16 backdrop-blur-md transition-colors">
      {/* Mobile Sidebar Trigger & Breadcrumb */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onToggleMobileSidebar}
          className="md:hidden p-2 rounded-xl border border-border bg-card text-foreground cursor-pointer hover:bg-muted"
          aria-label="Toggle navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <span className="text-foreground font-bold">{breadcrumb.title}</span>
          <span className="text-muted-foreground/40">•</span>
          <span className="text-muted-foreground">{breadcrumb.sub}</span>
        </div>
      </div>

      {/* Center Search Input */}
      <div className="relative flex-1 max-w-md mx-auto">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search candidates, job roles, skills..."
          className="w-full h-10 rounded-full border border-border bg-card pl-10 pr-16 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all shadow-2xs"
        />
        <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5">/</kbd>
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5">⌘K</kbd>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Session Badge */}
        <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-foreground shadow-2xs">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Session 2025-26</span>
        </div>

        {/* Theme Switcher Toggle Pill */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === "dark" ? "Light Mode" : "Dark Amber Mode"}`}
          className="flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-all shadow-2xs cursor-pointer"
        >
          {theme === "dark" ? (
            <>
              <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
              <span className="hidden sm:inline text-xs font-semibold text-foreground">
                Dark Mode
              </span>
            </>
          ) : (
            <>
              <Sun className="h-3.5 w-3.5 text-primary" />
              <span className="hidden sm:inline text-xs font-medium text-foreground">
                Light Mode
              </span>
            </>
          )}
        </button>

        {/* Notifications Bell */}
        <button
          aria-label="Notifications"
          className="relative p-2 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shadow-2xs"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
        </button>

        {/* User Profile Selector Menu */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-2 p-1 rounded-full border border-border bg-card hover:border-primary/50 transition-all cursor-pointer shadow-2xs"
            aria-label="Candidate user menu"
          >
            <div className="h-8 w-8 rounded-full border border-primary/40 bg-gradient-to-tr from-primary to-amber-500 flex items-center justify-center text-xs font-bold text-white shadow-xs select-none">
              {avatarText}
            </div>
            <span className="hidden sm:inline text-xs font-semibold text-foreground pr-1">
              {candidateName}
            </span>
            <ChevronDown className="h-3 w-3 text-muted-foreground mr-1.5" />
          </button>

          {/* Dropdown Candidate Picker */}
          {userDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-border bg-card p-2 shadow-xl z-50 animate-in fade-in-50 zoom-in-95">
              {currentUser && (
                <div className="p-2.5 border-b border-border bg-card-sub rounded-xl mb-1.5">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center text-xs font-bold font-mono">
                      {avatarText}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{candidateName}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{currentUser.email || currentUser.role}</p>
                    </div>
                  </div>
                </div>
              )}

              <Link
                to="/profile"
                onClick={() => setUserDropdownOpen(false)}
                className="w-full flex items-center gap-2 p-2 rounded-xl text-left text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <User className="h-3.5 w-3.5 text-primary" />
                <span>Candidate Profile</span>
              </Link>

              <div className="pt-1 border-t border-border mt-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 p-2 rounded-xl text-left text-xs text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
