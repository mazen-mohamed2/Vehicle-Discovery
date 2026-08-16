import type { Metadata } from "next";
import { MyListings } from "@/components/listings/MyListings";
export const metadata: Metadata = { title: "My listings", robots: { index: false, follow: false } };
export default function MyListingsPage() {
  return <MyListings />;
}
