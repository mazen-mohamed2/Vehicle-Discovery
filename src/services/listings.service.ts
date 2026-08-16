import type { VehicleDiscoveryParams, VehicleDiscoveryResult, VehicleListing } from "@/lib/types";
import { publicCatalogService } from "./public-catalog.service";

const delay = <T>(v: T, ms = 120) => new Promise<T>((r) => setTimeout(() => r(v), ms));

const normalizeMake = (value: string) => value.toLowerCase().replace("-benz", "");

function relatedTo(listingId: string, limit: number): VehicleListing[] {
  const catalog = publicCatalogService.list();
  const source = catalog.find((listing) => listing.id === listingId);
  if (!source) return [];

  return catalog
    .filter((listing) => listing.id !== listingId)
    .map((listing) => ({
      listing,
      score:
        (normalizeMake(listing.make) === normalizeMake(source.make) ? 4 : 0) +
        (listing.bodyType && listing.bodyType === source.bodyType ? 2 : 0) +
        Math.max(0, 1 - Math.abs(listing.price - source.price) / Math.max(source.price, 1)),
    }))
    .sort((a, b) => b.score - a.score || b.listing.createdAt.localeCompare(a.listing.createdAt))
    .slice(0, limit)
    .map(({ listing }) => listing);
}

function discover(params: VehicleDiscoveryParams): VehicleDiscoveryResult {
  const catalog = publicCatalogService.list();
  const q = params.q?.toLowerCase();
  let items = catalog.filter((listing) => {
    const keywordMatch =
      !q ||
      [listing.title, listing.make, listing.model].some((value) => value.toLowerCase().includes(q));
    return (
      keywordMatch &&
      (!params.make || normalizeMake(listing.make) === normalizeMake(params.make)) &&
      (!params.model || listing.model.toLowerCase() === params.model.toLowerCase()) &&
      (!params.year || listing.year === params.year) &&
      (params.priceMin === undefined || listing.price >= params.priceMin) &&
      (params.priceMax === undefined || listing.price <= params.priceMax) &&
      (params.mileageMin === undefined || listing.mileage >= params.mileageMin) &&
      (params.mileageMax === undefined || listing.mileage <= params.mileageMax) &&
      (!params.fuel || listing.fuel === params.fuel) &&
      (!params.transmission || listing.transmission === params.transmission) &&
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
    "mileage-asc": (a: VehicleListing, b: VehicleListing) => a.mileage - b.mileage,
    "mileage-desc": (a: VehicleListing, b: VehicleListing) => b.mileage - a.mileage,
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
      makes: [...new Set(catalog.map((item) => item.make))].sort(),
      models: [
        ...new Set(
          catalog
            .filter(
              (item) => !params.make || normalizeMake(item.make) === normalizeMake(params.make),
            )
            .map((item) => item.model),
        ),
      ].sort(),
      years: [...new Set(catalog.map((item) => item.year))].sort((a, b) => b - a),
      locations: [...new Set(catalog.map((item) => item.location))].sort(),
      priceRange: [
        Math.min(...catalog.map((item) => item.price)),
        Math.max(...catalog.map((item) => item.price)),
      ],
      mileageRange: [
        Math.min(...catalog.map((item) => item.mileage)),
        Math.max(...catalog.map((item) => item.mileage)),
      ],
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
