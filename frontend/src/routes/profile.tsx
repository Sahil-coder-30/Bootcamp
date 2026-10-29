import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Users } from "lucide-react";
import { APP_NAME } from "@/lib/college";
import { authRequiredEverywhere, requireSignIn } from "@/lib/requireSignIn";

export const Route = createFileRoute("/profile")({
  beforeLoad: ({ location }) => {
    if (authRequiredEverywhere()) requireSignIn(location);
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
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden /> {APP_NAME}
          </Link>
          <Link
            to="/profile"
            className="inline-flex items-center gap-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Users className="h-4 w-4" aria-hidden /> Profiles
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
