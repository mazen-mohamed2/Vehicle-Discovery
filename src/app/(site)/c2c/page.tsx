import type { Metadata } from "next";
import { QueryClient, HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { listingsService } from "@/services/listings.service";
import { C2CClient } from "./c2c-client";
import { queryKeys } from "@/lib/query-keys";
import { getRequestLocale, pageMetadata } from "@/lib/server-locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const [title, description] = pageMetadata.c2c[locale];
  return {
    title,
    description,
    alternates: { canonical: "/c2c" },
    openGraph: { title, description, url: "/c2c" },
  };
}

export default async function C2CPage() {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.listings.c2c,
    queryFn: () => listingsService.byOwner(),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <C2CClient />
    </HydrationBoundary>
  );
}
