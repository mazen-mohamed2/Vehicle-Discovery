import type { Metadata } from "next";
import { LoginClient } from "./login-client";

export const metadata: Metadata = {
  title: "تسجيل الدخول — سهلة درج",
  description: "تسجيل الدخول إلى حسابك على سهلة درج.",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <LoginClient />;
}
