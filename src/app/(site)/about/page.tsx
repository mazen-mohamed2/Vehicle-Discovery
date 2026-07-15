import type { Metadata } from "next";
import { AboutClient } from "./about-client";
import { getRequestLocale, pageMetadata } from "@/lib/server-locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const [title, description] = pageMetadata.about[locale];
  return {
    title,
    description,
    alternates: { canonical: "/about" },
    openGraph: { title, description, url: "/about" },
  };
}

export default function AboutPage() {
  return <AboutClient />;
}
