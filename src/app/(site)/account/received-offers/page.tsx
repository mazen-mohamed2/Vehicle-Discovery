import type { Metadata } from "next";
import { VehicleOffers } from "@/components/communication/VehicleOffers";
export const metadata: Metadata = {
  title: "Received offers — Sahla Daraj",
  robots: { index: false, follow: false },
};
export default function ReceivedOffersPage() {
  return <VehicleOffers received />;
}
