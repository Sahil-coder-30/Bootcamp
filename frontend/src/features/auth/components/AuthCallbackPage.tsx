import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { safeRedirect } from "@/lib/safeRedirect";
import { useAuth } from "../Hooks/auth.hooks";

/** Landing page after Google: reads the tokens from the URL fragment, then moves on. */
export default function AuthCallbackPage() {
  const { completeSignIn } = useAuth();
  const navigate = useNavigate();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const params = new URLSearchParams(window.location.hash.slice(1));
    // Drop the tokens from the address bar and history straight away.
    window.history.replaceState(null, "", window.location.pathname);
    const accessToken = params.get("accessToken");
    const refreshToken = params.get("refreshToken");
    if (!accessToken || !refreshToken) {
      void navigate({ to: "/login", search: { error: "Sign-in failed, please try again" } });
      return;
    }
    void completeSignIn(accessToken, refreshToken).then((ok) => {
      if (ok) void navigate({ to: safeRedirect(params.get("redirect") ?? undefined, "/dashboard") });
      else void navigate({ to: "/login", search: { error: "Sign-in failed, please try again" } });
    });
  }, [completeSignIn, navigate]);

  return <p className="p-8 text-center text-sm text-muted-foreground">Signing you in…</p>;
}
