// Domain models shared between mock services and future backend APIs.
export type SellerType = "individual" | "agency";
export type Condition = "new" | "used";
export type FuelType = "gasoline" | "diesel" | "hybrid" | "electric";
export type Transmission = "automatic" | "manual";
export type VehicleSort =
  "newest" | "oldest" | "price-asc" | "price-desc" | "mileage-asc" | "mileage-desc";

export interface VehicleDiscoveryParams {
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

export interface VehicleListing {
  id: string;
  title: string;
  make: string;
  model: string;
  year: number;
  price: number;
  currency: "EGP" | "USD";
  mileage: number;
  location: string;
  condition: Condition;
  fuel: FuelType;
  transmission: Transmission;
  sellerType: SellerType;
  sellerId: string;
  /** Canonical account identity used for participant authorization. */
  sellerUserId?: string;
  sellerName: string;
  verified: boolean;
  featured: boolean;
  images: VehicleMedia[];
  createdAt: string;
  updatedAt?: string;
  engine?: string;
  bodyType?: string;
  color?: string;
  vin?: string;
  stockId?: string;
  views?: number;
}

export interface Favorite {
  id: string;
  userId: string;
  listingId: string;
  createdAt: string;
}

export interface Review {
  id: string;
  authorName: string;
  rating: number;
  content: string;
  createdAt: string;
}

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
