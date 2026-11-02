import { createFileRoute, redirect } from "@tanstack/react-router";
import { VIEW_TO } from "@/app/navigation";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: VIEW_TO.workspace });
  },
});
