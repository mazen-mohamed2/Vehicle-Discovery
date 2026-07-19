import type { Metadata } from "next";
import { Suspense } from "react";
import { getRequestLocale } from "@/lib/server-locale";
import { CompareClient } from "./compare-client";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return {
    title: locale === "ar" ? "مقارنة السيارات — سهلة درج" : "Compare vehicles — Sahla Daraj",
    description:
      locale === "ar"
        ? "قارن مواصفات السيارات المحفوظة جنباً إلى جنب."
        : "Compare saved vehicle specifications side by side.",
    robots: { index: false, follow: false },
  };
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-20" aria-busy="true" />}>
      <CompareClient />
    </Suspense>
  );
}
