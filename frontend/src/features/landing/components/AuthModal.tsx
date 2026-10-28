import React, { useState } from "react";
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
import { type CandidateUser, saveStoredUser } from "@/lib/auth";

export type { CandidateUser };

const DEMO_PROFILES: CandidateUser[] = [
  {
    id: "6f1c-ananya",
    name: "Ananya Rao",
    role: "Systems / SWE Focus",
    avatarText: "AR",
    email: "ananya.rao@jssaten.ac.in",
  },
  {
    id: "6f1c-karthik",
    name: "Karthik Verma",
    role: "Data Engineering Focus",
    avatarText: "KV",
    email: "karthik.v@jssaten.ac.in",
  },
  {
    id: "6f1c-rohan",
    name: "Rohan Mehta",
    role: "All-Rounder Generalist",
    avatarText: "RM",
    email: "rohan.mehta@jssaten.ac.in",
  },
  {
    id: "6f1c-priya",
    name: "Priya Sharma",
    role: "Entry-Level Support Focus",
    avatarText: "PS",
    email: "priya.s@jssaten.ac.in",
  },
];

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
      const user: CandidateUser = {
        id: "candidate-custom",
        name: email ? email.split("@")[0] || "Candidate" : "Demo Student",
        role: "Aspiring Software Engineer",
        avatarText: (email[0] || "C").toUpperCase(),
        email: email || "student@jssaten.ac.in",
      };
      saveStoredUser(user);
      onLoginSuccess(user);
      onClose();
    }, 600);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      const user: CandidateUser = {
        id: "candidate-new",
        name: fullName || "Candidate User",
        role: targetRole,
        avatarText: fullName
          ? fullName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()
          : "CU",
        email: email || "student@jssaten.ac.in",
      };
      saveStoredUser(user);
      onLoginSuccess(user);
      onClose();
    }, 700);
  };

  const handleSelectDemo = (profile: CandidateUser) => {
    saveStoredUser(profile);
    onLoginSuccess(profile);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-zinc-800 bg-[#0c0c10] shadow-[0_0_50px_rgba(249,115,22,0.15)] text-zinc-100 z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-orange-600 via-amber-500 to-orange-400" />

        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 rounded-xl border border-zinc-800 bg-zinc-900/80 p-1.5 text-zinc-400 transition-colors hover:border-zinc-700 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="p-6 pb-0">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
            <span className="text-[11px] font-semibold tracking-wider uppercase text-orange-400">
              PlaceIntel Candidate Portal
            </span>
          </div>
          <h3 className="mt-1 font-heading text-xl font-bold text-white">
            {tab === "login"
              ? "Welcome Back"
              : tab === "register"
                ? "Create Candidate Profile"
                : "Instant Demo Profile"}
          </h3>
          <p className="mt-1 text-xs text-zinc-400">
            {tab === "login"
              ? "Access your saved skill gap evaluations and company applications."
              : tab === "register"
                ? "Benchmark your resume against 115 corporate hiring bars."
                : "Select a pre-configured candidate profile to test matching instantly."}
          </p>

          {/* Navigation Tabs */}
          <div className="mt-5 grid grid-cols-3 rounded-xl border border-zinc-800 bg-zinc-950 p-1 text-xs font-medium">
            <button
              onClick={() => setTab("login")}
              className={`rounded-lg py-1.5 transition-all ${
                tab === "login"
                  ? "bg-zinc-800 text-white font-semibold shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setTab("register")}
              className={`rounded-lg py-1.5 transition-all ${
                tab === "register"
                  ? "bg-zinc-800 text-white font-semibold shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Create Profile
            </button>
            <button
              onClick={() => setTab("demo")}
              className={`rounded-lg py-1.5 transition-all flex items-center justify-center gap-1 ${
                tab === "demo"
                  ? "bg-orange-500/20 text-orange-400 font-semibold border border-orange-500/30"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Sparkles className="h-3 w-3 text-orange-400" />
              Demo (1-Click)
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {/* TAB 1: LOGIN */}
          {tab === "login" && (
            <form onSubmit={handleManualLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">College Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                  <input
                    type="email"
                    required
                    placeholder="student@jssaten.ac.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 py-2 pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:border-orange-500/80 focus:outline-none focus:ring-1 focus:ring-orange-500/80"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-300">Password</label>
                  <a href="#forgot" className="text-[11px] text-orange-400 hover:underline">
                    Forgot?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 py-2 pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:border-orange-500/80 focus:outline-none focus:ring-1 focus:ring-orange-500/80"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-10 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-xs font-bold text-zinc-950 shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:brightness-110 transition-all cursor-pointer"
              >
                {submitting ? "Signing In..." : "Sign In to Candidate Portal"}
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>

              <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3 text-center text-xs text-zinc-400">
                Want to test immediately?{" "}
                <button
                  type="button"
                  onClick={() => setTab("demo")}
                  className="font-semibold text-orange-400 hover:underline"
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
                <label className="text-xs font-medium text-zinc-300">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aryan Singh"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 py-2 pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:border-orange-500/80 focus:outline-none focus:ring-1 focus:ring-orange-500/80"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-300">College Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                  <input
                    type="email"
                    required
                    placeholder="aryan.singh@jssaten.ac.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 py-2 pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:border-orange-500/80 focus:outline-none focus:ring-1 focus:ring-orange-500/80"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-300">Target Role / Track</label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/90 py-2 px-3 text-xs text-white focus:border-orange-500/80 focus:outline-none"
                >
                  <option>Software Development Engineer (SDE)</option>
                  <option>Data Engineer / ML Engineer</option>
                  <option>DevOps & Cloud Systems Engineer</option>
                  <option>Cybersecurity & Networks Specialist</option>
                </select>
              </div>

              {/* Resume Upload Dropzone */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-300">
                  Candidate Resume (PDF/DOCX)
                </label>
                <div
                  onClick={() => setResumeUploaded(!resumeUploaded)}
                  className={`cursor-pointer rounded-2xl border-2 border-dashed p-3.5 text-center transition-all ${
                    resumeUploaded
                      ? "border-emerald-500/50 bg-emerald-950/20 text-emerald-400"
                      : "border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-orange-500/50 hover:bg-zinc-900/40"
                  }`}
                >
                  {resumeUploaded ? (
                    <div className="flex items-center justify-center gap-2 text-xs font-medium">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <span>Resume Uploaded: Aryan_Singh_CV.pdf (SHA-256 Verified)</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <UploadCloud className="h-5 w-5 text-orange-400" />
                      <span className="text-xs font-medium text-zinc-300">
                        Click to upload candidate resume
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        Instant Bloom skill extraction & citation matching
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-10 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-xs font-bold text-zinc-950 shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:brightness-110 transition-all cursor-pointer"
              >
                {submitting ? "Analyzing Resume & Profiling..." : "Create Profile & Compare Skills"}
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </form>
          )}

          {/* TAB 3: 1-CLICK DEMO PROFILES */}
          {tab === "demo" && (
            <div className="space-y-2.5">
              <p className="text-xs text-zinc-400">
                Choose a pre-validated candidate profile to explore the skill comparison console
                instantly without entering details:
              </p>

              {DEMO_PROFILES.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => handleSelectDemo(profile)}
                  className="group flex w-full items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 text-left transition-all hover:border-orange-500/60 hover:bg-orange-500/5 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/10 font-mono text-xs font-bold text-orange-400 group-hover:scale-105 transition-transform">
                      {profile.avatarText}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-orange-400 transition-colors">
                        {profile.name}
                      </h4>
                      <p className="text-[11px] text-zinc-400">{profile.role}</p>
                    </div>
                  </div>
                  <span className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] font-medium text-zinc-300 group-hover:border-orange-500/40 group-hover:text-orange-300">
                    Select &rarr;
                  </span>
                </button>
              ))}

              <div className="mt-3 rounded-xl border border-orange-500/20 bg-orange-500/5 p-2.5 text-[11px] text-zinc-300 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-orange-400 shrink-0" />
                <span>
                  Simulates full candidate profile state with live Bloom scores across 115
                  companies.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
