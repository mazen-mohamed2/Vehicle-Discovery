"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useHydrationReady } from "@/hooks/use-hydration-ready";
import { useAuth } from "@/hooks/use-auth";
import { authStorageScope } from "@/lib/storage-scope";
import {
  compareService,
  canCompareListing,
  MAX_COMPARE_VEHICLES,
  normalizeCompareIds,
  sameCategoryCompareIds,
} from "@/services/compare.service";

export function useCompare() {
  const queryClient = useQueryClient();
  const hydrationReady = useHydrationReady();
  const auth = useAuth();
  const scope = authStorageScope(auth.user);
  const queryKey = useMemo(() => queryKeys.compare.byScope(scope), [scope]);
  const query = useQuery({
    queryKey,
    queryFn: () => compareService.list(scope),
    enabled: !auth.isHydrating,
    refetchOnMount: "always",
  });
  useEffect(
    () => compareService.subscribe(scope, () => void queryClient.invalidateQueries({ queryKey })),
    [queryClient, queryKey, scope],
  );
  const comparedIds = useMemo(() => query.data ?? [], [query.data]);
  const mutation = useMutation({
    mutationFn: (ids: string[]) => compareService.replace(scope, ids),
    onMutate: async (nextIds: string[]) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<string[]>(queryKey) ?? [];
      queryClient.setQueryData<string[]>(
        queryKey,
        sameCategoryCompareIds(normalizeCompareIds(nextIds)),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => queryClient.setQueryData(queryKey, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
  const isCompared = useCallback(
    (listingId: string) => comparedIds.includes(listingId),
    [comparedIds],
  );
  const replaceCompare = (ids: string[]) =>
    mutation.mutate(sameCategoryCompareIds(normalizeCompareIds(ids)));
  const addToCompare = (listingId: string) => {
    if (isCompared(listingId)) return true;
    if (!canCompareListing(comparedIds, listingId)) return false;
    if (comparedIds.length >= MAX_COMPARE_VEHICLES) return false;
    replaceCompare([...comparedIds, listingId]);
    return true;
  };
  const removeFromCompare = (listingId: string) =>
    replaceCompare(comparedIds.filter((id) => id !== listingId));
  const toggleCompare = (listingId: string) =>
    isCompared(listingId) ? (removeFromCompare(listingId), true) : addToCompare(listingId);
  return {
    comparedIds,
    compareCount: comparedIds.length,
    canCompare: comparedIds.length < MAX_COMPARE_VEHICLES,
    scope,
    isHydrating: !hydrationReady || auth.isHydrating || query.isPending,
    isCompared,
    canCompareListing: (listingId: string) => canCompareListing(comparedIds, listingId),
    addToCompare,
    removeFromCompare,
    toggleCompare,
    replaceCompare,
    clearCompare: () => replaceCompare([]),
    isUpdating: mutation.isPending,
  };
}
