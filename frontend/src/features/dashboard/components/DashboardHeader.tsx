import React, { useRef, useEffect } from "react";
import { Search, Sun, Moon, Bell, Sparkles, Menu, Calendar, ChevronDown } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { getStoredUser } from "@/lib/auth";

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
  const currentUser = getStoredUser();
  const avatarText = currentUser?.avatarText || "AR";

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

  return (
    <header className="sticky top-0 z-30 shrink-0 flex items-center justify-between gap-4 border-b border-border bg-background/95 px-4 sm:px-6 py-3 backdrop-blur-md transition-colors">
      {/* Mobile Sidebar Trigger */}
      <button
        onClick={onToggleMobileSidebar}
        className="md:hidden p-2 rounded-xl border border-border bg-card text-foreground cursor-pointer hover:bg-muted"
        aria-label="Toggle navigation menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Center Search Input ("Search candidates, job roles, skills...") */}
      <div className="relative flex-1 max-w-xl mx-auto">
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

      {/* Right Controls: Dark/Light Mode Switcher + Academic Session + Notifications + Avatar */}
      <div className="flex items-center gap-2.5">
        {/* Session Badge */}
        <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-foreground shadow-2xs">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Session 2025–26</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </div>

        {/* Theme Switcher Toggle Pill - Dark Amber */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === "dark" ? "Light Mode" : "Dark Amber Mode"}`}
          className="flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-all shadow-2xs cursor-pointer"
        >
          {theme === "dark" ? (
            <>
              <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
              <span className="hidden sm:inline text-xs font-semibold text-foreground">
                Dark Amber
              </span>
            </>
          ) : (
            <>
              <Sun className="h-3.5 w-3.5 text-primary" />
              <span className="hidden sm:inline text-xs font-medium text-foreground">
                Light Theme
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

        {/* User Avatar */}
        <div
          title={currentUser?.name || "Ananya Rao"}
          className="h-8 w-8 rounded-full border border-primary/40 bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center text-xs font-bold text-white shadow-xs select-none"
        >
          {avatarText}
        </div>
      </div>
    </header>
  );
};
