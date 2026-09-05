export const queryKeys = {
  listings: {
    all: ["listings", "all"] as const,
    detail: (id: string) => ["listings", "detail", id] as const,
    featured: ["listings", "featured"] as const,
    recent: (limit = 6) => ["listings", "recent", limit] as const,
    c2c: ["listings", "c2c"] as const,
    byAgency: (agencyId: string) => ["listings", "agency", agencyId] as const,
    related: (listingId: string, limit = 4) => ["listings", "related", listingId, limit] as const,
    discovery: (params: import("@/lib/types").VehicleDiscoveryParams) =>
      ["listings", "discovery", params] as const,
  },
  agencies: {
    all: ["agencies", "all"] as const,
    verified: ["agencies", "verified"] as const,
    detail: (id: string) => ["agencies", "detail", id] as const,
    similar: (id: string, limit = 3) => ["agencies", "similar", id, limit] as const,
  },
  favorites: {
    all: ["favorites"] as const,
    byScope: (scope: import("@/lib/storage-scope").StorageScope) => ["favorites", scope] as const,
  },
  compare: {
    all: ["compare"] as const,
    byScope: (scope: import("@/lib/storage-scope").StorageScope) => ["compare", scope] as const,
  },
  auth: {
    session: ["auth", "session"] as const,
  },
  managedListings: {
    owned: (scope: import("@/lib/storage-scope").StorageScope) =>
      ["managed-listings", scope, "owned"] as const,
    detail: (scope: import("@/lib/storage-scope").StorageScope, id: string) =>
      ["managed-listings", scope, "detail", id] as const,
  },
  importWorkflow: {
    all: ["import-workflow"] as const,
    ownedRequests: (scope: import("@/lib/storage-scope").StorageScope) =>
      ["import-workflow", scope, "owned-requests"] as const,
    ownerDetail: (scope: import("@/lib/storage-scope").StorageScope, id: string) =>
      ["import-workflow", scope, "owner-detail", id] as const,
    openRequests: ["import-workflow", "dealer-marketplace", "open"] as const,
    dealerDetail: (id: string) => ["import-workflow", "dealer-marketplace", id] as const,
    offers: (requestId: string) => ["import-workflow", "offers", requestId] as const,
    ownerOffers: (scope: import("@/lib/storage-scope").StorageScope) =>
      ["import-workflow", scope, "owner-offers"] as const,
    dealerOffers: (scope: import("@/lib/storage-scope").StorageScope) =>
      ["import-workflow", scope, "dealer-offers"] as const,
  },
} as const;
