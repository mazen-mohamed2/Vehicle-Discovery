import {
  TransactionError,
  type MarketplaceTransaction,
  type TransactionActor,
} from "@/lib/marketplace-transaction";
import { listingContextService } from "@/services/listing-context.service";
import { importRequestsService } from "@/services/import-requests.service";
import { importDealerIdentity } from "@/services/import-presentation.service";

/** Presentation only; failure here must never change the financial agreement. */
export function transactionContext(record: MarketplaceTransaction, actor: TransactionActor) {
  if (actor.id !== record.buyerParticipantId && actor.id !== record.sellerParticipantId)
    throw new TransactionError("FORBIDDEN");
  const source = record.source;
  if (source.type === "LISTING_OFFER")
    return {
      type: "LISTING_OFFER" as const,
      listing: listingContextService.resolve(source.listingId),
    };
  const request =
    actor.role === "user"
      ? importRequestsService
          .ownedRequests(actor)
          .find((item) => item.id === source.importRequestId)
      : importRequestsService
          .dealerOfferHistory(actor)
          .find(
            (item) =>
              item.offer.id === source.offerId && item.request.id === source.importRequestId,
          )?.request;
  return {
    type: "IMPORT_OFFER" as const,
    title: request ? `${request.make} ${request.model} ${request.year}` : record.snapshot.title,
    dealer: importDealerIdentity(record.sellerParticipantId),
    href: request
      ? actor.role === "user"
        ? `/account/import-requests/${encodeURIComponent(request.id)}`
        : "/dealer-account/import-requests"
      : null,
  };
}
