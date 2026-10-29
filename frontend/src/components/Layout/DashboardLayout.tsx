import React, { useState, useEffect, useMemo } from "react";
import { Link, Outlet } from "@tanstack/react-router";
import { DashboardSidebar } from "@/features/dashboard/components/DashboardSidebar";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { JDMatcherModal } from "@/features/dashboard/components/JDMatcherModal";
import { ATSResumeModal } from "@/features/dashboard/components/ATSResumeModal";
import { useAuth } from "@/features/auth/Hooks/auth.hooks";
import { useCompanies, useCompany } from "@/features/companies/Hooks/companies.hooks";
import { useDashboardModals } from "@/features/dashboard/Hooks/dashboard.hooks";
import {
  getStoredUser,
  subscribeToAuthChanges,
  formatNameFromEmail,
  type CandidateUser,
} from "@/lib/auth";

export interface DashboardLayoutProps {
  children?: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user: authUser } = useAuth();
  const [currentUser, setCurrentUser] = useState<CandidateUser | null>(() => getStoredUser());
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const {
    isJDModalOpen,
    isATSModalOpen,
    openJDModal,
    closeJDModal,
    openATSModal,
    closeATSModal,
  } = useDashboardModals();

  const { data: companies = [] } = useCompanies();
  const { selectCompany } = useCompany();

  // Sync auth state
  useEffect(() => {
    return subscribeToAuthChanges((user) => {
      setCurrentUser(user);
    });
  }, []);

  // Compute effective candidate user
  const effectiveUser = useMemo(() => {
    if (currentUser?.email) return currentUser;
    if (authUser?.email) {
      const name = authUser.name || formatNameFromEmail(authUser.email);
      const initials =
        name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase() || "CU";
      return {
        id: authUser.candidateProfileId || authUser.id,
        name,
        role: authUser.branch
          ? `${authUser.branch} (${authUser.college || "Campus"})`
          : "Campus Candidate '26",
        avatarText: initials,
        email: authUser.email,
      };
    }
    return currentUser;
  }, [currentUser, authUser]);

  // Search results from 115 companies if user types in search
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return companies
      .filter((c) => c.name.toLowerCase().includes(q) || (c.category && c.category.toLowerCase().includes(q)))
      .slice(0, 6);
  }, [companies, searchQuery]);

  return (
    <div className="h-[100dvh] min-h-[100dvh] w-full max-w-full flex bg-background text-foreground overflow-hidden font-sans selection:bg-primary selection:text-white">
      {/* 1. Left Sidebar Navigation (Desktop) */}
      <div className="hidden md:block shrink-0 h-[100dvh] max-h-[100dvh]">
        <DashboardSidebar
          currentUser={effectiveUser}
          onOpenJDMatcher={openJDModal}
          onOpenATSModal={openATSModal}
        />
      </div>

      {/* Mobile Drawer */}
      {mobileSidebarOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation drawer"
          className="fixed inset-0 z-50 flex md:hidden h-[100dvh] w-full"
        >
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full animate-in slide-in-from-left duration-200 shadow-2xl">
            <DashboardSidebar
              currentUser={effectiveUser}
              onNavigate={() => setMobileSidebarOpen(false)}
              onOpenJDMatcher={() => {
                setMobileSidebarOpen(false);
                openJDModal();
              }}
              onOpenATSModal={() => {
                setMobileSidebarOpen(false);
                openATSModal();
              }}
            />
          </div>
        </div>
      )}

      {/* 2. Main Work Area */}
      <div className="flex-1 flex flex-col min-w-0 w-full max-w-full h-[100dvh] max-h-[100dvh] overflow-hidden">
        {/* Top Header */}
        <DashboardHeader
          currentUser={effectiveUser}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onToggleMobileSidebar={() => setMobileSidebarOpen((prev) => !prev)}
        />

        {/* Search Results Dropdown Overlay (if searching) */}
        {searchResults.length > 0 && (
          <div className="mx-4 sm:mx-8 mt-2 rounded-2xl border border-border bg-card p-4 shadow-xl z-20 animate-in fade-in-50 shrink-0">
            <div className="flex items-center justify-between pb-2 border-b border-border text-xs font-semibold text-muted-foreground">
              <span>Quick Matching Companies ({searchResults.length})</span>
              <button
                onClick={() => setSearchQuery("")}
                className="text-foreground font-bold hover:underline cursor-pointer"
              >
                Clear
              </button>
            </div>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {searchResults.map((c) => (
                <Link
                  key={c.id}
                  to="/company/intelligence"
                  onClick={() => {
                    selectCompany({
                      companyId: c.id,
                      companyName: c.name,
                      logoUrl: c.logoUrl,
                    });
                    setSearchQuery("");
                  }}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-card-sub hover:border-primary hover:bg-muted transition-colors"
                >
                  <div className="truncate">
                    <p className="font-semibold text-xs text-foreground truncate">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground">{c.category}</p>
                  </div>
                  <span className="text-[10px] font-bold text-foreground">{c.companyType}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Page Content Body */}
        <main className="flex-1 min-w-0 w-full max-w-full overflow-y-auto overflow-x-hidden scroll-smooth">
          {children ?? <Outlet />}
        </main>
      </div>

      {/* Global Modals: ATS Compliance & JD Matcher */}
      {isJDModalOpen && (
        <JDMatcherModal
          isOpen={isJDModalOpen}
          onClose={closeJDModal}
        />
      )}
      {isATSModalOpen && (
        <ATSResumeModal
          isOpen={isATSModalOpen}
          onClose={closeATSModal}
        />
      )}
    </div>
  );
}

export default DashboardLayout;
