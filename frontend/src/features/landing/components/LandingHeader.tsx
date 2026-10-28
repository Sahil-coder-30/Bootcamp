import React, { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  Menu,
  X,
  User,
  LogOut,
  ChevronDown,
  UserCheck,
  Sparkles,
  Building2,
  GraduationCap,
} from "lucide-react";
import { APP_NAME } from "@/lib/college";
import { Button } from "@/components/ui/button";
import { AuthModal, type CandidateUser } from "./AuthModal";

interface LandingHeaderProps {
  currentUser: CandidateUser | null;
  onUserChange: (user: CandidateUser | null) => void;
}

export const LandingHeader: React.FC<LandingHeaderProps> = ({ currentUser, onUserChange }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState<"login" | "register" | "demo">("login");
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const openAuth = (tab: "login" | "register" | "demo") => {
    setAuthInitialTab(tab);
    setAuthModalOpen(true);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Main Sticky Navigation Bar (Top institutional bar removed as requested) */}
      <header
        className={`sticky top-0 z-40 transition-all duration-300 ${
          isScrolled
            ? "border-b border-zinc-800/90 bg-[#08080a]/95 shadow-[0_4px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl"
            : "border-b border-zinc-800/40 bg-[#08080a]/80 backdrop-blur-md"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          {/* Brand Logo */}
          <Link to="/" className="group flex items-center gap-3 focus:outline-none">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-orange-500/30 bg-gradient-to-br from-zinc-900 to-black font-heading text-sm font-black text-white shadow-[0_0_15px_rgba(249,115,22,0.15)] transition-all duration-300 group-hover:border-orange-500/60 group-hover:shadow-[0_0_20px_rgba(249,115,22,0.3)]">
              <span className="bg-gradient-to-b from-white via-zinc-200 to-orange-400 bg-clip-text text-transparent">
                PI
              </span>
              <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-orange-500 ring-2 ring-[#08080a]" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-heading text-base font-bold tracking-tight text-white transition-colors group-hover:text-orange-300">
                  {APP_NAME}
                </span>
                <span className="rounded-sm border border-orange-500/30 bg-orange-500/10 px-1 py-0.2 text-[9px] font-bold tracking-wider text-orange-400 uppercase">
                  CAREERS
                </span>
              </div>
              <span className="text-[10px] font-medium text-zinc-400">
                Placement & Skill Intelligence
              </span>
            </div>
          </Link>

          {/* Crisp, Uncluttered Center Navigation Links */}
          <nav className="hidden items-center gap-1.5 md:flex">
            {currentUser ? (
              <>
                <Link
                  to="/companies"
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-zinc-200 transition-colors hover:bg-zinc-800 hover:text-white"
                >
                  <Building2 className="h-3.5 w-3.5 text-orange-400" />
                  Companies (115)
                </Link>
                <Link
                  to="/talent-check"
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-orange-400 transition-colors hover:bg-orange-500/10"
                >
                  <UserCheck className="h-3.5 w-3.5 text-orange-400" />
                  Talent Check
                </Link>
                <Link
                  to="/company/skills"
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
                >
                  <GraduationCap className="h-3.5 w-3.5 text-zinc-400" />
                  Skill Ladders
                </Link>
                <a
                  href="#tiers"
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
                >
                  Salary Tiers
                </a>
              </>
            ) : (
              <>
                <a
                  href="#how-it-works"
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800/60 hover:text-white"
                >
                  How It Works
                </a>
                <a
                  href="#tiers"
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800/60 hover:text-white"
                >
                  Salary Tiers
                </a>
                <a
                  href="#features"
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800/60 hover:text-white"
                >
                  Platform Pillars
                </a>
                <a
                  href="#faq"
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800/60 hover:text-white"
                >
                  FAQ
                </a>
              </>
            )}
          </nav>

          {/* Right Action: Auth & Profile */}
          <div className="hidden items-center gap-2.5 sm:flex">
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2.5 rounded-xl border border-orange-500/30 bg-zinc-900/90 py-1.5 pl-2 pr-3 text-xs font-medium text-white transition-all hover:border-orange-500/60 cursor-pointer shadow-sm"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 font-mono text-[11px] font-bold text-zinc-950">
                    {currentUser.avatarText}
                  </div>
                  <div className="text-left">
                    <p className="leading-tight font-semibold text-white">{currentUser.name}</p>
                    <p className="text-[10px] text-orange-400 leading-none">
                      {currentUser.role.split("/")[0]}
                    </p>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-zinc-800 bg-[#0e0e12] p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="p-2.5 border-b border-zinc-800/80">
                      <p className="text-xs font-bold text-white">{currentUser.name}</p>
                      <p className="text-[11px] text-zinc-400 truncate">{currentUser.email}</p>
                    </div>
                    <div className="py-1">
                      <Link
                        to="/talent-check"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs text-zinc-200 hover:bg-zinc-800 hover:text-white"
                      >
                        <UserCheck className="h-3.5 w-3.5 text-orange-400" />
                        Talent Check Console
                      </Link>
                      <Link
                        to="/companies"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs text-zinc-200 hover:bg-zinc-800 hover:text-white"
                      >
                        <Building2 className="h-3.5 w-3.5 text-orange-400" />
                        All 115 Companies
                      </Link>
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          openAuth("demo");
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs text-zinc-200 hover:bg-zinc-800 hover:text-white cursor-pointer"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                        Switch Demo Candidate
                      </button>
                    </div>
                    <div className="pt-1 border-t border-zinc-800/80">
                      <button
                        onClick={() => {
                          onUserChange(null);
                          setUserDropdownOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs text-rose-400 hover:bg-rose-950/30 cursor-pointer"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Log Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openAuth("login")}
                  className="h-8.5 rounded-lg text-xs font-semibold text-zinc-300 hover:bg-zinc-800/80 hover:text-white cursor-pointer"
                >
                  Sign In
                </Button>

                <Button
                  size="sm"
                  onClick={() => openAuth("register")}
                  className="h-8.5 rounded-xl border border-orange-500/40 bg-gradient-to-r from-orange-500 to-amber-500 px-3.5 text-xs font-bold text-zinc-950 shadow-[0_0_15px_rgba(249,115,22,0.25)] transition-all hover:brightness-110 hover:shadow-[0_0_25px_rgba(249,115,22,0.4)] cursor-pointer"
                >
                  <User className="mr-1.5 h-3.5 w-3.5 text-zinc-950" />
                  Create Profile
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-300 hover:text-white"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="border-b border-zinc-800 bg-[#0c0c10] px-4 py-4 md:hidden">
            <div className="flex flex-col space-y-2">
              {currentUser ? (
                <>
                  <Link
                    to="/companies"
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-lg px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
                  >
                    Companies (115)
                  </Link>
                  <Link
                    to="/talent-check"
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-lg px-3 py-2 text-sm text-orange-400 hover:bg-orange-500/10"
                  >
                    Talent Check
                  </Link>
                  <Link
                    to="/company/skills"
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-lg px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
                  >
                    Skill Ladders
                  </Link>
                </>
              ) : (
                <>
                  <a
                    href="#how-it-works"
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
                  >
                    How It Works
                  </a>
                  <a
                    href="#tiers"
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
                  >
                    Salary Tiers
                  </a>
                  <a
                    href="#features"
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
                  >
                    Platform Pillars
                  </a>
                </>
              )}

              <div className="pt-3 border-t border-zinc-800 flex flex-col gap-2">
                {currentUser ? (
                  <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
                    <p className="text-xs font-semibold text-white">{currentUser.name}</p>
                    <p className="text-[11px] text-zinc-400">{currentUser.email}</p>
                    <button
                      onClick={() => onUserChange(null)}
                      className="mt-2 text-xs text-rose-400 hover:underline cursor-pointer"
                    >
                      Log Out
                    </button>
                  </div>
                ) : (
                  <>
                    <Button
                      onClick={() => openAuth("register")}
                      className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 font-bold"
                    >
                      Create Candidate Profile
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => openAuth("login")}
                      className="w-full border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                    >
                      Sign In
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Global Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialTab={authInitialTab}
        onLoginSuccess={(user) => {
          onUserChange(user);
        }}
      />
    </>
  );
};
