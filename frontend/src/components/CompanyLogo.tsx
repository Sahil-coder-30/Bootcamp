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
  "from-zinc-800 to-zinc-950 text-zinc-100 border border-zinc-700/60",
  "from-neutral-800 to-neutral-950 text-neutral-100 border border-neutral-700/60",
  "from-zinc-700 to-zinc-900 text-white border border-zinc-600/50",
  "from-stone-800 to-stone-950 text-stone-100 border border-stone-700/60",
  "from-zinc-900 to-black text-zinc-200 border border-zinc-800",
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
        "relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-card dark:border-zinc-800 dark:bg-zinc-900/90 shadow-2xs transition-transform duration-200 group-hover:scale-105",
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
