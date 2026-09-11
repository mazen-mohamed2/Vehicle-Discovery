"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { communicationActor } from "@/lib/communication";
import { queryKeys } from "@/lib/query-keys";
import { authStorageScope } from "@/lib/storage-scope";
import { marketplaceCommunicationService as service } from "@/services/marketplace-communication.service";

export function useMarketplaceCommunication(conversationId?: string) {
  const auth = useAuth();
  const client = useQueryClient();
  const scope = authStorageScope(auth.user);
  const actor = useMemo(() => (auth.user ? communicationActor(auth.user) : null), [auth.user]);
  const invalidate = useCallback(
    async () => client.invalidateQueries({ queryKey: queryKeys.communication.all }),
    [client],
  );
  useEffect(() => service.subscribe(() => void invalidate()), [invalidate]);
  const conversations = useQuery({
    queryKey: queryKeys.communication.conversations(scope),
    queryFn: () => service.conversationSummaries(actor!),
    enabled: Boolean(actor),
  });
  const detail = useQuery({
    queryKey: queryKeys.communication.conversation(scope, conversationId ?? "disabled"),
    queryFn: () => service.conversation(actor!, conversationId!),
    enabled: Boolean(actor && conversationId),
  });
  const messages = useQuery({
    queryKey: queryKeys.communication.messages(scope, conversationId ?? "disabled"),
    queryFn: () => service.messages(actor!, conversationId!),
    enabled: Boolean(actor && conversationId && detail.data),
  });
  const buyerOffers = useQuery({
    queryKey: queryKeys.communication.buyerOffers(scope),
    queryFn: () => service.buyerOffers(actor!),
    enabled: Boolean(actor),
  });
  const receivedOffers = useQuery({
    queryKey: queryKeys.communication.receivedOffers(scope),
    queryFn: () => service.receivedOffers(actor!),
    enabled: Boolean(actor),
  });
  const start = useMutation({
    mutationFn: async (listingId: string) => service.startConversation(actor!, listingId),
    onSuccess: invalidate,
  });
  const send = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: string }) =>
      service.sendMessage(actor!, id, body),
    onSuccess: invalidate,
  });
  const read = useMutation({
    mutationFn: async (id: string) => service.markConversationRead(actor!, id),
    onSuccess: async () => {
      await Promise.all([
        invalidate(),
        client.invalidateQueries({ queryKey: queryKeys.notifications.all }),
      ]);
    },
  });
  const createOffer = useMutation({
    mutationFn: async (input: {
      listingId: string;
      amount: number;
      currency: "EGP" | "USD";
      note?: string;
    }) => service.createOffer(actor!, input.listingId, input),
    onSuccess: invalidate,
  });
  const offerAction = useMutation({
    mutationFn: async ({ action, id }: { action: "accept" | "reject" | "withdraw"; id: string }) =>
      action === "accept"
        ? service.acceptOffer(actor!, id)
        : action === "reject"
          ? service.rejectOffer(actor!, id)
          : service.withdrawOffer(actor!, id),
    onSuccess: invalidate,
  });
  return {
    actor,
    conversationSummaries: conversations.data ?? [],
    conversations: conversations.data?.map(({ conversation }) => conversation) ?? [],
    conversation: detail.data,
    messages: messages.data ?? [],
    buyerOffers: buyerOffers.data ?? [],
    receivedOffers: receivedOffers.data ?? [],
    error:
      detail.error ??
      messages.error ??
      conversations.error ??
      buyerOffers.error ??
      receivedOffers.error,
    isError:
      detail.isError ||
      messages.isError ||
      conversations.isError ||
      buyerOffers.isError ||
      receivedOffers.isError,
    isLoading:
      auth.isHydrating ||
      (conversationId
        ? detail.isPending || (detail.isSuccess && messages.isPending)
        : conversations.isPending || buyerOffers.isPending || receivedOffers.isPending),
    isPending:
      start.isPending ||
      send.isPending ||
      read.isPending ||
      createOffer.isPending ||
      offerAction.isPending,
    startConversation: start.mutateAsync,
    sendMessage: send.mutateAsync,
    markRead: read.mutateAsync,
    createOffer: createOffer.mutateAsync,
    runOfferAction: offerAction.mutateAsync,
  };
}
