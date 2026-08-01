"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Favorite } from "@/lib/types";
import { queryKeys } from "@/lib/query-keys";
import { favoritesService } from "@/services/favorites.service";
import { useHydrationReady } from "@/hooks/use-hydration-ready";
import { useAuth } from "@/hooks/use-auth";
import { authStorageScope } from "@/lib/storage-scope";

type ToggleFavorite = { listingId: string; wasFavorite: boolean };

export function useFavorites() {
  const queryClient = useQueryClient();
  const hydrationReady = useHydrationReady();
  const auth = useAuth();
  const scope = authStorageScope(auth.user);
  const queryKey = useMemo(() => queryKeys.favorites.byScope(scope), [scope]);
  const query = useQuery({
    queryKey,
    queryFn: () => favoritesService.list(scope),
    enabled: !auth.isHydrating,
    refetchOnMount: "always",
  });
  useEffect(
    () => favoritesService.subscribe(scope, () => void queryClient.invalidateQueries({ queryKey })),
    [queryClient, queryKey, scope],
  );
  const favorites = useMemo(() => query.data ?? [], [query.data]);
  const isFavorite = useCallback(
    (listingId: string) => favorites.some((favorite) => favorite.listingId === listingId),
    [favorites],
  );
  const mutation = useMutation({
    mutationFn: async ({ listingId, wasFavorite }: ToggleFavorite) => {
      if (wasFavorite) await favoritesService.remove(scope, listingId);
      else await favoritesService.add(scope, listingId);
    },
    onMutate: async ({ listingId, wasFavorite }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Favorite[]>(queryKey) ?? [];
      queryClient.setQueryData<Favorite[]>(
        queryKey,
        wasFavorite
          ? previous.filter((favorite) => favorite.listingId !== listingId)
          : [
              ...previous,
              {
                id: `optimistic_${listingId}`,
                userId: scope,
                listingId,
                createdAt: new Date().toISOString(),
              },
            ],
      );
      return { previous };
    },
    onError: (_error, _variables, context) => queryClient.setQueryData(queryKey, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
  const clearMutation = useMutation({
    mutationFn: () => favoritesService.clear(scope),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Favorite[]>(queryKey) ?? [];
      queryClient.setQueryData<Favorite[]>(queryKey, []);
      return { previous };
    },
    onError: (_error, _variables, context) => queryClient.setQueryData(queryKey, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
  const toggleFavorite = (listingId: string) =>
    mutation.mutate({ listingId, wasFavorite: isFavorite(listingId) });
  return {
    favorites,
    isFavorite,
    toggleFavorite,
    scope,
    isHydrating: !hydrationReady || auth.isHydrating || query.isPending,
    isError: query.isError,
    refetch: query.refetch,
    togglingListingId: mutation.isPending ? mutation.variables?.listingId : undefined,
    clearFavorites: clearMutation.mutate,
    isClearing: clearMutation.isPending,
  };
}
