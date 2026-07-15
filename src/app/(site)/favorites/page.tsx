import type { Metadata } from "next";
import { FavoritesClient } from "./favorites-client";
import { getRequestLocale, pageMetadata } from "@/lib/server-locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const [title, description] = pageMetadata.favorites[locale];
  return { title, description, robots: { index: false, follow: false } };
}

export default function FavoritesPage() {
  return <FavoritesClient />;
}
