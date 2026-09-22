import type { Metadata } from "next";
import { Transactions } from "@/components/transactions/Transactions";
export const metadata: Metadata = {
  title: "Transactions",
  robots: { index: false, follow: false },
};
export default function Page() {
  return <Transactions role="user" />;
}
