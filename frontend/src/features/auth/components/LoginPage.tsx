import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { APP_NAME, COLLEGE_SHORT } from "@/lib/college";
import { safeRedirect } from "@/lib/safeRedirect";
import { Button } from "@/components/ui/button";
import { useAuth } from "../Hooks/auth.hooks";
import { googleLoginUrl } from "../service/auth.api";

export default function LoginPage({
  redirect,
  error,
}: {
  redirect?: string | undefined;
  error?: string | undefined;
}) {
  const { user, ready, error: authError } = useAuth();
  const navigate = useNavigate();
  const target = safeRedirect(redirect);

  useEffect(() => {
    if (ready && user) void navigate({ to: target });
  }, [ready, user, navigate, target]);

  const message = error ?? authError;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <h1 className="font-heading text-2xl font-bold text-foreground">{APP_NAME}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{COLLEGE_SHORT} Placement Intelligence</p>
        <p className="mt-6 mb-4 text-sm text-foreground">
          Sign in to save your profile and resume.
        </p>
        <Button asChild className="w-full rounded-full">
          <a href={googleLoginUrl(target)}>Continue with Google</a>
        </Button>
        {message && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}
