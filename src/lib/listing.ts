import type { Condition, FuelType, Transmission, VehicleListing } from "@/lib/types";
import type { StorageScope } from "@/lib/storage-scope";
import {
  isMarketplaceListing,
  type CategorySpecs,
  type ListingCategory,
} from "@/lib/marketplace-listing";

export type ListingStatus = "draft" | "pending" | "published" | "sold" | "archived";
export function listingVisibilityKey(status: ListingStatus) {
  return status === "published"
    ? "listing.preview.published"
    : status === "draft" || status === "pending"
      ? "listing.preview.private"
      : "listing.preview.nonPublic";
}
export type VerificationStatus =
  "notSubmitted" | "pending" | "verified" | "rejected" | "requiresAction";
export type ListingStep =
  "basics" | "specifications" | "history" | "commercial" | "photos" | "declarations" | "review";

export interface ListingImage {
  id: string;
  url: string;
  previewUrl?: string;
  name: string;
  type: string;
  size: number;
  order: number;
  isCover: boolean;
  createdAt: string;
  temporary?: boolean;
}

export interface SellerDeclarations {
  informationAccuracyAccepted: boolean;
  ownershipOrAuthorizationAccepted: boolean;
  termsAccepted: boolean;
  externalTransactionRiskAcknowledged: boolean;
  acceptedAt?: string;
}

export interface ManagedListing {
  /** Flat CAR fields remain a draft/editor compatibility surface during the migration. */
  category: ListingCategory;
  specs: CategorySpecs[ListingCategory];
  id: string;
  sellerId: string;
  sellerRole: "user" | "dealer";
  sellerName: string;
  dealerId?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  soldAt?: string;
  archivedAt?: string;
  status: ListingStatus;
  currentStep: ListingStep;
  completionPercentage: number;
  version: number;
  make: string;
  model: string;
  year?: number;
  trim: string;
  bodyType: string;
  condition: Condition;
  mileage?: number;
  transmission: Transmission | "";
  fuelType: FuelType | "";
  drivetrain: string;
  exteriorColor: string;
  interiorColor: string;
  engineSize?: number;
  horsepower?: number;
  doors?: number;
  seats?: number;
  price?: number;
  currency: "EGP" | "USD";
  negotiable: boolean;
  financingAvailable: boolean;
  description: string;
  location: string;
  contactPreference: "phone" | "email" | "either";
  accidentHistory: "none" | "declared" | "unknown";
  importStatus: "local" | "imported" | "unknown";
  warrantyStatus: "active" | "expired" | "none" | "unknown";
  serviceHistoryAvailable: boolean;
  numberOfKeys?: number;
  vin?: string;
  plateNumber?: string;
  vehicleVerificationStatus: VerificationStatus;
  ownershipVerificationStatus: VerificationStatus;
  images: ListingImage[];
  declarations: SellerDeclarations;
}

export type ListingErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "LISTING_NOT_FOUND"
  | "INVALID_STATUS_TRANSITION"
  | "VALIDATION_ERROR"
  | "STORAGE_READ_FAILED"
  | "STORAGE_WRITE_FAILED"
  | "IMAGE_TYPE_NOT_SUPPORTED"
  | "IMAGE_TOO_LARGE"
  | "IMAGE_LIMIT_EXCEEDED"
  | "PUBLISH_REQUIREMENTS_NOT_MET";

export class ListingServiceError extends Error {
  constructor(
    public readonly code: ListingErrorCode,
    public readonly fields: Record<string, string> = {},
  ) {
    super(code);
    this.name = "ListingServiceError";
  }
}

export interface ListingOwner {
  scope: StorageScope;
  id: string;
  role: "user" | "dealer";
  displayName: string;
  dealerId?: string;
}

export function toPublicVehicle(listing: ManagedListing): VehicleListing {
  const common = {
    id: listing.id,
    title: [
      listing.specs.make,
      listing.specs.model,
      listing.category === "CAR" && "trim" in listing.specs ? listing.specs.trim : "",
    ]
      .filter(Boolean)
      .join(" "),
    year: listing.year ?? new Date().getFullYear(),
    price: listing.price ?? 0,
    currency: listing.currency,
    location: listing.location,
    condition: listing.condition,
    sellerType: listing.sellerRole === "dealer" ? ("agency" as const) : ("individual" as const),
    sellerId: listing.dealerId ?? listing.sellerId,
    sellerUserId: listing.sellerId,
    sellerName: listing.sellerName,
    verified: false,
    featured: false,
    images: [...listing.images]
      .sort((a, b) => Number(b.isCover) - Number(a.isCover) || a.order - b.order)
      .map((image) => ({ id: image.id, url: image.url, alt: image.name })),
    createdAt: listing.publishedAt ?? listing.createdAt,
    updatedAt: listing.updatedAt,
  };
  const result: VehicleListing =
    listing.category === "CAR"
      ? { ...common, category: "CAR", specs: listing.specs as CategorySpecs["CAR"] }
      : listing.category === "MOTORCYCLE"
        ? { ...common, category: "MOTORCYCLE", specs: listing.specs as CategorySpecs["MOTORCYCLE"] }
        : { ...common, category: "BOAT", specs: listing.specs as CategorySpecs["BOAT"] };
  if (!isMarketplaceListing(result)) throw new ListingServiceError("VALIDATION_ERROR");
  return result;
}

export function listingTitle(listing: ManagedListing) {
  return [
    listing.specs.make,
    listing.specs.model,
    listing.category === "CAR" && "trim" in listing.specs ? listing.specs.trim : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function normalizeListingImages(images: ListingImage[], coverId?: string): ListingImage[] {
  const selectedCoverId =
    (coverId && images.some((image) => image.id === coverId) ? coverId : undefined) ??
    images.find((image) => image.isCover)?.id ??
    images[0]?.id;
  return images.map((image, order) => ({
    ...image,
    order,
    isCover: image.id === selectedCoverId,
  }));
}

/** Keeps ordering and the single-cover invariant consistent across the photo editor. */
export function appendListingImages(
  current: ListingImage[],
  incoming: ListingImage[],
  limit: number,
): ListingImage[] {
  return normalizeListingImages(
    [...current, ...incoming].slice(0, limit),
    current.find((image) => image.isCover)?.id,
  );
}

export function removeListingImage(images: ListingImage[], id: string): ListingImage[] {
  const currentCoverId = images.find((image) => image.isCover)?.id;
  return normalizeListingImages(
    images.filter((image) => image.id !== id),
    currentCoverId === id ? undefined : currentCoverId,
  );
}

export function setListingCover(images: ListingImage[], id: string): ListingImage[] {
  const selected = images.find((image) => image.id === id);
  if (!selected) return normalizeListingImages(images);
  return normalizeListingImages([selected, ...images.filter((image) => image.id !== id)], id);
}

export function listingCoverImage(listing: Pick<ManagedListing, "images">) {
  return listing.images.find((image) => image.isCover) ?? listing.images[0];
}
