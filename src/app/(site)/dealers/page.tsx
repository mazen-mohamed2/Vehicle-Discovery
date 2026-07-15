import type { Metadata } from "next";
import { QueryClient, HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { agenciesService } from "@/services/agencies.service";
import { DealersClient } from "./dealers-client";
import { queryKeys } from "@/lib/query-keys";
import { listingsService } from "@/services/listings.service";
import { getRequestLocale, pageMetadata } from "@/lib/server-locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const [title, description] = pageMetadata.dealers[locale];
  return {
    title,
    description,
    alternates: { canonical: "/dealers" },
    openGraph: { title, description, url: "/dealers" },
  };
}

export default async function DealersPage() {
  const queryClient = new QueryClient();
  const agencies = await queryClient.fetchQuery({
    queryKey: queryKeys.agencies.all,
    queryFn: () => agenciesService.list(),
  });
  await Promise.all(
    agencies.map((agency) =>
      queryClient.prefetchQuery({
        queryKey: queryKeys.listings.byAgency(agency.id),
        queryFn: () => listingsService.byAgency(agency.id),
      }),
    ),
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DealersClient />
    </HydrationBoundary>
  );
}
