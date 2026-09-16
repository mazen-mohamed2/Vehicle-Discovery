import type { Condition, FuelType, SellerType, Transmission, VehicleMedia } from "@/lib/types";
import { formatMileage, formatNumber } from "@/lib/locale";

export const listingCategories = ["CAR", "MOTORCYCLE", "BOAT"] as const;
export type ListingCategory = (typeof listingCategories)[number];

export const motorcycleTypes = [
  "scooter",
  "sport",
  "cruiser",
  "touring",
  "adventure",
  "naked",
  "off-road",
] as const;
export type MotorcycleType = (typeof motorcycleTypes)[number];
export const boatTypes = [
  "motorboat",
  "yacht",
  "speedboat",
  "fishing",
  "sailboat",
  "personal-watercraft",
] as const;
export type BoatType = (typeof boatTypes)[number];
export const propulsionTypes = ["outboard", "inboard", "sail", "jet"] as const;
export type PropulsionType = (typeof propulsionTypes)[number];

export interface CarSpecs {
  make: string;
  model: string;
  trim: string;
  mileage?: number;
  transmission: Transmission | "";
  fuelType: FuelType | "";
  bodyType: string;
  drivetrain: string;
  exteriorColor: string;
  interiorColor: string;
  engineSize?: number;
  /** Preserves legacy fixture engine labels, including electric powertrains. */
  engineDisplay?: string;
  horsepower?: number;
  doors?: number;
  seats?: number;
  accidentHistory: "none" | "declared" | "unknown";
  importStatus: "local" | "imported" | "unknown";
  warrantyStatus: "active" | "expired" | "none" | "unknown";
  serviceHistoryAvailable: boolean;
  numberOfKeys?: number;
  vin?: string;
  plateNumber?: string;
}

export interface MotorcycleSpecs {
  make: string;
  model: string;
  mileage?: number;
  motorcycleType: MotorcycleType | "";
  engineCapacityCc?: number;
  transmission: Transmission | "";
}

export interface BoatSpecs {
  make: string;
  model: string;
  boatType: BoatType | "";
  lengthMeters?: number;
  propulsion: PropulsionType | "";
  engineCount?: number;
  engineHours?: number;
  hullMaterial: string;
}

export type CategorySpecs = {
  CAR: CarSpecs;
  MOTORCYCLE: MotorcycleSpecs;
  BOAT: BoatSpecs;
};

export interface MarketplaceListingCommon {
  id: string;
  title: string;
  year: number;
  price: number;
  currency: "EGP" | "USD";
  location: string;
  condition: Condition;
  sellerType: SellerType;
  sellerId: string;
  sellerUserId?: string;
  sellerName: string;
  verified: boolean;
  featured: boolean;
  images: VehicleMedia[];
  createdAt: string;
  updatedAt?: string;
  stockId?: string;
  views?: number;
}

export type MarketplaceListing = {
  [K in ListingCategory]: MarketplaceListingCommon & { category: K; specs: CategorySpecs[K] };
}[ListingCategory];

export const listingCategoryRegistry = {
  CAR: {
    labelKey: "category.CAR",
    capabilities: {
      creation: true,
      offers: true,
      messaging: true,
      compare: true,
      verification: true,
      customImport: true,
    },
    searchFields: ["make", "model", "trim"],
    summaryFields: ["mileage", "transmission", "fuelType"],
    filterFields: ["make", "model", "year", "mileage", "fuelType", "transmission"],
  },
  MOTORCYCLE: {
    labelKey: "category.MOTORCYCLE",
    capabilities: {
      creation: true,
      offers: true,
      messaging: true,
      compare: true,
      verification: true,
      customImport: false,
    },
    searchFields: ["make", "model", "motorcycleType"],
    summaryFields: ["mileage", "engineCapacityCc", "motorcycleType"],
    filterFields: ["make", "model", "year", "mileage", "motorcycleType", "engineCapacityCc"],
  },
  BOAT: {
    labelKey: "category.BOAT",
    capabilities: {
      creation: true,
      offers: true,
      messaging: true,
      compare: true,
      verification: true,
      customImport: false,
    },
    searchFields: ["make", "model", "boatType"],
    summaryFields: ["lengthMeters", "boatType", "propulsion"],
    filterFields: [
      "make",
      "model",
      "year",
      "boatType",
      "lengthMeters",
      "propulsion",
      "engineHours",
    ],
  },
} as const satisfies Record<
  ListingCategory,
  {
    labelKey: string;
    capabilities: Record<
      "creation" | "offers" | "messaging" | "compare" | "verification" | "customImport",
      boolean
    >;
    searchFields: readonly string[];
    summaryFields: readonly string[];
    filterFields: readonly string[];
  }
>;

const object = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === "string";
const optionalNumber = (value: unknown) =>
  value === undefined || (typeof value === "number" && Number.isFinite(value) && value >= 0);
const optionalText = (value: unknown) => value === undefined || text(value);
const oneOf = (value: unknown, values: readonly string[]) => text(value) && values.includes(value);
const hasAny = (value: Record<string, unknown>, keys: readonly string[]) =>
  keys.some((key) => key in value);

