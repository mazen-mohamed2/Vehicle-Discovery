import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginClient } from "./login-client";
import { getRequestLocale, pageMetadata } from "@/lib/server-locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const [title, description] = pageMetadata.login[locale];
  return { title, description, robots: { index: false, follow: false } };
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginClient />
    </Suspense>
  );
}
