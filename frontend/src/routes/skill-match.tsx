import { createFileRoute } from "@tanstack/react-router";
import { requireSignIn } from "@/lib/requireSignIn";
import { SkillMatchPage } from "@/features/skillMatch/components/SkillMatchPage";

export const Route = createFileRoute("/skill-match")({
  beforeLoad: ({ location }) => {
    requireSignIn(location);
  },
  component: SkillMatchPage,
});
