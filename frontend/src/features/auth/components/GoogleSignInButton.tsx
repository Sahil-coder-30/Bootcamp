import { useEffect, useRef, useState } from "react";
import { getAuthConfigAPI } from "../service/auth.api";

const GIS_SRC = "https://accounts.google.com/gsi/client";

interface GoogleId {
  initialize(opts: { client_id: string; callback: (r: { credential: string }) => void }): void;
  renderButton(el: HTMLElement, opts: Record<string, unknown>): void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

function loadGis(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);
    const script = existing ?? document.createElement("script");
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () => reject(new Error("Could not load Google sign-in")));
    if (!existing) {
      script.src = GIS_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
  });
}

/** Renders Google's own "Sign in with Google" button and hands back the ID token. */
export function GoogleSignInButton({
  onCredential,
}: {
  onCredential: (credential: string) => void;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const envId = import.meta.env["VITE_GOOGLE_CLIENT_ID"] as string | undefined;
      const clientId = envId || (await getAuthConfigAPI()).googleClientId;
      if (!clientId)
        throw new Error("Google sign-in is not configured yet (GOOGLE_CLIENT_ID missing).");
      await loadGis();
      if (cancelled || !holder.current || !window.google) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (r) => onCredential(r.credential),
      });
      window.google.accounts.id.renderButton(holder.current, {
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "pill",
      });
    })().catch((err: unknown) => {
      if (!cancelled) setProblem(err instanceof Error ? err.message : "Google sign-in unavailable");
    });
    return () => {
      cancelled = true;
    };
  }, [onCredential]);

  if (problem) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {problem}
      </p>
    );
  }
  return <div ref={holder} data-testid="google-button" className="flex min-h-11 justify-center" />;
}
