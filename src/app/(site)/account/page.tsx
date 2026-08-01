import type { Metadata } from "next";
import { AccountPlaceholder } from "@/components/auth/AccountPlaceholder";
import { getRequestLocale } from "@/lib/server-locale";
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return {
    title: locale === "ar" ? "الحساب — سهلة درج" : "Account — Sahla Daraj",
    robots: { index: false, follow: false },
  };
}
export default function AccountPage() {
  return <AccountPlaceholder />;
}
