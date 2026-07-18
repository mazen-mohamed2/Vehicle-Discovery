import type { Favorite } from "@/lib/types";

// Browser-persisted mock store. A future implementation will call the backend API.
const store = new Map<string, Favorite>();
const storageKey = "sd-favorites";
let hydrated = false;

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const saved = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]") as unknown;
    if (!Array.isArray(saved)) return;
    for (const item of saved) {
      if (
        typeof item === "object" &&
        item !== null &&
        "listingId" in item &&
        typeof item.listingId === "string"
      ) {
        store.set(item.listingId, item as Favorite);
      }
    }
  } catch {
    window.localStorage.removeItem(storageKey);
  }
}

function persist() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(Array.from(store.values())));
}

const delay = <T>(v: T, ms = 80) => new Promise<T>((r) => setTimeout(() => r(v), ms));

export const favoritesService = {
  list: (): Promise<Favorite[]> => {
    hydrate();
    return delay(Array.from(store.values()));
  },
  add: (listingId: string): Promise<Favorite> => {
    hydrate();
    const fav: Favorite = {
      id: `f_${listingId}`,
      userId: "me",
      listingId,
      createdAt: new Date().toISOString(),
    };
    store.set(listingId, fav);
    persist();
    return delay(fav);
  },
  remove: (listingId: string): Promise<void> => {
    hydrate();
    store.delete(listingId);
    persist();
    return delay(undefined);
  },
  has: (listingId: string): boolean => {
    hydrate();
    return store.has(listingId);
  },
};
