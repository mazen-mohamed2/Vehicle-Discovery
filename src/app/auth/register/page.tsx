import type { Metadata } from "next";
import { RegisterClient } from "./register-client";
import { getRequestLocale, pageMetadata } from "@/lib/server-locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const [title, description] = pageMetadata.register[locale];
  return { title, description, robots: { index: false, follow: false } };
}

export default function RegisterPage() {
  return <RegisterClient />;
}
