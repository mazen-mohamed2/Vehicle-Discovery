import type {
  Condition,
  FuelType,
  SellerType,
  Transmission,
  VehicleDiscoveryParams,
  VehicleSort,
} from "@/lib/types";

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
  return {
    q: search.get("q")?.trim() || undefined,
    make: search.get("make") || undefined,
    model: search.get("model") || undefined,
    year: positiveNumber(search.get("year")),
    priceMin: positiveNumber(search.get("priceMin")),
    priceMax: positiveNumber(search.get("priceMax")),
    mileageMin: positiveNumber(search.get("mileageMin")),
    mileageMax: positiveNumber(search.get("mileageMax")),
    fuel: fuel && fuels.has(fuel) ? fuel : undefined,
    transmission: transmission && transmissions.has(transmission) ? transmission : undefined,
    condition: condition && conditions.has(condition) ? condition : undefined,
    sellerType: lockedSellerType ?? (seller && sellers.has(seller) ? seller : undefined),
    location: search.get("location") || undefined,
    sort: sort && sorts.has(sort) ? sort : "newest",
    page: Math.max(1, positiveNumber(search.get("page")) ?? 1),
    pageSize: Math.min(24, Math.max(4, positiveNumber(search.get("pageSize")) ?? 8)),
  };
}

export function canonicalMake(make: string) {
  return make.toLowerCase() === "mercedes" ? "Mercedes-Benz" : make;
}
