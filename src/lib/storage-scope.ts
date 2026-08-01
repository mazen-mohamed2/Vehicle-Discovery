import type { AuthUser } from "@/lib/auth";

export type StorageScope = "guest" | `user:${string}` | `dealer:${string}`;

export function authStorageScope(user: AuthUser | null | undefined): StorageScope {
  if (!user) return "guest";
  return `${user.role}:${user.id}`;
}

export function scopedStorageKey(base: "sd-favorites" | "sd-compare", scope: StorageScope) {
  return `${base}:${scope}` as const;
}
