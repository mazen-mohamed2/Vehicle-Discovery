import type { Condition, FuelType, Transmission, VehicleListing } from "@/lib/types";
import type { StorageScope } from "@/lib/storage-scope";

export type ListingStatus = "draft" | "pending" | "published" | "sold" | "archived";
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
  return {
    id: listing.id,
    title: [listing.make, listing.model, listing.trim].filter(Boolean).join(" "),
    make: listing.make,
    model: listing.model,
    year: listing.year ?? new Date().getFullYear(),
    price: listing.price ?? 0,
    currency: listing.currency,
    mileage: listing.mileage ?? 0,
    location: listing.location,
    condition: listing.condition,
    fuel: listing.fuelType || "gasoline",
    transmission: listing.transmission || "automatic",
    sellerType: listing.sellerRole === "dealer" ? "agency" : "individual",
    sellerId: listing.dealerId ?? listing.sellerId,
    sellerUserId: listing.sellerId,
    sellerName: listing.sellerName,
    verified: false,
    featured: false,
    images: listing.images.map((image) => ({ id: image.id, url: image.url, alt: image.name })),
    createdAt: listing.publishedAt ?? listing.createdAt,
    updatedAt: listing.updatedAt,
    engine: listing.engineSize ? `${listing.engineSize} L` : undefined,
    bodyType: listing.bodyType || undefined,
    color: listing.exteriorColor || undefined,
    vin: listing.vin,
  };
}
