import { QueryClient, HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { listingsService } from "@/services/listings.service";
import { agenciesService } from "@/services/agencies.service";
import { HomeClient } from "./home-client";

export default async function HomePage() {
  const queryClient = new QueryClient();
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["listings", "featured"],
      queryFn: () => listingsService.featured(),
    }),
    queryClient.prefetchQuery({
      queryKey: ["listings", "recent"],
      queryFn: () => listingsService.recent(6),
    }),
    queryClient.prefetchQuery({
      queryKey: ["agencies", "verified"],
      queryFn: () => agenciesService.verified(),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <HomeClient />
    </HydrationBoundary>
  );
}
