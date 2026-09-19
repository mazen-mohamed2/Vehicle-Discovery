import type { AuthUser } from "@/lib/auth";
import type { ListingCategory, CategorySpecs } from "@/lib/marketplace-listing";
import { authStorageScope, type StorageScope } from "@/lib/storage-scope";
import {
  assertPublishable,
  calculateCompletion,
  LISTING_LIMITS,
  validateListing,
} from "@/lib/listing-validators";
import {
  ListingServiceError,
  toPublicVehicle,
  type ListingImage,
  type ListingOwner,
  type ListingStatus,
  type ManagedListing,
} from "@/lib/listing";

const PREFIX = "sd-owned-listings";
const PUBLIC_KEY = "sd-published-listings";
const EVENT = "sd-listings-change";
export const LISTING_STORAGE_SCHEMA_VERSION = 2;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const sessionImages = new Map<string, ListingImage[]>();

export function listingOwner(user: AuthUser | null | undefined): ListingOwner {
  if (!user) throw new ListingServiceError("UNAUTHENTICATED");
  return {
    scope: authStorageScope(user),
    id: user.id,
    role: user.role,
    displayName: user.displayName,
    dealerId: user.dealerId,
  };
}
const key = (scope: StorageScope) => `${PREFIX}:${scope}`;
const storage = () => (typeof window === "undefined" ? null : window.localStorage);
const object = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

function legacyCarSpecs(item: Record<string, unknown>): CategorySpecs["CAR"] {
  if (
    typeof item.make !== "string" ||
    typeof item.model !== "string" ||
    typeof item.trim !== "string" ||
    typeof item.bodyType !== "string" ||
    typeof item.drivetrain !== "string" ||
    typeof item.exteriorColor !== "string" ||
    typeof item.interiorColor !== "string" ||
    !["", "automatic", "manual"].includes(String(item.transmission)) ||
    !["", "gasoline", "diesel", "hybrid", "electric"].includes(String(item.fuelType)) ||
    !["none", "declared", "unknown"].includes(String(item.accidentHistory)) ||
    !["local", "imported", "unknown"].includes(String(item.importStatus)) ||
    !["active", "expired", "none", "unknown"].includes(String(item.warrantyStatus)) ||
    typeof item.serviceHistoryAvailable !== "boolean"
  )
    throw new ListingServiceError("STORAGE_READ_FAILED");
  return {
    make: item.make,
    model: item.model,
    trim: item.trim,
    bodyType: item.bodyType,
    mileage: item.mileage as number | undefined,
    transmission: item.transmission as CategorySpecs["CAR"]["transmission"],
    fuelType: item.fuelType as CategorySpecs["CAR"]["fuelType"],
    drivetrain: item.drivetrain,
    exteriorColor: item.exteriorColor,
    interiorColor: item.interiorColor,
    engineSize: item.engineSize as number | undefined,
    horsepower: item.horsepower as number | undefined,
    doors: item.doors as number | undefined,
    seats: item.seats as number | undefined,
    accidentHistory: item.accidentHistory as CategorySpecs["CAR"]["accidentHistory"],
    importStatus: item.importStatus as CategorySpecs["CAR"]["importStatus"],
    warrantyStatus: item.warrantyStatus as CategorySpecs["CAR"]["warrantyStatus"],
    serviceHistoryAvailable: item.serviceHistoryAvailable,
    numberOfKeys: item.numberOfKeys as number | undefined,
    vin: item.vin as string | undefined,
    plateNumber: item.plateNumber as string | undefined,
  };
}

