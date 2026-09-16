import { scopedStorageKey, type StorageScope } from "@/lib/storage-scope";
import { AuthServiceError } from "@/lib/auth";
import { publicCatalogService } from "@/services/public-catalog.service";

export const MAX_COMPARE_VEHICLES = 4;
const legacyKey = "sd-compare";
const eventName = "sd-compare-change";

export function normalizeCompareIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(value.filter((id): id is string => typeof id === "string" && id.trim() !== "")),
  ].slice(0, MAX_COMPARE_VEHICLES);
}
export function sameCategoryCompareIds(ids: string[]): string[] {
  let category: string | undefined;
  return ids.filter((id) => {
    const listing = publicCatalogService.byId(id);
    if (!listing) return false;
    category ??= listing.category;
    return listing.category === category;
  });
}
export function canCompareListing(ids: string[], listingId: string): boolean {
  const candidate = publicCatalogService.byId(listingId);
  if (!candidate) return false;
  const current = ids.map((id) => publicCatalogService.byId(id)).find(Boolean);
  return !current || current.category === candidate.category;
}
function migrateLegacyGuest() {
  if (typeof window === "undefined") return;
  try {
    const guestKey = scopedStorageKey(legacyKey, "guest");
    const legacy = localStorage.getItem(legacyKey);
    if (legacy === null) return;
    if (localStorage.getItem(guestKey) === null)
      localStorage.setItem(guestKey, JSON.stringify(normalizeCompareIds(JSON.parse(legacy))));
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
      return normalizeCompareIds(JSON.parse(raw));
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
function write(scope: StorageScope, ids: string[]) {
  if (typeof window === "undefined") return;
  const key = scopedStorageKey(legacyKey, scope);
  try {
    if (ids.length) localStorage.setItem(key, JSON.stringify(ids));
    else localStorage.removeItem(key);
  } catch {
    throw new AuthServiceError("STORAGE_ERROR");
  }
  window.dispatchEvent(new CustomEvent(eventName, { detail: scope }));
}
const delay = <T>(value: T, ms = 80) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

export const compareService = {
  list: (scope: StorageScope) => {
    const stored = read(scope);
    const valid = sameCategoryCompareIds(stored);
    if (stored.join(",") !== valid.join(",")) write(scope, valid);
    return delay(valid);
  },
  replace: (scope: StorageScope, ids: string[]) => {
    const next = sameCategoryCompareIds(normalizeCompareIds(ids));
    write(scope, next);
    return delay([...next]);
  },
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
