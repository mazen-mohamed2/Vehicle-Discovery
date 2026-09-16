import type {
  Condition,
  FuelType,
  SellerType,
  Transmission,
  VehicleDiscoveryParams,
  VehicleSort,
} from "@/lib/types";
import {
  boatTypes,
  listingCategories,
  motorcycleTypes,
  propulsionTypes,
  type ListingCategory,
  type BoatType,
  type MotorcycleType,
  type PropulsionType,
} from "@/lib/marketplace-listing";

const sorts = new Set<VehicleSort>([
  "newest",
  "oldest",
  "price-asc",
  "price-desc",
  "mileage-asc",
  "mileage-desc",
]);
const fuels = new Set<FuelType>(["gasoline", "diesel", "hybrid", "electric"]);
const transmissions = new Set<Transmission>(["automatic", "manual"]);
const conditions = new Set<Condition>(["new", "used"]);
const sellers = new Set<SellerType>(["individual", "agency"]);

const positiveNumber = (value: string | null) => {
  const parsed = Number(value);
  return value && Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

export function parseDiscoveryParams(
  search: URLSearchParams,
  lockedSellerType?: SellerType,
): VehicleDiscoveryParams {
  const sort = search.get("sort") as VehicleSort | null;
  const fuel = search.get("fuel") as FuelType | null;
  const transmission = search.get("transmission") as Transmission | null;
  const condition = search.get("condition") as Condition | null;
  const seller = search.get("sellerType") as SellerType | null;
  const requestedCategory = search.get("category") as ListingCategory | null;
  const category =
    requestedCategory && listingCategories.includes(requestedCategory)
      ? requestedCategory
      : undefined;
  const requestedSort = sort && sorts.has(sort) ? sort : "newest";
  return {
    category,
    q: search.get("q")?.trim() || undefined,
    make: search.get("make") || undefined,
    model: search.get("model") || undefined,
    year: positiveNumber(search.get("year")),
    priceMin: positiveNumber(search.get("priceMin")),
    priceMax: positiveNumber(search.get("priceMax")),
    mileageMin: category === "BOAT" ? undefined : positiveNumber(search.get("mileageMin")),
    mileageMax: category === "BOAT" ? undefined : positiveNumber(search.get("mileageMax")),
    fuel:
      !category || category === "CAR" ? (fuel && fuels.has(fuel) ? fuel : undefined) : undefined,
    transmission:
      !category || category === "CAR"
        ? transmission && transmissions.has(transmission)
          ? transmission
          : undefined
        : undefined,
    motorcycleType:
      category === "MOTORCYCLE" &&
      motorcycleTypes.includes(search.get("motorcycleType") as MotorcycleType)
        ? (search.get("motorcycleType") as MotorcycleType)
        : undefined,
    boatType:
      category === "BOAT" && boatTypes.includes(search.get("boatType") as BoatType)
        ? (search.get("boatType") as BoatType)
        : undefined,
    propulsion:
      category === "BOAT" && propulsionTypes.includes(search.get("propulsion") as PropulsionType)
        ? (search.get("propulsion") as PropulsionType)
        : undefined,
    lengthMin: category === "BOAT" ? positiveNumber(search.get("lengthMin")) : undefined,
    lengthMax: category === "BOAT" ? positiveNumber(search.get("lengthMax")) : undefined,
    engineHoursMax: category === "BOAT" ? positiveNumber(search.get("engineHoursMax")) : undefined,
    engineCapacityMin:
      category === "MOTORCYCLE" ? positiveNumber(search.get("engineCapacityMin")) : undefined,
    condition: condition && conditions.has(condition) ? condition : undefined,
    sellerType: lockedSellerType ?? (seller && sellers.has(seller) ? seller : undefined),
    location: search.get("location") || undefined,
    sort: category === "BOAT" && requestedSort.startsWith("mileage") ? "newest" : requestedSort,
    page: Math.max(1, positiveNumber(search.get("page")) ?? 1),
    pageSize: Math.min(24, Math.max(4, positiveNumber(search.get("pageSize")) ?? 8)),
  };
}

export function canonicalMake(make: string) {
  return make.toLowerCase() === "mercedes" ? "Mercedes-Benz" : make;
}
