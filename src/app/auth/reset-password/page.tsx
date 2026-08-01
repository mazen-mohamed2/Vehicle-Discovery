import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordClient } from "./reset-password-client";
import { getRequestLocale } from "@/lib/server-locale";
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return {
    title: locale === "ar" ? "إعادة تعيين كلمة المرور — سهلة درج" : "Reset password — Sahla Daraj",
    robots: { index: false, follow: false },
  };
}
export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordClient />
    </Suspense>
  );
}
