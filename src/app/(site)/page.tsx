import { QueryClient, HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { listingsService } from "@/services/listings.service";
import { agenciesService } from "@/services/agencies.service";
import { HomeClient } from "./home-client";
import { queryKeys } from "@/lib/query-keys";

export default async function HomePage() {
  const queryClient = new QueryClient();
  const [, , agencies] = await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.listings.featured,
      queryFn: () => listingsService.featured(),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.listings.recent(6),
      queryFn: () => listingsService.recent(6),
    }),
    queryClient.fetchQuery({
      queryKey: queryKeys.agencies.verified,
      queryFn: () => agenciesService.verified(),
    }),
  ]);
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
      <HomeClient />
    </HydrationBoundary>
  );
}