/** Runtime boundary for fixtures and browser-persisted public records. */
export function isMarketplaceListing(value: unknown): value is MarketplaceListing {
  if (!object(value) || !object(value.specs)) return false;
  if (!oneOf(value.category, listingCategories)) return false;
  if (
    !text(value.id) ||
    !value.id ||
    !text(value.title) ||
    !text(value.sellerId) ||
    !text(value.sellerName)
  )
    return false;
  if (
    !text(value.location) ||
    !text(value.createdAt) ||
    !Number.isInteger(value.year) ||
    typeof value.price !== "number" ||
    !Number.isFinite(value.price) ||
    value.price < 0
  )
    return false;
  if (
    !oneOf(value.currency, ["EGP", "USD"]) ||
    !oneOf(value.condition, ["new", "used"]) ||
    !oneOf(value.sellerType, ["individual", "agency"])
  )
    return false;
  if (
    typeof value.verified !== "boolean" ||
    typeof value.featured !== "boolean" ||
    !Array.isArray(value.images) ||
    !value.images.every(
      (image) => object(image) && text(image.id) && text(image.url) && text(image.alt),
    )
  )
    return false;
  const specs = value.specs;
  if (!text(specs.make) || !text(specs.model)) return false;
  if (value.category === "CAR")
    return (
      text(specs.trim) &&
      text(specs.bodyType) &&
      text(specs.drivetrain) &&
      text(specs.exteriorColor) &&
      text(specs.interiorColor) &&
      oneOf(specs.transmission, ["", "automatic", "manual"]) &&
      oneOf(specs.fuelType, ["", "gasoline", "diesel", "hybrid", "electric"]) &&
      optionalNumber(specs.mileage) &&
      optionalNumber(specs.engineSize) &&
      optionalText(specs.engineDisplay) &&
      optionalNumber(specs.horsepower) &&
      optionalNumber(specs.doors) &&
      optionalNumber(specs.seats) &&
      optionalNumber(specs.numberOfKeys) &&
      optionalText(specs.vin) &&
      optionalText(specs.plateNumber) &&
      oneOf(specs.accidentHistory, ["none", "declared", "unknown"]) &&
      oneOf(specs.importStatus, ["local", "imported", "unknown"]) &&
      oneOf(specs.warrantyStatus, ["active", "expired", "none", "unknown"]) &&
      typeof specs.serviceHistoryAvailable === "boolean" &&
      !hasAny(specs, [
        "boatType",
        "lengthMeters",
        "propulsion",
        "engineCount",
        "engineHours",
        "hullMaterial",
        "motorcycleType",
        "engineCapacityCc",
      ])
    );
  if (value.category === "MOTORCYCLE")
    return (
      oneOf(specs.motorcycleType, ["", ...motorcycleTypes]) &&
      oneOf(specs.transmission, ["", "automatic", "manual"]) &&
      optionalNumber(specs.mileage) &&
      optionalNumber(specs.engineCapacityCc) &&
      !hasAny(specs, [
        "boatType",
        "lengthMeters",
        "propulsion",
        "engineCount",
        "engineHours",
        "hullMaterial",
        "fuelType",
        "bodyType",
        "drivetrain",
        "trim",
        "vin",
        "plateNumber",
      ])
    );
  return (
    oneOf(specs.boatType, ["", ...boatTypes]) &&
    oneOf(specs.propulsion, ["", ...propulsionTypes]) &&
    text(specs.hullMaterial) &&
    optionalNumber(specs.lengthMeters) &&
    optionalNumber(specs.engineCount) &&
    optionalNumber(specs.engineHours) &&
    !hasAny(specs, [
      "fuelType",
      "bodyType",
      "drivetrain",
      "trim",
      "vin",
      "plateNumber",
      "mileage",
      "transmission",
      "motorcycleType",
      "engineCapacityCc",
    ])
  );
}

export function listingMake(listing: MarketplaceListing) {
  return listing.specs.make;
}
export function listingModel(listing: MarketplaceListing) {
  return listing.specs.model;
}
export function listingMileage(listing: MarketplaceListing) {
  return listing.category === "BOAT" ? undefined : listing.specs.mileage;
}

export function carEngineDisplay(listing: Extract<MarketplaceListing, { category: "CAR" }>) {
  return (
    listing.specs.engineDisplay ||
    (listing.specs.fuelType === "electric"
      ? "Electric motor"
      : listing.specs.engineSize
        ? `${listing.specs.engineSize} L`
        : undefined)
  );
}

export function listingSummary(
  listing: MarketplaceListing,
  t: (key: string) => string,
  locale: "ar" | "en",
): string[] {
  if (listing.category === "CAR") {
    const specs = listing.specs;
    return [
      specs.mileage === undefined ? "" : formatMileage(specs.mileage, locale, t("card.km")),
      specs.transmission ? t(`transmission.${specs.transmission}`) : "",
      specs.fuelType ? t(`fuel.${specs.fuelType}`) : "",
    ].filter(Boolean);
  }
  if (listing.category === "MOTORCYCLE") {
    const specs = listing.specs;
    return [
      specs.mileage === undefined ? "" : formatMileage(specs.mileage, locale, t("card.km")),
      specs.engineCapacityCc
        ? `${formatNumber(specs.engineCapacityCc, locale)} ${t("category.cc")}`
        : "",
      specs.motorcycleType ? t(`motorcycleType.${specs.motorcycleType}`) : "",
    ].filter(Boolean);
  }
  const specs = listing.specs;
  return [
    specs.lengthMeters ? `${formatNumber(specs.lengthMeters, locale)} ${t("category.meters")}` : "",
    specs.boatType ? t(`boatType.${specs.boatType}`) : "",
    specs.propulsion ? t(`propulsion.${specs.propulsion}`) : "",
  ].filter(Boolean);
}
