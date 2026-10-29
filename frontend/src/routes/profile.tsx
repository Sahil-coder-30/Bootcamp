import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Users } from "lucide-react";
import { APP_NAME } from "@/lib/college";
import { requireSignIn } from "@/lib/requireSignIn";

export const Route = createFileRoute("/profile")({
  beforeLoad: ({ location }) => {
    requireSignIn(location);
  },
  head: () => ({ meta: [{ title: `Candidate profile | ${APP_NAME}` }] }),
  component: ProfileLayout,
});

function ProfileLayout() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-all hover:bg-muted shadow-2xs"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground" aria-hidden /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/profile"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-border bg-card text-foreground hover:bg-muted shadow-2xs"
            >
              <Users className="h-3.5 w-3.5 text-primary" aria-hidden /> Profiles
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
