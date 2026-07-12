import type { Favorite } from "@/lib/types";

// In-memory mock store. Real impl will call backend API.
const store = new Map<string, Favorite>();

const delay = <T>(v: T, ms = 80) => new Promise<T>((r) => setTimeout(() => r(v), ms));

export const favoritesService = {
  list: (): Promise<Favorite[]> => delay(Array.from(store.values())),
  add: (listingId: string): Promise<Favorite> => {
    const fav: Favorite = {
      id: `f_${listingId}`,
      userId: "me",
      listingId,
      createdAt: new Date().toISOString(),
    };
    store.set(listingId, fav);
    return delay(fav);
  },
  remove: (listingId: string): Promise<void> => {
    store.delete(listingId);
    return delay(undefined);
  },
  has: (listingId: string): boolean => store.has(listingId),
};
