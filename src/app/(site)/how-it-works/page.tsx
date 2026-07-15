import type { Metadata } from "next";
import { HowItWorksClient } from "./how-it-works-client";
import { getRequestLocale, pageMetadata } from "@/lib/server-locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const [title, description] = pageMetadata.how[locale];
  return {
    title,
    description,
    alternates: { canonical: "/how-it-works" },
    openGraph: { title, description, url: "/how-it-works" },
  };
}

export default function HowItWorksPage() {
  return <HowItWorksClient />;
}
