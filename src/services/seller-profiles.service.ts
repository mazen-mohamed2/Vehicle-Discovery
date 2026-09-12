import { developmentPublicProfile } from "@/services/auth.service";
import { publicCatalogService } from "@/services/public-catalog.service";

export interface PublicIndividualSellerProfile {
  id: string;
  displayName: string;
  role: "user";
  avatarUrl?: string;
  memberSince: string;
}

export const sellerProfilesService = {
  byId(userId: string): PublicIndividualSellerProfile | null {
    const profile = developmentPublicProfile(userId);
    if (!profile || profile.role !== "user") return null;
    return {
      id: profile.id,
      displayName: profile.displayName,
      role: "user",
      avatarUrl: profile.avatarUrl,
      memberSince: profile.createdAt,
    };
  },
  listings(userId: string) {
    return publicCatalogService
      .list()
      .filter((listing) => listing.sellerType === "individual" && listing.sellerUserId === userId);
  },
  reputation(userId: string) {
    if (!this.byId(userId)) return null;
    return { reviews: [] as const, rating: null as number | null };
  },
};
