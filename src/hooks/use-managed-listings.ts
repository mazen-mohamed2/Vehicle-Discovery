"use client";
import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { queryKeys } from "@/lib/query-keys";
import { authStorageScope } from "@/lib/storage-scope";
import type { ManagedListing } from "@/lib/listing";
import type { ListingCategory } from "@/lib/marketplace-listing";
import { listingOwner, managedListingsService } from "@/services/managed-listings.service";

export function useManagedListings(id?: string) {
  const auth = useAuth();
  const client = useQueryClient();
  const scope = authStorageScope(auth.user);
  const owner = useMemo(() => (auth.user ? listingOwner(auth.user) : null), [auth.user]);
  const ownedKey = useMemo(() => queryKeys.managedListings.owned(scope), [scope]);
  const detailKey = useMemo(
    () => (id ? queryKeys.managedListings.detail(scope, id) : null),
    [id, scope],
  );
  const owned = useQuery({
    queryKey: ownedKey,
    queryFn: () => managedListingsService.getOwnedListings(owner!),
    enabled: Boolean(owner),
  });
  const detail = useQuery({
    queryKey: detailKey ?? ["managed-listings", "disabled"],
    queryFn: () => managedListingsService.getListingById(owner!, id!),
    enabled: Boolean(owner && id),
  });
  useEffect(
    () =>
      owner
        ? managedListingsService.subscribe(
            scope,
            () => void client.invalidateQueries({ queryKey: ownedKey }),
          )
        : undefined,
    [client, ownedKey, owner, scope],
  );
  const refresh = async (listing?: ManagedListing) => {
    if (listing) client.setQueryData(queryKeys.managedListings.detail(scope, listing.id), listing);
    await client.invalidateQueries({ queryKey: ownedKey });
    await client.invalidateQueries({ queryKey: ["listings"] });
  };
  const create = useMutation({
    mutationFn: async (category: ListingCategory = "CAR") =>
      managedListingsService.createDraft(owner!, category),
    onSuccess: refresh,
  });
  const update = useMutation({
    mutationFn: async ({
      listingId,
      patch,
    }: {
      listingId: string;
      patch: Partial<ManagedListing>;
    }) => managedListingsService.updateDraft(owner!, listingId, patch),
    onSuccess: refresh,
  });
  const action = useMutation({
    mutationFn: async ({
      name,
      listingId,
    }: {
      name: "publish" | "duplicate" | "sold" | "archive" | "restore" | "delete";
      listingId: string;
    }) => {
      if (name === "publish") return managedListingsService.publishListing(owner!, listingId);
      if (name === "duplicate") return managedListingsService.duplicateListing(owner!, listingId);
      if (name === "sold") return managedListingsService.markAsSold(owner!, listingId);
      if (name === "archive") return managedListingsService.archiveListing(owner!, listingId);
      if (name === "restore") return managedListingsService.restoreListing(owner!, listingId);
      managedListingsService.deleteListing(owner!, listingId);
      return undefined;
    },
    onSuccess: (value) => refresh(value),
  });
  return {
    listings: owned.data ?? [],
    listing: detail.data,
    isLoading: owned.isPending || (Boolean(id) && detail.isPending),
    isError: owned.isError || detail.isError,
    error: owned.error ?? detail.error,
    createDraft: create.mutateAsync,
    updateListing: update.mutateAsync,
    runAction: action.mutateAsync,
    isSaving: update.isPending,
    isActing: action.isPending,
  };
}
