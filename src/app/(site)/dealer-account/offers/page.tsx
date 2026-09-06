import type { Metadata } from "next";
import { VehicleOffers } from "@/components/communication/VehicleOffers";
export const metadata: Metadata = {
  title: "My offers — Sahla Daraj",
  robots: { index: false, follow: false },
};
export default function DealerOffersPage() {
  return <VehicleOffers role="dealer" />;
}
