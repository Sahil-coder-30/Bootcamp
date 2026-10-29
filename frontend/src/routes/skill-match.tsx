import { createFileRoute } from "@tanstack/react-router";
import { SkillMatchPage } from "@/features/skillMatch/components/SkillMatchPage";

export const Route = createFileRoute("/skill-match")({
  component: SkillMatchPage,
});