function parse(raw: string | null, storageKey?: string): ManagedListing[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    const legacy = Array.isArray(value);
    const records = legacy
      ? value
      : object(value) && value.schemaVersion === LISTING_STORAGE_SCHEMA_VERSION
        ? value.records
        : null;
    if (!Array.isArray(records)) throw new ListingServiceError("STORAGE_READ_FAILED");
    const migrated = records.map((item: unknown) => {
      if (
        !object(item) ||
        typeof item.id !== "string" ||
        !item.id ||
        typeof item.sellerId !== "string" ||
        !item.sellerId ||
        !["user", "dealer"].includes(String(item.sellerRole)) ||
        typeof item.sellerName !== "string" ||
        !["draft", "pending", "published", "sold", "archived"].includes(String(item.status)) ||
        typeof item.createdAt !== "string" ||
        typeof item.updatedAt !== "string" ||
        typeof item.currency !== "string" ||
        typeof item.location !== "string" ||
        typeof item.description !== "string" ||
        !Array.isArray(item.images) ||
        !object(item.declarations)
      )
        throw new ListingServiceError("STORAGE_READ_FAILED");
      const result = legacy ? { ...item, category: "CAR", specs: legacyCarSpecs(item) } : item;
      if (!["CAR", "MOTORCYCLE", "BOAT"].includes(String(result.category)) || !object(result.specs))
        throw new ListingServiceError("STORAGE_READ_FAILED");
      try {
        toPublicVehicle(result as unknown as ManagedListing);
      } catch {
        throw new ListingServiceError("STORAGE_READ_FAILED");
      }
      return result as unknown as ManagedListing;
    });
    if (legacy && storageKey && storage())
      storage()!.setItem(
        storageKey,
        JSON.stringify({ schemaVersion: LISTING_STORAGE_SCHEMA_VERSION, records: migrated }),
      );
    return migrated;
  } catch {
    throw new ListingServiceError("STORAGE_READ_FAILED");
  }
}
function read(scope: StorageScope) {
  try {
    return parse(storage()?.getItem(key(scope)) ?? null, key(scope)).map((listing) => ({
      ...listing,
      images: [...listing.images, ...(sessionImages.get(`${scope}:${listing.id}`) ?? [])],
    }));
  } catch (error) {
    if (error instanceof ListingServiceError) throw error;
    throw new ListingServiceError("STORAGE_READ_FAILED");
  }
}
function write(scope: StorageScope, listings: ManagedListing[]) {
  const target = storage();
  if (!target) return;
  try {
    listings.forEach((listing) =>
      sessionImages.set(
        `${scope}:${listing.id}`,
        listing.images.filter((image) => image.temporary),
      ),
    );
    const safe = listings.map((listing) => ({
      ...listing,
      images: listing.images
        .filter((image) => !image.temporary)
        .map(({ previewUrl: _preview, temporary: _temporary, ...image }) => image),
    }));
    target.setItem(
      key(scope),
      JSON.stringify({ schemaVersion: LISTING_STORAGE_SCHEMA_VERSION, records: safe }),
    );
    window.dispatchEvent(new CustomEvent(EVENT, { detail: scope }));
  } catch {
    throw new ListingServiceError("STORAGE_WRITE_FAILED");
  }
}
function writePublic(owner: ListingOwner, listings: ManagedListing[]) {
  const target = storage();
  if (!target) return;
  try {
    const otherAccounts = parse(target.getItem(PUBLIC_KEY), PUBLIC_KEY).filter(
      (item) => item.sellerId !== owner.id,
    );
    const published = listings
      .filter((item) => item.status === "published")
      .map((item) => ({ ...item, images: item.images.filter((image) => !image.temporary) }));
    target.setItem(
      PUBLIC_KEY,
      JSON.stringify({
        schemaVersion: LISTING_STORAGE_SCHEMA_VERSION,
        records: [...otherAccounts, ...published],
      }),
    );
  } catch {
    throw new ListingServiceError("STORAGE_WRITE_FAILED");
  }
}
function owned(owner: ListingOwner, id: string) {
  const listing = read(owner.scope).find((item) => item.id === id);
  if (!listing) throw new ListingServiceError("LISTING_NOT_FOUND");
  if (listing.sellerId !== owner.id) throw new ListingServiceError("FORBIDDEN");
  return listing;
}
function save(owner: ListingOwner, next: ManagedListing) {
  toPublicVehicle(next);
  const values = read(owner.scope);
  const index = values.findIndex((item) => item.id === next.id);
  const result =
    index < 0 ? [...values, next] : values.map((item) => (item.id === next.id ? next : item));
  write(owner.scope, result);
  writePublic(owner, result);
  return next;
}
function base(owner: ListingOwner, category: ListingCategory = "CAR"): ManagedListing {
  const now = new Date().toISOString();
  return {
    id: `listing_${crypto.randomUUID()}`,
    sellerId: owner.id,
    sellerRole: owner.role,
    sellerName: owner.displayName,
    dealerId: owner.role === "dealer" ? owner.dealerId : undefined,
    createdAt: now,
    updatedAt: now,
    status: "draft",
    currentStep: "basics",
    completionPercentage: 0,
    version: 1,
    category,
    specs:
      category === "CAR"
        ? {
            make: "",
            model: "",
            trim: "",
            bodyType: "",
            transmission: "",
            fuelType: "",
            drivetrain: "",
            exteriorColor: "",
            interiorColor: "",
            accidentHistory: "unknown",
            importStatus: "unknown",
            warrantyStatus: "unknown",
            serviceHistoryAvailable: false,
          }
        : category === "MOTORCYCLE"
          ? {
              make: "",
              model: "",
              motorcycleType: "",
              transmission: "",
            }
          : {
              make: "",
              model: "",
              boatType: "",
              lengthMeters: undefined,
              propulsion: "",
              fuelType: "",
              hullMaterial: "",
            },
    make: "",
    model: "",
    trim: "",
    bodyType: "",
    condition: "used",
    transmission: "",
    fuelType: "",
    drivetrain: "",
    exteriorColor: "",
    interiorColor: "",
    currency: "EGP",
    negotiable: false,
    financingAvailable: false,
    description: "",
    location: "",
    contactPreference: "either",
    accidentHistory: "unknown",
    importStatus: "unknown",
    warrantyStatus: "unknown",
    serviceHistoryAvailable: false,
    vehicleVerificationStatus: "notSubmitted",
    ownershipVerificationStatus: "notSubmitted",
    images: [],
    declarations: {
      informationAccuracyAccepted: false,
      ownershipOrAuthorizationAccepted: false,
      termsAccepted: false,
      externalTransactionRiskAcknowledged: false,
    },
  };
}
const transition = (listing: ManagedListing, allowed: ListingStatus[], status: ListingStatus) => {
  if (!allowed.includes(listing.status)) throw new ListingServiceError("INVALID_STATUS_TRANSITION");
  const now = new Date().toISOString();
  return {
    ...listing,
    status,
    updatedAt: now,
    version: listing.version + 1,
    ...(status === "sold" ? { soldAt: now } : {}),
    ...(status === "archived" ? { archivedAt: now } : {}),
  };
};

