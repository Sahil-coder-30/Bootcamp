import { useState } from "react";
import { cn } from "@/lib/utils";

const LOGO_DEV_KEY = import.meta.env["VITE_LOGO_DEV_PUBLISHABLE_KEY"] as string | undefined;

function domainOf(url?: string) {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, "") : "";
  } catch {
    return "";
  }
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const p0 = parts[0];
  const p1 = parts[1];
  if (p0 && p1 && p0[0] && p1[0]) {
    return (p0[0] + p1[0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

const GRADIENTS = [
  "from-blue-600 to-indigo-600 text-white",
  "from-violet-600 to-purple-700 text-white",
  "from-emerald-600 to-teal-700 text-white",
  "from-amber-500 to-orange-600 text-white",
  "from-rose-600 to-pink-600 text-white",
  "from-cyan-600 to-blue-700 text-white",
];

function pickGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % GRADIENTS.length;
  return GRADIENTS[idx] ?? GRADIENTS[0]!;
}

export function CompanyLogo({
  name,
  logoUrl,
  websiteUrl,
  className,
}: {
  name: string;
  logoUrl?: string;
  websiteUrl?: string;
  className?: string;
}) {
  const domain = domainOf(websiteUrl);
  const sources = [
    LOGO_DEV_KEY && domain ? `https://img.logo.dev/${domain}?token=${LOGO_DEV_KEY}&size=128` : "",
    logoUrl ?? "",
  ].filter(Boolean);
  const [idx, setIdx] = useState(0);
  const src = sources[idx];
  const initials = getInitials(name);
  const gradient = pickGradient(name);

  return (
    <div
      className={cn(
        "relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-card shadow-xs transition-transform duration-200 group-hover:scale-105",
        className,
      )}
    >
      {src ? (
        <img
          src={src}
          alt={`${name} logo`}
          className="h-full w-full object-contain p-2 transition-opacity duration-200"
          onError={() => setIdx((i) => i + 1)}
          loading="lazy"
        />
      ) : (
        <div
          className={cn(
            "flex h-full w-full items-center justify-center bg-gradient-to-br font-heading text-xs font-bold tracking-wider",
            gradient,
          )}
        >
          {initials}
        </div>
      )}
    </div>
  );
}
