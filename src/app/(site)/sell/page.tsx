import { redirect } from "next/navigation";
export const metadata = { title: "Sell a vehicle", robots: { index: false, follow: false } };
export default function SellPage() {
  redirect("/account/listings/new");
}
