// Domain models shared between mock services and future backend APIs.
export type SellerType = "individual" | "agency";
export type Condition = "new" | "used";
export type FuelType = "gasoline" | "diesel" | "hybrid" | "electric";
export type Transmission = "automatic" | "manual";
export type VehicleSort =
  "newest" | "oldest" | "price-asc" | "price-desc" | "mileage-asc" | "mileage-desc";

export interface VehicleDiscoveryParams {
  category?: import("@/lib/marketplace-listing").ListingCategory;
  q?: string;
  make?: string;
  model?: string;
  year?: number;
  priceMin?: number;
  priceMax?: number;
  mileageMin?: number;
  mileageMax?: number;
  fuel?: FuelType;
  transmission?: Transmission;
  motorcycleType?: import("@/lib/marketplace-listing").MotorcycleType;
  boatType?: import("@/lib/marketplace-listing").BoatType;
  propulsion?: import("@/lib/marketplace-listing").PropulsionType;
  lengthMin?: number;
  lengthMax?: number;
  engineHoursMax?: number;
  engineCapacityMin?: number;
  condition?: Condition;
  sellerType?: SellerType;
  location?: string;
  sort: VehicleSort;
  page: number;
  pageSize: number;
}

export interface VehicleDiscoveryResult {
  items: VehicleListing[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  facets: {
    makes: string[];
    models: string[];
    years: number[];
    locations: string[];
    priceRange: [number, number];
    mileageRange: [number, number];
    lengthRange: [number, number];
    engineCapacityRange: [number, number];
    motorcycleTypes: string[];
    boatTypes: string[];
    propulsions: string[];
    engineHoursValues: number[];
  };
}

export interface Agency {
  id: string;
  name: string;
  logoUrl?: string;
  rating: number;
  completedDeals: number;
  vehicleCount: number;
  verified: boolean;
  location: string;
  since: number;
  reviewCount?: number;
  description?: string;
  address?: string;
  workingHours?: string;
  phone?: string;
  email?: string;
  website?: string;
  responseTime?: string;
}

export interface AgencyRecommendation {
  agency: Agency;
  vehicleCount: number;
  sharedBrands: string[];
}

export interface VehicleMedia {
  id: string;
  url: string;
  alt: string;
}

/** Compatibility name retained for existing routes/components. */
export type VehicleListing = import("@/lib/marketplace-listing").MarketplaceListing;
export type { MarketplaceListing, ListingCategory } from "@/lib/marketplace-listing";

export interface Favorite {
  id: string;
  userId: string;
  listingId: string;
  createdAt: string;
}

export type { ReviewRecord as Review } from "@/lib/trust-safety";

export interface ImportRequest {
  id: string;
  userId: string;
  make: string;
  model: string;
  year: number;
  budget: number;
  currency: "EGP" | "USD";
  originCountry: string;
  status: "open" | "in_review" | "accepted" | "closed";
  createdAt: string;
}

export interface AgencyOffer {
  id: string;
  requestId: string;
  agencyId: string;
  agencyName: string;
  price: number;
  currency: "EGP" | "USD";
  etaDays: number;
  notes: string;
  createdAt: string;
}

export interface EscrowSummary {
  id: string;
  status: "pending" | "funded" | "released" | "refunded" | "disputed";
  amount: number;
  currency: "EGP" | "USD";
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}
