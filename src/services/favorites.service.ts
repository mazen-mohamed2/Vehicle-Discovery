import type { Favorite } from "@/lib/types";
import { scopedStorageKey, type StorageScope } from "@/lib/storage-scope";
import { AuthServiceError } from "@/lib/auth";

const legacyKey = "sd-favorites";
const eventName = "sd-favorites-change";
const delay = <T>(value: T, ms = 80) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

function normalize(value: unknown, scope: StorageScope): Favorite[] {
  if (!Array.isArray(value)) return [];
  const unique = new Map<string, Favorite>();
  for (const item of value) {
    if (
      !item ||
      typeof item !== "object" ||
      !("listingId" in item) ||
      typeof item.listingId !== "string" ||
      !item.listingId
    )
      continue;
    const candidate = item as Partial<Favorite>;
    unique.set(item.listingId, {
      id: typeof candidate.id === "string" ? candidate.id : `f_${item.listingId}`,
      userId: scope,
      listingId: item.listingId,
      createdAt:
        typeof candidate.createdAt === "string" ? candidate.createdAt : new Date().toISOString(),
    });
  }
  return [...unique.values()];
}

function migrateLegacyGuest() {
  if (typeof window === "undefined") return;
  try {
    const guestKey = scopedStorageKey(legacyKey, "guest");
    const legacy = localStorage.getItem(legacyKey);
    if (legacy === null) return;
    if (localStorage.getItem(guestKey) === null) {
      localStorage.setItem(guestKey, JSON.stringify(normalize(JSON.parse(legacy), "guest")));
    }
    localStorage.removeItem(legacyKey);
  } catch {
    throw new AuthServiceError("STORAGE_ERROR");
  }
}

function read(scope: StorageScope) {
  if (typeof window === "undefined") return [];
  if (scope === "guest") migrateLegacyGuest();
  const key = scopedStorageKey(legacyKey, scope);
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return [];
    try {
      return normalize(JSON.parse(raw), scope);
    } catch {
      try {
        localStorage.removeItem(key);
      } catch {
        throw new AuthServiceError("STORAGE_ERROR");
      }
      return [];
    }
  } catch {
    throw new AuthServiceError("STORAGE_ERROR");
  }
}
function write(scope: StorageScope, values: Favorite[]) {
  if (typeof window === "undefined") return;
  const key = scopedStorageKey(legacyKey, scope);
  try {
    if (values.length) localStorage.setItem(key, JSON.stringify(values));
    else localStorage.removeItem(key);
  } catch {
    throw new AuthServiceError("STORAGE_ERROR");
  }
  window.dispatchEvent(new CustomEvent(eventName, { detail: scope }));
}

export const favoritesService = {
  list: (scope: StorageScope) => delay(read(scope)),
  add: (scope: StorageScope, listingId: string): Promise<Favorite> => {
    const values = read(scope);
    const existing = values.find((favorite) => favorite.listingId === listingId);
    if (existing) return delay(existing);
    const favorite: Favorite = {
      id: `f_${listingId}`,
      userId: scope,
      listingId,
      createdAt: new Date().toISOString(),
    };
    write(scope, [...values, favorite]);
    return delay(favorite);
  },
  remove: (scope: StorageScope, listingId: string) => {
    write(
      scope,
      read(scope).filter((favorite) => favorite.listingId !== listingId),
    );
    return delay(undefined);
  },
  clear: (scope: StorageScope) => {
    write(scope, []);
    return delay(undefined);
  },
  has: (scope: StorageScope, listingId: string) =>
    read(scope).some((favorite) => favorite.listingId === listingId),
  subscribe(scope: StorageScope, callback: () => void) {
    if (typeof window === "undefined") return () => undefined;
    const key = scopedStorageKey(legacyKey, scope);
    const storage = (event: StorageEvent) => {
      if (event.key === key) callback();
    };
    const local = (event: Event) => {
      if ((event as CustomEvent<StorageScope>).detail === scope) callback();
    };
    window.addEventListener("storage", storage);
    window.addEventListener(eventName, local);
    return () => {
      window.removeEventListener("storage", storage);
      window.removeEventListener(eventName, local);
    };
  },
};
