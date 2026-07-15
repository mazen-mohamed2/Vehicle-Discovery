import type { Metadata } from "next";
import { ContactClient } from "./contact-client";
import { getRequestLocale, pageMetadata } from "@/lib/server-locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const [title, description] = pageMetadata.contact[locale];
  return {
    title,
    description,
    alternates: { canonical: "/contact" },
    openGraph: { title, description, url: "/contact" },
  };
}

export default function ContactPage() {
  return <ContactClient />;
}
