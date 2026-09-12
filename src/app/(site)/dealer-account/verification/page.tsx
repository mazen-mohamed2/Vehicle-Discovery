import type { Metadata } from "next";
import { VerificationCenter } from "@/components/trust-safety/VerificationCenter";
export const metadata: Metadata = {
  title: "Dealer verification",
  robots: { index: false, follow: false },
};
export default function Page() {
  return <VerificationCenter role="dealer" />;
}
