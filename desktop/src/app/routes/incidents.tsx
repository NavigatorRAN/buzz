import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ViewLoadingFallback } from "@/shared/ui/ViewLoadingFallback";

const IncidentControlScreen = React.lazy(async () => {
  const module = await import("@/features/incidents/ui/IncidentControlScreen");
  return { default: module.IncidentControlScreen };
});

export const Route = createFileRoute("/incidents")({
  component: IncidentsRoute,
});

function IncidentsRoute() {
  return (
    <React.Suspense fallback={<ViewLoadingFallback kind="projects" />}>
      <IncidentControlScreen />
    </React.Suspense>
  );
}