export const managedListingsService = {
  createDraft(owner: ListingOwner, category: ListingCategory = "CAR") {
    if (!["CAR", "MOTORCYCLE", "BOAT"].includes(category))
      throw new ListingServiceError("VALIDATION_ERROR", { category: "invalid" });
    return save(owner, base(owner, category));
  },
  getOwnedListings(owner: ListingOwner) {
    return read(owner.scope);
  },
  getListingById(owner: ListingOwner, id: string) {
    return owned(owner, id);
  },
  updateDraft(owner: ListingOwner, id: string, patch: Partial<ManagedListing>) {
    const current = owned(owner, id);
    if (patch.category && patch.category !== current.category)
      throw new ListingServiceError("VALIDATION_ERROR", { category: "immutable" });
    const next = {
      ...current,
      ...patch,
      id: current.id,
      category: current.category,
      specs:
        patch.specs ??
        (current.category === "CAR"
          ? {
              ...current.specs,
              ...Object.fromEntries(
                [
                  "make",
                  "model",
                  "trim",
                  "bodyType",
                  "mileage",
                  "transmission",
                  "fuelType",
                  "drivetrain",
                  "exteriorColor",
                  "interiorColor",
                  "engineSize",
                  "horsepower",
                  "doors",
                  "seats",
                  "accidentHistory",
                  "importStatus",
                  "warrantyStatus",
                  "serviceHistoryAvailable",
                  "numberOfKeys",
                  "vin",
                  "plateNumber",
                ]
                  .filter((field) => field in patch)
                  .map((field) => [field, patch[field as keyof ManagedListing]]),
              ),
            }
          : current.specs),
      sellerId: current.sellerId,
      sellerRole: current.sellerRole,
      sellerName: current.sellerName,
      dealerId: current.dealerId,
      createdAt: current.createdAt,
      status: current.status,
      publishedAt: current.publishedAt,
      soldAt: current.soldAt,
      archivedAt: current.archivedAt,
      updatedAt: new Date().toISOString(),
      version: current.version + 1,
    };
    next.completionPercentage = calculateCompletion(next);
    validateListing(next);
    return save(owner, next);
  },
  publishListing(owner: ListingOwner, id: string) {
    const current = owned(owner, id);
    if (current.status !== "draft" && current.status !== "pending")
      throw new ListingServiceError("INVALID_STATUS_TRANSITION");
    assertPublishable(current);
    const now = new Date().toISOString();
    return save(owner, {
      ...current,
      status: "published",
      publishedAt: now,
      updatedAt: now,
      completionPercentage: 100,
      version: current.version + 1,
      declarations: { ...current.declarations, acceptedAt: now },
    });
  },
  duplicateListing(owner: ListingOwner, id: string) {
    const source = owned(owner, id);
    const fresh = base(owner, source.category);
    const duplicate = {
      ...fresh,
      ...source,
      id: fresh.id,
      sellerId: fresh.sellerId,
      sellerRole: fresh.sellerRole,
      sellerName: fresh.sellerName,
      dealerId: fresh.dealerId,
      createdAt: fresh.createdAt,
      updatedAt: fresh.updatedAt,
      status: "draft" as const,
      currentStep: "basics" as const,
      version: 1,
      publishedAt: undefined,
      soldAt: undefined,
      archivedAt: undefined,
      images: source.images
        .filter((image) => !image.temporary)
        .map((image, order) => ({ ...image, id: `image_${crypto.randomUUID()}`, order })),
      vehicleVerificationStatus: "notSubmitted" as const,
      ownershipVerificationStatus: "notSubmitted" as const,
      declarations: fresh.declarations,
    };
    duplicate.completionPercentage = calculateCompletion(duplicate);
    return save(owner, duplicate);
  },
  markAsSold(owner: ListingOwner, id: string) {
    return save(owner, transition(owned(owner, id), ["published"], "sold"));
  },
  archiveListing(owner: ListingOwner, id: string) {
    return save(owner, transition(owned(owner, id), ["published", "sold"], "archived"));
  },
  restoreListing(owner: ListingOwner, id: string) {
    const current = owned(owner, id);
    if (current.status !== "archived") throw new ListingServiceError("INVALID_STATUS_TRANSITION");
    return save(owner, {
      ...current,
      status: current.publishedAt ? "published" : "draft",
      archivedAt: undefined,
      updatedAt: new Date().toISOString(),
      version: current.version + 1,
    });
  },
  deleteListing(owner: ListingOwner, id: string) {
    const current = owned(owner, id);
    if (!(["draft", "archived"] as ListingStatus[]).includes(current.status))
      throw new ListingServiceError("INVALID_STATUS_TRANSITION");
    const next = read(owner.scope).filter((item) => item.id !== id);
    write(owner.scope, next);
    writePublic(owner, next);
  },
  publicListings() {
    try {
      return parse(storage()?.getItem(PUBLIC_KEY) ?? null, PUBLIC_KEY)
        .filter((item) => item.status === "published")
        .map(toPublicVehicle);
    } catch {
      return [];
    }
  },
  validateImages(files: File[]) {
    if (files.length > LISTING_LIMITS.images) throw new ListingServiceError("IMAGE_LIMIT_EXCEEDED");
    files.forEach((file) => {
      if (!allowedTypes.has(file.type)) throw new ListingServiceError("IMAGE_TYPE_NOT_SUPPORTED");
      if (file.size > LISTING_LIMITS.imageBytes) throw new ListingServiceError("IMAGE_TOO_LARGE");
    });
  },
  temporaryImages(files: File[]): ListingImage[] {
    this.validateImages(files);
    return files.map((file, order) => {
      const url = URL.createObjectURL(file);
      return {
        id: `image_${crypto.randomUUID()}`,
        url,
        previewUrl: url,
        name: file.name,
        type: file.type,
        size: file.size,
        order,
        isCover: order === 0,
        createdAt: new Date().toISOString(),
        temporary: true,
      };
    });
  },
  demoImage(): ListingImage {
    return {
      id: `image_${crypto.randomUUID()}`,
      url: "/assets/car-1.jpg",
      name: "Demo vehicle image",
      type: "image/jpeg",
      size: 0,
      order: 0,
      isCover: true,
      createdAt: new Date().toISOString(),
    };
  },
  revokeImage(image: ListingImage) {
    if (image.temporary) {
      URL.revokeObjectURL(image.url);
      if (image.previewUrl && image.previewUrl !== image.url) URL.revokeObjectURL(image.previewUrl);
    }
  },
  subscribe(scope: StorageScope, callback: () => void) {
    if (typeof window === "undefined") return () => undefined;
    const handler = (event: Event) => {
      if ((event as CustomEvent<StorageScope>).detail === scope) callback();
    };
    const storageHandler = (event: StorageEvent) => {
      if (event.key === key(scope)) callback();
    };
    window.addEventListener(EVENT, handler);
    window.addEventListener("storage", storageHandler);
    return () => {
      window.removeEventListener(EVENT, handler);
      window.removeEventListener("storage", storageHandler);
    };
  },
};
