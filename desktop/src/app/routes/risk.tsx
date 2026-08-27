import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ViewLoadingFallback } from "@/shared/ui/ViewLoadingFallback";

const RiskScreen = React.lazy(async () => {
  const module = await import("@/features/risk/ui/RiskScreen");
  return { default: module.RiskScreen };
});

export const Route = createFileRoute("/risk")({
  validateSearch: (search: Record<string, unknown>) => ({
    constraint:
      typeof search.constraint === "string" ? search.constraint : undefined,
  }),
  component: RiskRoute,
});

function RiskRoute() {
  const search = Route.useSearch();
  return (
    <React.Suspense fallback={<ViewLoadingFallback kind="projects" />}>
      <RiskScreen initialConstraintId={search.constraint} />
    </React.Suspense>
  );
}
