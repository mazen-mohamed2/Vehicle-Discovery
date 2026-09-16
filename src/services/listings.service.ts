import type { VehicleDiscoveryParams, VehicleDiscoveryResult, VehicleListing } from "@/lib/types";
import { publicCatalogService } from "./public-catalog.service";
import {
  listingCategoryRegistry,
  listingMake,
  listingMileage,
  listingModel,
} from "@/lib/marketplace-listing";

const delay = <T>(v: T, ms = 120) => new Promise<T>((r) => setTimeout(() => r(v), ms));

const normalizeMake = (value: string) => value.toLowerCase().replace("-benz", "");
const bounds = (values: number[]): [number, number] =>
  values.length ? [Math.min(...values), Math.max(...values)] : [0, 0];

function relatedTo(listingId: string, limit: number): VehicleListing[] {
  const catalog = publicCatalogService.list();
  const source = catalog.find((listing) => listing.id === listingId);
  if (!source) return [];

  return catalog
    .filter((listing) => listing.id !== listingId && listing.category === source.category)
    .map((listing) => ({
      listing,
      score:
        (normalizeMake(listingMake(listing)) === normalizeMake(listingMake(source)) ? 4 : 0) +
        (listing.category === "CAR" &&
        source.category === "CAR" &&
        listing.specs.bodyType &&
        listing.specs.bodyType === source.specs.bodyType
          ? 2
          : 0) +
        Math.max(0, 1 - Math.abs(listing.price - source.price) / Math.max(source.price, 1)),
    }))
    .sort((a, b) => b.score - a.score || b.listing.createdAt.localeCompare(a.listing.createdAt))
    .slice(0, limit)
    .map(({ listing }) => listing);
}

