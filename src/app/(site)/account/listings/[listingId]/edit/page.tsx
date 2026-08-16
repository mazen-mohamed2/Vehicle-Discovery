import type { Metadata } from "next";
import { ListingWizard } from "@/components/listings/ListingWizard";
export const metadata: Metadata = {
  title: "Edit listing",
  robots: { index: false, follow: false },
};
export default async function EditListingPage({
  params,
}: {
  params: Promise<{ listingId: string }>;
}) {
  const { listingId } = await params;
  return <ListingWizard listingId={listingId} />;
}
