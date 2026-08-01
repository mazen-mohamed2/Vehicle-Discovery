import type { Metadata } from "next";
import { ForgotPasswordClient } from "./forgot-password-client";
import { getRequestLocale } from "@/lib/server-locale";
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return {
    title: locale === "ar" ? "استعادة كلمة المرور — سهلة درج" : "Forgot password — Sahla Daraj",
    robots: { index: false, follow: false },
  };
}
export default function ForgotPasswordPage() {
  return <ForgotPasswordClient />;
}
