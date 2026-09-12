"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { queryKeys } from "@/lib/query-keys";
import { authStorageScope } from "@/lib/storage-scope";
import {
  trustActor,
  type ReportReason,
  type ReportTargetType,
  type VerificationSubjectType,
} from "@/lib/trust-safety";
import { trustSafetyService } from "@/services/trust-safety.service";

export function useTrustSafety(subject?: { type: VerificationSubjectType; id: string }) {
  const auth = useAuth();
  const client = useQueryClient();
  const actor = auth.user ? trustActor(auth.user) : null;
  const scope = authStorageScope(auth.user);
  useEffect(
    () =>
      trustSafetyService.subscribe(
        () => void client.invalidateQueries({ queryKey: queryKeys.trustSafety.all }),
      ),
    [client],
  );
  const verification = useQuery({
    queryKey: queryKeys.trustSafety.verification(
      scope,
      subject?.type ?? "disabled",
      subject?.id ?? "disabled",
    ),
    queryFn: () => trustSafetyService.verificationForOwner(actor!, subject!.type, subject!.id),
    enabled: Boolean(actor && subject),
  });
  const reports = useQuery({
    queryKey: queryKeys.trustSafety.reports(scope),
    queryFn: () => trustSafetyService.reports(actor!),
    enabled: Boolean(actor),
  });
  const submitVerification = useMutation({
    mutationFn: async () =>
      trustSafetyService.submitVerification(actor!, subject!.type, subject!.id),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.trustSafety.all }),
  });
  const submitReport = useMutation({
    mutationFn: async (input: {
      targetType: ReportTargetType;
      targetId: string;
      reason: ReportReason;
      description?: string;
    }) => trustSafetyService.submitReport(actor!, input),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.trustSafety.all }),
  });
  return {
    actor,
    verification: verification.data ?? null,
    status:
      verification.data?.status ??
      (subject ? trustSafetyService.publicStatus(subject.type, subject.id) : "NOT_SUBMITTED"),
    reports: reports.data ?? [],
    isHydrating:
      auth.isHydrating || (Boolean(subject) && verification.isPending) || reports.isPending,
    isError: verification.isError || reports.isError,
    submitVerification: submitVerification.mutateAsync,
    submitReport: submitReport.mutateAsync,
    isPending: submitVerification.isPending || submitReport.isPending,
  };
}
