import React, { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  X,
  User,
  Mail,
  Lock,
  UploadCloud,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Briefcase,
  GraduationCap,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { type CandidateUser, saveStoredUser, formatNameFromEmail } from "@/lib/auth";
import { writeSession } from "@/lib/authStorage";

export type { CandidateUser };

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "login" | "register" | "demo";
  onLoginSuccess: (user: CandidateUser) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialTab = "login",
  onLoginSuccess,
}) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"login" | "register" | "demo">(initialTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [targetRole, setTargetRole] = useState("Software Development Engineer (SDE)");
  const [resumeUploaded, setResumeUploaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      const name = formatNameFromEmail(email);
      const initials = name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || (email[0] || "C").toUpperCase();
      const user: CandidateUser = {
        id: `candidate_${Date.now()}`,
        name,
        role: "Campus Candidate '26",
        avatarText: initials,
        email: email || "student@jssaten.ac.in",
      };
      saveStoredUser(user);
      writeSession({
        accessToken: `demo_session_${user.id}`,
        refreshToken: `demo_refresh_${user.id}`,
      });
      onLoginSuccess(user);
      onClose();
      void navigate({ to: "/dashboard" });
    }, 600);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      const name = fullName.trim() || formatNameFromEmail(email);
      const initials = name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "CU";
      const user: CandidateUser = {
        id: `candidate_${Date.now()}`,
        name,
        role: targetRole,
        avatarText: initials,
        email: email || "student@jssaten.ac.in",
      };
      saveStoredUser(user);
      writeSession({
        accessToken: `demo_session_${user.id}`,
        refreshToken: `demo_refresh_${user.id}`,
      });
      onLoginSuccess(user);
      onClose();
      void navigate({ to: "/dashboard" });
    }, 700);
  };



  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card shadow-2xl text-foreground z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-600 via-amber-500 to-primary" />

        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 rounded-xl border border-border bg-card-sub p-1.5 text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="p-6 pb-0">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-orange-500 shadow-xs" />
            <span className="text-[11px] font-semibold tracking-wider uppercase text-orange-600 dark:text-orange-400">
              PlaceIntel Candidate Portal
            </span>
          </div>
          <h3 className="mt-1 font-heading text-xl font-bold text-foreground">
            {tab === "login" ? "Welcome Back" : "Create Candidate Profile"}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {tab === "login"
              ? "Access your saved skill gap evaluations and company applications."
              : "Benchmark your resume against 115 corporate hiring bars."}
          </p>

          {/* Navigation Tabs */}
          <div className="mt-5 grid grid-cols-2 rounded-xl border border-border bg-muted p-1 text-xs font-medium">
            <button
              onClick={() => setTab("login")}
              className={`rounded-lg py-1.5 transition-all ${
                tab === "login"
                  ? "bg-card text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setTab("register")}
              className={`rounded-lg py-1.5 transition-all ${
                tab === "register"
                  ? "bg-card text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Create Profile
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {/* TAB 1: LOGIN */}
          {tab === "login" && (
            <form onSubmit={handleManualLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">College Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    required
                    placeholder="student@jssaten.ac.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-border bg-card-sub py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground">Password</label>
                  <a href="#forgot" className="text-[11px] text-primary hover:underline">
                    Forgot?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-border bg-card-sub py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-10 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-xs font-bold text-white shadow-md hover:brightness-110 transition-all cursor-pointer"
              >
                {submitting ? "Signing In..." : "Sign In to Candidate Portal"}
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>

              <div className="rounded-xl border border-border bg-muted/60 p-3 text-center text-xs text-muted-foreground">
                Want to test immediately?{" "}
                <button
                  type="button"
                  onClick={() => setTab("demo")}
                  className="font-semibold text-primary hover:underline cursor-pointer"
                >
                  Use 1-Click Demo Profiles
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: REGISTER & PROFILE CREATION */}
          {tab === "register" && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aryan Singh"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-xl border border-border bg-card-sub py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">College Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    required
                    placeholder="aryan.singh@jssaten.ac.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-border bg-card-sub py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Target Role / Track</label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="w-full rounded-xl border border-border bg-card-sub py-2 px-3 text-xs text-foreground focus:border-primary focus:outline-none"
                >
                  <option>Software Development Engineer (SDE)</option>
                  <option>Data Engineer / ML Engineer</option>
                  <option>DevOps & Cloud Systems Engineer</option>
                  <option>Cybersecurity & Networks Specialist</option>
                </select>
              </div>

              {/* Resume Upload Dropzone */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  Candidate Resume (PDF/DOCX)
                </label>
                <div
                  onClick={() => setResumeUploaded(!resumeUploaded)}
                  className={`cursor-pointer rounded-2xl border-2 border-dashed p-3.5 text-center transition-all ${
                    resumeUploaded
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "border-border bg-card-sub text-muted-foreground hover:border-primary/50 hover:bg-muted"
                  }`}
                >
                  {resumeUploaded ? (
                    <div className="flex items-center justify-center gap-2 text-xs font-medium">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span>Resume Uploaded: Aryan_Singh_CV.pdf (SHA-256 Verified)</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <UploadCloud className="h-5 w-5 text-primary" />
                      <span className="text-xs font-medium text-foreground">
                        Click to upload candidate resume
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Instant Bloom skill extraction & citation matching
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-10 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-xs font-bold text-white shadow-md hover:brightness-110 transition-all cursor-pointer"
              >
                {submitting ? "Analyzing Resume & Profiling..." : "Create Profile & Compare Skills"}
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </form>
          )}


        </div>
      </div>
    </div>
  );
};
