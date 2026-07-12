import type { Metadata } from "next";
import { RegisterClient } from "./register-client";

export const metadata: Metadata = {
  title: "إنشاء حساب — سهلة درج",
  description: "إنشاء حساب جديد على سهلة درج.",
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return <RegisterClient />;
}
