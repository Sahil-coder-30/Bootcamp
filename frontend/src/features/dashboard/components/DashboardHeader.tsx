import React, { useRef, useEffect, useState } from "react";
import {
  Search,
  Sun,
  Bell,
  Sparkles,
  Menu,
  Calendar,
  ChevronDown,
  User,
  LogOut,
  Check,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { getStoredUser, saveStoredUser, clearStoredUser, type CandidateUser } from "@/lib/auth";
import { clearSession } from "@/lib/authStorage";

const CANDIDATES: CandidateUser[] = [
  {
    id: "3a000000-0000-4000-8000-000000000001",
    name: "Ananya Rao",
    role: "Systems & Cloud (Super Dream)",
    avatarText: "AR",
    email: "ananya.rao@example.com",
  },
  {
    id: "3a000000-0000-4000-8000-000000000002",
    name: "Karthik Subramaniam",
    role: "Data Engineering & Analytics Focus",
    avatarText: "KS",
    email: "karthik.subramaniam@example.com",
  },
  {
    id: "3a000000-0000-4000-8000-000000000004",
    name: "Rohan Verma",
    role: "Senior Full Stack & Systems",
    avatarText: "RV",
    email: "rohan.verma@example.com",
  },
  {
    id: "3a000000-0000-4000-8000-000000000003",
    name: "Priya Menon",
    role: "Application Support Analyst",
    avatarText: "PM",
    email: "priya.menon@example.com",
  },
];

interface DashboardHeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onToggleMobileSidebar?: (() => void) | undefined;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  searchQuery,
  onSearchChange,
  onToggleMobileSidebar,
}) => {
  const { theme, toggleTheme } = useTheme();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentUser = getStoredUser();
  const avatarText = currentUser?.avatarText || "AR";
  const candidateName = currentUser?.name || "Ananya Rao";

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

  const handleSelectCandidate = (candidate: CandidateUser) => {
    saveStoredUser(candidate);
    setUserDropdownOpen(false);
  };

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
          <span className="text-foreground font-bold">Dashboard</span>
          <span className="text-muted-foreground/40">•</span>
          <span className="text-muted-foreground">Placement Intelligence</span>
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
          <span>Session 2025–26</span>
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
              <div className="px-3 py-2 border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Switch Candidate Profile
              </div>

              <div className="mt-1 space-y-1">
                {CANDIDATES.map((cand) => {
                  const isCurrent =
                    (currentUser?.id || "3a000000-0000-4000-8000-000000000001") === cand.id;
                  return (
                    <button
                      key={cand.id}
                      onClick={() => handleSelectCandidate(cand)}
                      className="w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-colors hover:bg-muted cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-[10px] font-bold text-primary">
                          {cand.avatarText}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{cand.name}</div>
                          <div className="text-[10px] text-muted-foreground truncate max-w-[130px]">
                            {cand.role}
                          </div>
                        </div>
                      </div>
                      {isCurrent && <Check className="h-4 w-4 text-primary" />}
                    </button>
                  );
                })}
              </div>

              <div className="mt-2 pt-2 border-t border-border">
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
