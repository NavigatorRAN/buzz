import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchRiskRegister,
  publishRiskAuthorityProfile,
  publishRiskRecord,
} from "./data/riskService";
import type { RiskAuthorityProfileV1, RiskRecordV1 } from "./domain/contracts";

export const riskQueryKey = (pubkey: string) =>
  ["risk-register", pubkey] as const;

export function useRiskRegisterQuery(pubkey: string | undefined) {
  return useQuery({
    enabled: Boolean(pubkey),
    queryKey: riskQueryKey(pubkey ?? ""),
    queryFn: () => fetchRiskRegister(pubkey ?? ""),
    staleTime: 30_000,
  });
}

export function useRiskMutations(pubkey: string) {
  const client = useQueryClient();
  const invalidate = () =>
    client.invalidateQueries({ queryKey: riskQueryKey(pubkey) });
  return {
    risk: useMutation({
      mutationFn: (input: RiskRecordV1) => publishRiskRecord(pubkey, input),
      onSuccess: invalidate,
    }),
    profile: useMutation({
      mutationFn: (input: RiskAuthorityProfileV1) =>
        publishRiskAuthorityProfile(pubkey, input),
      onSuccess: invalidate,
    }),
  };
}
