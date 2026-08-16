import type { Metadata } from "next";
import { ListingPreview } from "@/components/listings/ListingPreview";
export const metadata: Metadata = {
  title: "Listing preview",
  robots: { index: false, follow: false },
};
export default async function PreviewListingPage({
  params,
}: {
  params: Promise<{ listingId: string }>;
}) {
  const { listingId } = await params;
  return <ListingPreview listingId={listingId} />;
}
