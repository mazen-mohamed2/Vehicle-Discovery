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
} as const;
