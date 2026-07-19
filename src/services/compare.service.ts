export const MAX_COMPARE_VEHICLES = 4;

const storageKey = "sd-compare";
let store: string[] = [];
let hydrated = false;

export function normalizeCompareIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(value.filter((id): id is string => typeof id === "string" && id.trim() !== "")),
  ].slice(0, MAX_COMPARE_VEHICLES);
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    store = normalizeCompareIds(JSON.parse(window.localStorage.getItem(storageKey) ?? "[]"));
  } catch {
    store = [];
    window.localStorage.removeItem(storageKey);
  }
}

function persist(next: string[]) {
  if (typeof window !== "undefined") {
    if (next.length > 0) window.localStorage.setItem(storageKey, JSON.stringify(next));
    else window.localStorage.removeItem(storageKey);
  }
  store = next;
}

const delay = <T>(value: T, ms = 80) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

export const compareService = {
  list: (): Promise<string[]> => {
    hydrate();
    return delay([...store]);
  },
  replace: (ids: string[]): Promise<string[]> => {
    hydrate();
    const next = normalizeCompareIds(ids);
    persist(next);
    return delay([...next]);
  },
};
