"use client";

import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Favorite } from "@/lib/types";
import { queryKeys } from "@/lib/query-keys";
import { favoritesService } from "@/services/favorites.service";
import { useHydrationReady } from "@/hooks/use-hydration-ready";

type ToggleFavorite = { listingId: string; wasFavorite: boolean };

export function useFavorites() {
  const queryClient = useQueryClient();
  const hydrationReady = useHydrationReady();
  const query = useQuery({
    queryKey: queryKeys.favorites.all,
    queryFn: favoritesService.list,
  });
  const favorites = useMemo(() => query.data ?? [], [query.data]);
  const isFavorite = useCallback(
    (listingId: string) => favorites.some((favorite) => favorite.listingId === listingId),
    [favorites],
  );
  const mutation = useMutation({
    mutationFn: async ({ listingId, wasFavorite }: ToggleFavorite) => {
      if (wasFavorite) await favoritesService.remove(listingId);
      else await favoritesService.add(listingId);
    },
    onMutate: async ({ listingId, wasFavorite }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.favorites.all });
      const previous = queryClient.getQueryData<Favorite[]>(queryKeys.favorites.all) ?? [];
      queryClient.setQueryData<Favorite[]>(
        queryKeys.favorites.all,
        wasFavorite
          ? previous.filter((favorite) => favorite.listingId !== listingId)
          : [
              ...previous,
              {
                id: `optimistic_${listingId}`,
                userId: "me",
                listingId,
                createdAt: new Date().toISOString(),
              },
            ],
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(queryKeys.favorites.all, context?.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.favorites.all }),
  });
  const clearMutation = useMutation({
    mutationFn: favoritesService.clear,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.favorites.all });
      const previous = queryClient.getQueryData<Favorite[]>(queryKeys.favorites.all) ?? [];
      queryClient.setQueryData<Favorite[]>(queryKeys.favorites.all, []);
      return { previous };
    },
    onError: (_error, _variables, context) =>
      queryClient.setQueryData(queryKeys.favorites.all, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.favorites.all }),
  });
  const toggleFavorite = (listingId: string) =>
    mutation.mutate({ listingId, wasFavorite: isFavorite(listingId) });

  return {
    favorites,
    isFavorite,
    toggleFavorite,
    isHydrating: !hydrationReady || query.isPending,
    isError: query.isError,
    refetch: query.refetch,
    togglingListingId: mutation.isPending ? mutation.variables?.listingId : undefined,
    clearFavorites: clearMutation.mutate,
    isClearing: clearMutation.isPending,
  };
}
