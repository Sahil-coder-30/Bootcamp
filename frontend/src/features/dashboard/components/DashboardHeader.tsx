import React, { useRef, useEffect } from "react";
import { Search, Sun, Moon, Bell, Sparkles, Menu, ShieldCheck } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";

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

      {/* Center Search Input ("Search 115 companies, tech skills, interview topics... (Press '/' or ⌘K)") */}
      <div className="relative flex-1 max-w-xl mx-auto">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search 115 companies, tech skills, interview topics... (Press '/' or ⌘K)"
          className="w-full h-10 rounded-full border border-border bg-card pl-10 pr-12 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all shadow-2xs"
        />
        <kbd className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 rounded-full border border-border bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
          /
        </kbd>
      </div>

      {/* Right Controls: Dark/Light Mode Switcher + Academic Session */}
      <div className="flex items-center gap-2.5">
        {/* Session Badge */}
        <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-border bg-muted px-3.5 py-1.5 text-xs font-medium text-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Session 2025–26</span>
        </div>

        {/* Theme Switcher Toggle Pill */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === "dark" ? "Light Mode" : "Dark Mode"}`}
          className="flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-all shadow-2xs cursor-pointer"
        >
          {theme === "dark" ? (
            <>
              <Moon className="h-3.5 w-3.5 text-primary" />
              <span className="hidden sm:inline text-xs font-medium text-foreground">
                Dark Theme
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
      </div>
    </header>
  );
};
