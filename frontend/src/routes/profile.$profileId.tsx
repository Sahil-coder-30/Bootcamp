import { createFileRoute } from "@tanstack/react-router";
import ProfileBuilder from "@/features/profile/components/ProfileBuilder";

export const Route = createFileRoute("/profile/$profileId")({
  // `?extraction=<id>` merges a newly parsed resume into this profile (re-import).
  validateSearch: (search: Record<string, unknown>): { extraction?: string } =>
    typeof search["extraction"] === "string" && search["extraction"]
      ? { extraction: search["extraction"] }
      : {},
  component: EditProfile,
});

function EditProfile() {
  const { profileId } = Route.useParams();
  const { extraction } = Route.useSearch();
  // `key` gives each profile its own form state when navigating between profiles.
  return (
    <ProfileBuilder
      key={profileId}
      profileId={profileId}
      {...(extraction ? { extractionId: extraction } : {})}
    />
  );
}
