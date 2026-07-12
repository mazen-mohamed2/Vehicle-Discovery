import type { VehicleListing } from "@/lib/types";
import { mockListings } from "./mock-data";

const delay = <T>(v: T, ms = 120) => new Promise<T>((r) => setTimeout(() => r(v), ms));

export const listingsService = {
  list: (): Promise<VehicleListing[]> => delay(mockListings),
  featured: (): Promise<VehicleListing[]> => delay(mockListings.filter((l) => l.featured)),
  recent: (limit = 6): Promise<VehicleListing[]> =>
    delay([...mockListings].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit)),
  byId: (id: string): Promise<VehicleListing | undefined> =>
    delay(mockListings.find((l) => l.id === id)),
  byOwner: (): Promise<VehicleListing[]> =>
    delay(mockListings.filter((l) => l.sellerType === "individual")),
  byAgency: (): Promise<VehicleListing[]> =>
    delay(mockListings.filter((l) => l.sellerType === "agency")),
};
