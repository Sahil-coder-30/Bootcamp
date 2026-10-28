import { createFileRoute } from "@tanstack/react-router";
import ProfileBuilder from "@/features/profile/components/ProfileBuilder";

export const Route = createFileRoute("/profile/new")({
  // `?extraction=<id>` starts the form pre-filled from a parsed resume.
  validateSearch: (search: Record<string, unknown>): { extraction?: string } =>
    typeof search["extraction"] === "string" && search["extraction"]
      ? { extraction: search["extraction"] }
      : {},
  component: NewProfile,
});

function NewProfile() {
  const { extraction } = Route.useSearch();
  return <ProfileBuilder {...(extraction ? { extractionId: extraction } : {})} />;
}
