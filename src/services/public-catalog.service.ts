import type { VehicleListing } from "@/lib/types";
import { managedListingsService } from "@/services/managed-listings.service";
import { mockListings } from "@/services/mock-data";

/** Single public inventory boundary: seed + active created + future backend records. */
function compose(futureBackendListings: VehicleListing[] = []): VehicleListing[] {
  const byId = new Map<string, VehicleListing>();
  [...mockListings, ...managedListingsService.publicListings(), ...futureBackendListings].forEach(
    (listing) => byId.set(listing.id, listing),
  );
  return [...byId.values()];
}

export const publicCatalogService = {
  list: compose,
  byId: (id: string) => compose().find((listing) => listing.id === id),
  byAgency: (agencyId: string) =>
    compose().filter((listing) => listing.sellerType === "agency" && listing.sellerId === agencyId),
  bySellerType: (sellerType: VehicleListing["sellerType"]) =>
    compose().filter((listing) => listing.sellerType === sellerType),
};
