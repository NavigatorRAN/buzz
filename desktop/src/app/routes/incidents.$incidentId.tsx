import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ViewLoadingFallback } from "@/shared/ui/ViewLoadingFallback";

const IncidentDetailScreen = React.lazy(async () => {
  const module = await import("@/features/incidents/ui/IncidentDetailScreen");
  return { default: module.IncidentDetailScreen };
});

export const Route = createFileRoute("/incidents/$incidentId")({
  component: IncidentDetailRoute,
});

function IncidentDetailRoute() {
  const { incidentId } = Route.useParams();
  return (
    <React.Suspense fallback={<ViewLoadingFallback kind="projects" />}>
      <IncidentDetailScreen incidentId={incidentId} />
    </React.Suspense>
  );
}
