import type { Metadata } from "next";
import { Transactions } from "@/components/transactions/Transactions";
export const metadata: Metadata = {
  title: "Transaction details",
  robots: { index: false, follow: false },
};
export default async function Page({ params }: { params: Promise<{ transactionId: string }> }) {
  const { transactionId } = await params;
  return <Transactions role="user" id={transactionId} />;
}
