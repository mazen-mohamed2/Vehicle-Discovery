import type { ListingCategory } from "@/lib/marketplace-listing";
import { publicCatalogService } from "@/services/public-catalog.service";

export interface ListingContextPresentation {
  listingId: string;
  available: boolean;
  title?: string;
  category?: ListingCategory;
  thumbnail?: string;
  thumbnailAlt?: string;
  price?: number;
  currency?: "EGP" | "USD";
  href?: string;
}

/** Resolves current UI context without duplicating listing snapshots into related records. */
export const listingContextService = {
  resolve(listingId: string): ListingContextPresentation {
    const listing = publicCatalogService.byId(listingId);
    if (!listing) return { listingId, available: false };
    return {
      listingId,
      available: true,
      title: listing.title,
      category: listing.category,
      thumbnail: listing.images[0]?.url,
      thumbnailAlt: listing.images[0]?.alt,
      price: listing.price,
      currency: listing.currency,
      href: `/vehicles/${listing.id}`,
    };
  },
};
