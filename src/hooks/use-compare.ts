"use client";

import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useHydrationReady } from "@/hooks/use-hydration-ready";
import {
  compareService,
  MAX_COMPARE_VEHICLES,
  normalizeCompareIds,
} from "@/services/compare.service";

export function useCompare() {
  const queryClient = useQueryClient();
  const hydrationReady = useHydrationReady();
  const query = useQuery({ queryKey: queryKeys.compare.all, queryFn: compareService.list });
  const comparedIds = useMemo(() => query.data ?? [], [query.data]);
  const mutation = useMutation({
    mutationFn: compareService.replace,
    onMutate: async (nextIds: string[]) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.compare.all });
      const previous = queryClient.getQueryData<string[]>(queryKeys.compare.all) ?? [];
      const next = normalizeCompareIds(nextIds);
      queryClient.setQueryData<string[]>(queryKeys.compare.all, next);
      return { previous };
    },
    onError: (_error, _variables, context) =>
      queryClient.setQueryData(queryKeys.compare.all, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.compare.all }),
  });
  const isCompared = useCallback(
    (listingId: string) => comparedIds.includes(listingId),
    [comparedIds],
  );
  const replaceCompare = (ids: string[]) => mutation.mutate(normalizeCompareIds(ids));
  const addToCompare = (listingId: string) => {
    if (isCompared(listingId)) return true;
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
    isHydrating: !hydrationReady || query.isPending,
    isCompared,
    addToCompare,
    removeFromCompare,
    toggleCompare,
    replaceCompare,
    clearCompare: () => replaceCompare([]),
    isUpdating: mutation.isPending,
  };
}
