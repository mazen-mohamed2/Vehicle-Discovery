import type { Metadata } from "next";
import { CreateListing } from "@/components/listings/CreateListing";
export const metadata: Metadata = {
  title: "Create listing",
  robots: { index: false, follow: false },
};
export default function NewListingPage() {
  return <CreateListing />;
}
