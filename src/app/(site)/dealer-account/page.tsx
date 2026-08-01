import type { Metadata } from "next";
import { AccountPlaceholder } from "@/components/auth/AccountPlaceholder";
import { getRequestLocale } from "@/lib/server-locale";
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return {
    title: locale === "ar" ? "حساب الوكيل — سهلة درج" : "Dealer account — Sahla Daraj",
    robots: { index: false, follow: false },
  };
}
export default function DealerAccountPage() {
  return <AccountPlaceholder role="dealer" />;
}
