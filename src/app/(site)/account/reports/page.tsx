import type { Metadata } from "next";
import { MyReports } from "@/components/trust-safety/MyReports";
export const metadata: Metadata = { title: "My reports", robots: { index: false, follow: false } };
export default function Page() {
  return <MyReports role="user" />;
}
