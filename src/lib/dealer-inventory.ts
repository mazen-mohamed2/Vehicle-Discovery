import type { FuelType, Transmission, VehicleListing } from "@/lib/types";
import { listingMileage } from "@/lib/marketplace-listing";
import type { BoatType, MotorcycleType, PropulsionType } from "@/lib/marketplace-listing";

export type DealerInventorySort = "newest" | "price-asc" | "price-desc" | "mileage-asc";

export interface DealerInventoryFilters {
  search: string;
  category?: "" | VehicleListing["category"];
  make: string;
  bodyType: string;
  fuel: "" | FuelType;
  transmission: "" | Transmission;
  motorcycleType?: "" | MotorcycleType;
  boatType?: "" | BoatType;
  propulsion?: "" | PropulsionType;
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
        [listing.title, listing.specs.make, listing.specs.model].some((value) =>
          value.toLocaleLowerCase().includes(search),
        )) &&
      (!filters.category || listing.category === filters.category) &&
      (!filters.make || listing.specs.make === filters.make) &&
      (!filters.bodyType ||
        (listing.category === "CAR" && listing.specs.bodyType === filters.bodyType)) &&
      (!filters.fuel || (listing.category === "CAR" && listing.specs.fuelType === filters.fuel)) &&
      (!filters.transmission ||
        (listing.category === "CAR" && listing.specs.transmission === filters.transmission)) &&
      (!filters.motorcycleType ||
        (listing.category === "MOTORCYCLE" &&
          listing.specs.motorcycleType === filters.motorcycleType)) &&
      (!filters.boatType ||
        (listing.category === "BOAT" && listing.specs.boatType === filters.boatType)) &&
      (!filters.propulsion ||
        (listing.category === "BOAT" && listing.specs.propulsion === filters.propulsion)),
  );

  const comparators: Record<DealerInventorySort, (a: VehicleListing, b: VehicleListing) => number> =
    {
      newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
      "price-asc": (a, b) => a.price - b.price,
      "price-desc": (a, b) => b.price - a.price,
      "mileage-asc": (a, b) => (listingMileage(a) ?? Infinity) - (listingMileage(b) ?? Infinity),
    };
  return [...filtered].sort(comparators[filters.sort]);
}
