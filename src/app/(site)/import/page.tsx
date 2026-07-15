import type { Metadata } from "next";
import { ImportClient } from "./import-client";
import { getRequestLocale, pageMetadata } from "@/lib/server-locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const [title, description] = pageMetadata.import[locale];
  return {
    title,
    description,
    alternates: { canonical: "/import" },
    openGraph: { title, description, url: "/import" },
  };
}

export default function ImportPage() {
  return <ImportClient />;
}
