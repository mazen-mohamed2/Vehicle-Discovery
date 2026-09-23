import {
  CommunicationError,
  type VehicleOfferRecord,
  type VehicleOfferStatus,
} from "@/lib/communication";
import { MoneyValidationError } from "@/lib/money";
import type { ListingCategory } from "@/lib/marketplace-listing";
import type { ListingContextPresentation } from "@/services/listing-context.service";
export type OfferSort = "newest" | "oldest" | "amountHigh" | "amountLow";
export interface OfferFilters {
  search: string;
  status: "ALL" | VehicleOfferStatus;
  category: "ALL" | ListingCategory;
  sort: OfferSort;
}
export const defaultOfferFilters: OfferFilters = {
  search: "",
  status: "ALL",
  category: "ALL",
  sort: "newest",
};
/** Authorized input only; presentation sorting/filtering never writes or reorders the source. */
export function presentOffers(
  offers: readonly VehicleOfferRecord[],
  filters: OfferFilters,
  contexts: ReadonlyMap<string, ListingContextPresentation>,
) {
  const search = filters.search.trim().toLocaleLowerCase();
  return offers
    .filter((offer) => {
      const context = contexts.get(offer.listingId);
      return (
        (filters.status === "ALL" || offer.status === filters.status) &&
        (filters.category === "ALL" || context?.category === filters.category) &&
        (!search || Boolean(context?.title?.toLocaleLowerCase().includes(search)))
      );
    })
    .sort((a, b) => {
      const newest = Date.parse(b.createdAt) - Date.parse(a.createdAt);
      if (filters.sort === "oldest") return -newest || a.id.localeCompare(b.id);
      // No exchange rates are invented: amount sorts group currencies, then compare face values.
      if (filters.sort === "amountHigh" || filters.sort === "amountLow")
        return (
          a.currency.localeCompare(b.currency) ||
          (filters.sort === "amountHigh" ? b.amount - a.amount : a.amount - b.amount) ||
          newest ||
          a.id.localeCompare(b.id)
        );
      return newest || a.id.localeCompare(b.id);
    });
}
export function offerErrorKey(error: unknown) {
  if (error instanceof MoneyValidationError)
    return error.code === "precision" ? "money.precision" : "vehicleOffers.invalid";
  if (error instanceof CommunicationError) {
    if (error.code === "DUPLICATE_ACTIVE_OFFER") return "offers.pending";
    if (error.code === "ACCEPTED_OFFER_EXISTS")
      return error.fields.offer === "acceptedOwn" ? "offers.accepted" : "offers.acceptedOther";
    if (error.code === "VALIDATION_ERROR")
      return error.fields.amount === "precision" ? "money.precision" : "vehicleOffers.invalid";
    if (error.code === "SELF_INTERACTION") return "communication.self";
  }
  return "communication.error";
}
