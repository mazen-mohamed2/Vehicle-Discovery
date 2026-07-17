export const queryKeys = {
  listings: {
    all: ["listings", "all"] as const,
    detail: (id: string) => ["listings", "detail", id] as const,
    featured: ["listings", "featured"] as const,
    recent: (limit = 6) => ["listings", "recent", limit] as const,
    c2c: ["listings", "c2c"] as const,
    byAgency: (agencyId: string) => ["listings", "agency", agencyId] as const,
    discovery: (params: import("@/lib/types").VehicleDiscoveryParams) =>
      ["listings", "discovery", params] as const,
  },
  agencies: {
    all: ["agencies", "all"] as const,
    verified: ["agencies", "verified"] as const,
    detail: (id: string) => ["agencies", "detail", id] as const,
  },
  favorites: {
    all: ["favorites"] as const,
  },
} as const;