function discover(params: VehicleDiscoveryParams): VehicleDiscoveryResult {
  const catalog = publicCatalogService.list();
  const categoryCatalog = params.category
    ? catalog.filter((item) => item.category === params.category)
    : catalog;
  const q = params.q?.toLowerCase();
  let items = categoryCatalog.filter((listing) => {
    const keywordMatch =
      !q ||
      [
        listing.title,
        ...listingCategoryRegistry[listing.category].searchFields.map((field) =>
          String(Reflect.get(listing.specs, field) ?? ""),
        ),
      ].some((value) => value.toLowerCase().includes(q));
    return (
      keywordMatch &&
      (!params.category || listing.category === params.category) &&
      (!params.make || normalizeMake(listingMake(listing)) === normalizeMake(params.make)) &&
      (!params.model || listingModel(listing).toLowerCase() === params.model.toLowerCase()) &&
      (!params.year || listing.year === params.year) &&
      (params.priceMin === undefined || listing.price >= params.priceMin) &&
      (params.priceMax === undefined || listing.price <= params.priceMax) &&
      (params.mileageMin === undefined || (listingMileage(listing) ?? -1) >= params.mileageMin) &&
      (params.mileageMax === undefined ||
        (listingMileage(listing) ?? Infinity) <= params.mileageMax) &&
      (!params.fuel || (listing.category === "CAR" && listing.specs.fuelType === params.fuel)) &&
      (!params.transmission ||
        (listing.category === "CAR" && listing.specs.transmission === params.transmission)) &&
      (!params.motorcycleType ||
        (listing.category === "MOTORCYCLE" &&
          listing.specs.motorcycleType === params.motorcycleType)) &&
      (!params.engineCapacityMin ||
        (listing.category === "MOTORCYCLE" &&
          (listing.specs.engineCapacityCc ?? 0) >= params.engineCapacityMin)) &&
      (!params.boatType ||
        (listing.category === "BOAT" && listing.specs.boatType === params.boatType)) &&
      (!params.propulsion ||
        (listing.category === "BOAT" && listing.specs.propulsion === params.propulsion)) &&
      (params.lengthMin === undefined ||
        (listing.category === "BOAT" && (listing.specs.lengthMeters ?? -1) >= params.lengthMin)) &&
      (params.lengthMax === undefined ||
        (listing.category === "BOAT" &&
          (listing.specs.lengthMeters ?? Infinity) <= params.lengthMax)) &&
      (params.engineHoursMax === undefined ||
        (listing.category === "BOAT" &&
          (listing.specs.engineHours ?? Infinity) <= params.engineHoursMax)) &&
      (!params.condition || listing.condition === params.condition) &&
      (!params.sellerType || listing.sellerType === params.sellerType) &&
      (!params.location || listing.location === params.location)
    );
  });

  const comparators = {
    newest: (a: VehicleListing, b: VehicleListing) => b.createdAt.localeCompare(a.createdAt),
    oldest: (a: VehicleListing, b: VehicleListing) => a.createdAt.localeCompare(b.createdAt),
    "price-asc": (a: VehicleListing, b: VehicleListing) => a.price - b.price,
    "price-desc": (a: VehicleListing, b: VehicleListing) => b.price - a.price,
    "mileage-asc": (a: VehicleListing, b: VehicleListing) =>
      (listingMileage(a) ?? Infinity) - (listingMileage(b) ?? Infinity),
    "mileage-desc": (a: VehicleListing, b: VehicleListing) =>
      (listingMileage(b) ?? -1) - (listingMileage(a) ?? -1),
  } satisfies Record<
    VehicleDiscoveryParams["sort"],
    (a: VehicleListing, b: VehicleListing) => number
  >;
  items = [...items].sort(comparators[params.sort]);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / params.pageSize));
  const page = Math.min(params.page, totalPages);
  const start = (page - 1) * params.pageSize;
  return {
    items: items.slice(start, start + params.pageSize),
    total,
    page,
    pageSize: params.pageSize,
    totalPages,
    facets: {
      makes: [...new Set(categoryCatalog.map(listingMake))].sort(),
      models: [
        ...new Set(
          categoryCatalog
            .filter(
              (item) =>
                !params.make || normalizeMake(listingMake(item)) === normalizeMake(params.make),
            )
            .map(listingModel),
        ),
      ].sort(),
      years: [...new Set(categoryCatalog.map((item) => item.year))].sort((a, b) => b - a),
      locations: [...new Set(categoryCatalog.map((item) => item.location))].sort(),
      priceRange: bounds(categoryCatalog.map((item) => item.price)),
      mileageRange: bounds(
        categoryCatalog.flatMap((item) =>
          listingMileage(item) === undefined ? [] : [listingMileage(item)!],
        ),
      ),
      lengthRange: bounds(
        categoryCatalog.flatMap((item) =>
          item.category === "BOAT" && item.specs.lengthMeters !== undefined
            ? [item.specs.lengthMeters]
            : [],
        ),
      ),
      engineCapacityRange: bounds(
        categoryCatalog.flatMap((item) =>
          item.category === "MOTORCYCLE" && item.specs.engineCapacityCc !== undefined
            ? [item.specs.engineCapacityCc]
            : [],
        ),
      ),
      motorcycleTypes: [
        ...new Set(
          categoryCatalog.flatMap((item) =>
            item.category === "MOTORCYCLE" && item.specs.motorcycleType
              ? [item.specs.motorcycleType]
              : [],
          ),
        ),
      ],
      boatTypes: [
        ...new Set(
          categoryCatalog.flatMap((item) =>
            item.category === "BOAT" && item.specs.boatType ? [item.specs.boatType] : [],
          ),
        ),
      ],
      propulsions: [
        ...new Set(
          categoryCatalog.flatMap((item) =>
            item.category === "BOAT" && item.specs.propulsion ? [item.specs.propulsion] : [],
          ),
        ),
      ],
      engineHoursValues: [
        ...new Set(
          categoryCatalog.flatMap((item) =>
            item.category === "BOAT" && item.specs.engineHours !== undefined
              ? [item.specs.engineHours]
              : [],
          ),
        ),
      ].sort((a, b) => a - b),
    },
  };
}

export const listingsService = {
  list: (): Promise<VehicleListing[]> => delay(publicCatalogService.list()),
  featured: (): Promise<VehicleListing[]> =>
    delay(publicCatalogService.list().filter((l) => l.featured)),
  recent: (limit = 6): Promise<VehicleListing[]> =>
    delay(
      publicCatalogService
        .list()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit),
    ),
  byId: (id: string): Promise<VehicleListing | undefined> => delay(publicCatalogService.byId(id)),
  byOwner: (): Promise<VehicleListing[]> => delay(publicCatalogService.bySellerType("individual")),
  byAgency: (agencyId: string): Promise<VehicleListing[]> =>
    delay(publicCatalogService.byAgency(agencyId)),
  related: (listingId: string, limit = 4): Promise<VehicleListing[]> =>
    delay(relatedTo(listingId, limit)),
  discover: (params: VehicleDiscoveryParams): Promise<VehicleDiscoveryResult> =>
    delay(discover(params)),
};
