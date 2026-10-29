import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { UserCheck } from "lucide-react";
import { APP_NAME } from "@/lib/college";
import { requireSignIn } from "@/lib/requireSignIn";
import { DashboardLayout } from "@/components/Layout/DashboardLayout";

export const Route = createFileRoute("/profile")({
  beforeLoad: ({ location }) => {
    requireSignIn(location);
  },
  head: () => ({ meta: [{ title: `Candidate profile | ${APP_NAME}` }] }),
  component: ProfileLayout,
});

function ProfileLayout() {
  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-6xl px-4 py-6 space-y-6 min-w-0 overflow-x-hidden">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-border bg-card text-foreground shadow-2xs">
              <UserCheck className="h-3.5 w-3.5 text-primary" aria-hidden /> Candidate Profile
            </span>
          </div>
        </div>
        <Outlet />
      </div>
    </DashboardLayout>
  );
}
