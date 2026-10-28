import { useCallback, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { APP_NAME, COLLEGE_SHORT } from "@/lib/college";
import { safeRedirect } from "@/lib/safeRedirect";
import { useAuth } from "../Hooks/auth.hooks";
import { GoogleSignInButton } from "./GoogleSignInButton";

export default function LoginPage({ redirect }: { redirect?: string | undefined }) {
  const { user, ready, loading, error, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const target = safeRedirect(redirect);

  useEffect(() => {
    if (ready && user) void navigate({ to: target });
  }, [ready, user, navigate, target]);

  const onCredential = useCallback(
    (credential: string) => {
      void signInWithGoogle(credential);
    },
    [signInWithGoogle],
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <h1 className="font-heading text-2xl font-bold text-foreground">{APP_NAME}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{COLLEGE_SHORT} Placement Intelligence</p>
        <p className="mt-6 mb-4 text-sm text-foreground">
          Sign in to save your profile and resume.
        </p>
        <GoogleSignInButton onCredential={onCredential} />
        {loading && <p className="mt-4 text-sm text-muted-foreground">Signing you in…</p>}
        {error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
