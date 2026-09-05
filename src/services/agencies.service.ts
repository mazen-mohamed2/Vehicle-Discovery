import type { Agency, AgencyRecommendation } from "@/lib/types";
import { mockAgencies } from "./mock-data";
import { publicCatalogService } from "./public-catalog.service";

const delay = <T>(v: T, ms = 120) => new Promise<T>((r) => setTimeout(() => r(v), ms));

function similarTo(agencyId: string, limit: number): AgencyRecommendation[] {
  const source = mockAgencies.find((agency) => agency.id === agencyId);
  if (!source) return [];
  const catalog = publicCatalogService.list();
  const sourceInventory = catalog.filter(
    (listing) => listing.sellerType === "agency" && listing.sellerId === agencyId,
  );
  const sourceBrands = new Set(sourceInventory.map((listing) => listing.make));

  return mockAgencies
    .filter((agency) => agency.id !== agencyId)
    .map((agency) => {
      const inventory = catalog.filter(
        (listing) => listing.sellerType === "agency" && listing.sellerId === agency.id,
      );
      const sharedBrands = [...new Set(inventory.map((listing) => listing.make))].filter((brand) =>
        sourceBrands.has(brand),
      );
      const inventoryDistance = Math.abs(inventory.length - sourceInventory.length);
      return {
        agency,
        vehicleCount: inventory.length,
        sharedBrands,
        score:
          (agency.location === source.location ? 5 : 0) +
          sharedBrands.length * 3 +
          1 / (inventoryDistance + 1),
      };
    })
    .sort((a, b) => b.score - a.score || b.agency.rating - a.agency.rating)
    .slice(0, limit)
    .map(({ agency, vehicleCount, sharedBrands }) => ({ agency, vehicleCount, sharedBrands }));
}

export const agenciesService = {
  list: (): Promise<Agency[]> => delay(mockAgencies),
  byId: (id: string): Promise<Agency | null> =>
    delay(mockAgencies.find((a) => a.id === id) ?? null),
  verified: (): Promise<Agency[]> => delay(mockAgencies.filter((a) => a.verified)),
  similar: (agencyId: string, limit = 3): Promise<AgencyRecommendation[]> =>
    delay(similarTo(agencyId, limit)),
};
