import { MAX_COMPARE_VEHICLES } from "@/services/compare.service";

export function parseCompareUrlIds(value: string | null, validIds: ReadonlySet<string>): string[] {
  if (!value) return [];
  return [
    ...new Set(
      value
        .split(",")
        .map((id) => id.trim())
        .filter((id) => validIds.has(id)),
    ),
  ].slice(0, MAX_COMPARE_VEHICLES);
}

export function createCompareQuery(ids: string[]): string {
  const normalized = [...new Set(ids)].slice(0, MAX_COMPARE_VEHICLES);
  return normalized.length ? `?vehicles=${encodeURIComponent(normalized.join(","))}` : "";
}
