import { TeamsPage } from "@/views/teams/TeamsPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/application/teams")({
  component: TeamsPage,
});
