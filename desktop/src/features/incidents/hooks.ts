import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchIncidents, publishIncident } from "./data/incidentsService";
import type { IncidentControlRecordV1 } from "./domain/contracts";

export const incidentsQueryKey = (pubkey: string) =>
  ["incidents", pubkey] as const;

export function useIncidentsQuery(pubkey: string | undefined) {
  return useQuery({
    enabled: Boolean(pubkey),
    queryKey: incidentsQueryKey(pubkey ?? ""),
    queryFn: () => fetchIncidents(pubkey ?? ""),
    staleTime: 30_000,
  });
}

export function useIncidentMutations(pubkey: string) {
  const client = useQueryClient();
  return {
    incident: useMutation({
      mutationFn: (input: IncidentControlRecordV1) =>
        publishIncident(pubkey, input),
      onSuccess: () =>
        client.invalidateQueries({ queryKey: incidentsQueryKey(pubkey) }),
    }),
  };
}
