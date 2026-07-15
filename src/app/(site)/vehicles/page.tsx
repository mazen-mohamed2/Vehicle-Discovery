import type { Metadata } from "next";
import { QueryClient, HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { listingsService } from "@/services/listings.service";
import { VehiclesClient } from "./vehicles-client";
import { queryKeys } from "@/lib/query-keys";
import { getRequestLocale, pageMetadata } from "@/lib/server-locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const [title, description] = pageMetadata.vehicles[locale];
  return {
    title,
    description,
    alternates: { canonical: "/vehicles" },
    openGraph: { title, description, url: "/vehicles" },
  };
}

export default async function VehiclesPage() {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.listings.all,
    queryFn: () => listingsService.list(),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <VehiclesClient />
    </HydrationBoundary>
  );
}
