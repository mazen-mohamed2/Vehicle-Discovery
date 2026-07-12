import type { Metadata } from "next";
import { FavoritesClient } from "./favorites-client";

export const metadata: Metadata = {
  title: "المفضلة — سهلة درج",
  description: "السيارات التي أضفتها إلى المفضلة على سهلة درج.",
  robots: { index: false, follow: false },
};

export default function FavoritesPage() {
  return <FavoritesClient />;
}
