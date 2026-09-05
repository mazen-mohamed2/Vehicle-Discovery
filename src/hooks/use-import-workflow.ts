"use client";

import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
  importActor,
  type ImportOfferRecord,
  type ImportRequestRecord,
} from "@/lib/import-workflow";
import { queryKeys } from "@/lib/query-keys";
import { authStorageScope } from "@/lib/storage-scope";
import { importRequestsService } from "@/services/import-requests.service";

export function useImportWorkflow(requestId?: string) {
  const auth = useAuth();
  const client = useQueryClient();
  const scope = authStorageScope(auth.user);
  const actor = useMemo(() => (auth.user ? importActor(auth.user) : null), [auth.user]);
  const isOwner = actor?.role === "user";
  const isDealer = actor?.role === "dealer";
  const invalidate = async () =>
    client.invalidateQueries({ queryKey: queryKeys.importWorkflow.all });

  useEffect(
    () => importRequestsService.subscribe(() => void invalidate()),
    // The query client is stable for the provider lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [client],
  );

  const owned = useQuery({
    queryKey: queryKeys.importWorkflow.ownedRequests(scope),
    queryFn: () => importRequestsService.ownedRequests(actor!),
    enabled: Boolean(actor && isOwner),
  });
  const open = useQuery({
    queryKey: queryKeys.importWorkflow.openRequests,
    queryFn: () => importRequestsService.openRequests(actor!),
    enabled: Boolean(actor && isDealer),
  });
  const ownerDetail = useQuery({
    queryKey: queryKeys.importWorkflow.ownerDetail(scope, requestId ?? "disabled"),
    queryFn: () => importRequestsService.ownerRequest(actor!, requestId!),
    enabled: Boolean(actor && isOwner && requestId),
  });
  const dealerDetail = useQuery({
    queryKey: queryKeys.importWorkflow.dealerDetail(requestId ?? "disabled"),
    queryFn: () => importRequestsService.dealerRequest(actor!, requestId!),
    enabled: Boolean(actor && isDealer && requestId),
  });
  const request = isOwner ? ownerDetail.data : dealerDetail.data;
  const requestError = isOwner ? ownerDetail.error : dealerDetail.error;
  const ownerOffers = useQuery({
    queryKey: queryKeys.importWorkflow.offers(requestId ?? "disabled"),
    queryFn: () => importRequestsService.offersForOwner(actor!, requestId!),
    enabled: Boolean(actor && isOwner && requestId && ownerDetail.data),
  });
  const allOwnerOffers = useQuery({
    queryKey: queryKeys.importWorkflow.ownerOffers(scope),
    queryFn: () => importRequestsService.offersForOwnedRequests(actor!),
    enabled: Boolean(actor && isOwner && !requestId),
  });
  const dealerOffers = useQuery({
    queryKey: queryKeys.importWorkflow.dealerOffers(scope),
    queryFn: () => importRequestsService.dealerOfferHistory(actor!),
    enabled: Boolean(actor && isDealer),
  });
  const create = useMutation({
    mutationFn: async (
      input: Omit<ImportRequestRecord, "id" | "ownerUserId" | "status" | "createdAt" | "updatedAt">,
    ) => importRequestsService.createRequest(actor!, input),
    onSuccess: invalidate,
  });
  const offer = useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: Pick<ImportOfferRecord, "price" | "currency" | "estimatedDelivery" | "notes">;
    }) => importRequestsService.submitOffer(actor!, id, input),
    onSuccess: invalidate,
  });
  const action = useMutation({
    mutationFn: async ({
      name,
      id,
      offerId,
    }: {
      name: "cancel" | "accept" | "reject" | "withdraw";
      id: string;
      offerId?: string;
    }) => {
      if (name === "cancel") return importRequestsService.cancelRequest(actor!, id);
      if (name === "withdraw") return importRequestsService.withdrawOffer(actor!, offerId!);
      if (name === "reject") return importRequestsService.rejectOffer(actor!, id, offerId!);
      return importRequestsService.acceptOffer(actor!, id, offerId!);
    },
    onSuccess: invalidate,
  });

  return {
    actor,
    isOwner,
    isDealer,
    ownedRequests: owned.data ?? [],
    openRequests: open.data ?? [],
    request,
    offers: ownerOffers.data ?? [],
    ownedOffers: allOwnerOffers.data ?? [],
    dealerOfferHistory: dealerOffers.data ?? [],
    dealerOffers: dealerOffers.data?.map(({ offer }) => offer) ?? [],
    isLoading:
      auth.isHydrating ||
      (isOwner &&
        (requestId
          ? ownerDetail.isPending || (ownerDetail.isSuccess && ownerOffers.isPending)
          : owned.isPending || allOwnerOffers.isPending)) ||
      (isDealer &&
        (requestId
          ? dealerDetail.isPending || dealerOffers.isPending
          : open.isPending || dealerOffers.isPending)),
    isError:
      owned.isError ||
      open.isError ||
      ownerDetail.isError ||
      dealerDetail.isError ||
      ownerOffers.isError ||
      dealerOffers.isError,
    error: requestError ?? owned.error ?? open.error ?? ownerOffers.error ?? dealerOffers.error,
    createRequest: create.mutateAsync,
    submitOffer: offer.mutateAsync,
    runAction: action.mutateAsync,
    isPending: create.isPending || offer.isPending || action.isPending,
  };
}
