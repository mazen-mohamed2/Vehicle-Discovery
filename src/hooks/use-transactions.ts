"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { communicationActor } from "@/lib/communication";
import { authStorageScope } from "@/lib/storage-scope";
import { queryKeys } from "@/lib/query-keys";
import { TransactionError, type MarketplaceTransactionSource } from "@/lib/marketplace-transaction";
import { marketplaceTransactionsService as service } from "@/services/marketplace-transactions.service";
import { authService } from "@/services/auth.service";

export function useTransactions(id?: string) {
  const auth = useAuth();
  const client = useQueryClient();
  const scope = authStorageScope(auth.user);
  const actor = useMemo(() => (auth.user ? communicationActor(auth.user) : null), [auth.user]);
  const enabled = Boolean(actor) && !auth.isHydrating;
  const invalidate = useCallback(
    () => client.invalidateQueries({ queryKey: queryKeys.transactions.all }),
    [client],
  );
  useEffect(() => service.subscribe(() => void invalidate()), [invalidate]);
  const list = useQuery({
    queryKey: queryKeys.transactions.list(scope),
    queryFn: () => service.listForParticipant(actor!),
    enabled: enabled && !id,
    retry: false,
  });
  const detail = useQuery({
    queryKey: queryKeys.transactions.detail(scope, id ?? "disabled"),
    queryFn: () => service.getById(actor!, id!),
    enabled: enabled && Boolean(id),
    retry: false,
  });
  const start = useMutation({
    mutationKey: ["start-transaction", scope],
    mutationFn: async (source: MarketplaceTransactionSource) => {
      const current = await authService.session();
      if (!actor || authStorageScope(current?.user) !== actor.scope)
        throw new TransactionError("UNAUTHENTICATED");
      return source.type === "LISTING_OFFER"
        ? service.createFromListingOffer(actor, source.offerId, source.listingId)
        : service.createFromImportOffer(actor, source.offerId, source.importRequestId);
    },
    onSuccess: invalidate,
  });
  return { auth, actor, scope, list, detail, start };
}
