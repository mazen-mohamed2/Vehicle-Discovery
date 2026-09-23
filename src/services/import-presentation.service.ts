import { developmentPublicProfile } from "@/services/auth.service";
/** Canonical user identity, never a differently named agency fixture or stale offer snapshot. */
export function importDealerIdentity(dealerUserId: string) {
  const profile = developmentPublicProfile(dealerUserId);
  return {
    id: dealerUserId,
    displayName: profile?.role === "dealer" ? profile.displayName : dealerUserId,
    dealerId: profile?.role === "dealer" ? profile.dealerId : undefined,
  };
}
