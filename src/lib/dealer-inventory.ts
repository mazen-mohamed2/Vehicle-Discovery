import type { FuelType, Transmission, VehicleListing } from "@/lib/types";

export type DealerInventorySort = "newest" | "price-asc" | "price-desc" | "mileage-asc";

export interface DealerInventoryFilters {
  search: string;
  make: string;
  bodyType: string;
  fuel: "" | FuelType;
  transmission: "" | Transmission;
  sort: DealerInventorySort;
}

export function filterDealerInventory(
  inventory: VehicleListing[],
  filters: DealerInventoryFilters,
): VehicleListing[] {
  const search = filters.search.trim().toLocaleLowerCase();
  const filtered = inventory.filter(
    (listing) =>
      (!search ||
        [listing.title, listing.make, listing.model].some((value) =>
          value.toLocaleLowerCase().includes(search),
        )) &&
      (!filters.make || listing.make === filters.make) &&
      (!filters.bodyType || listing.bodyType === filters.bodyType) &&
      (!filters.fuel || listing.fuel === filters.fuel) &&
      (!filters.transmission || listing.transmission === filters.transmission),
  );

  const comparators: Record<DealerInventorySort, (a: VehicleListing, b: VehicleListing) => number> =
    {
      newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
      "price-asc": (a, b) => a.price - b.price,
      "price-desc": (a, b) => b.price - a.price,
      "mileage-asc": (a, b) => a.mileage - b.mileage,
    };
  return [...filtered].sort(comparators[filters.sort]);
}
