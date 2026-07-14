import type { Metadata } from "next";
import { QueryClient, HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { listingsService } from "@/services/listings.service";
import { VehiclesClient } from "./vehicles-client";
import { queryKeys } from "@/lib/query-keys";

export const metadata: Metadata = {
  title: "جميع السيارات — سهلة درج",
  description: "تصفح جميع السيارات المعروضة على سهلة درج: جديدة، مستعملة، من أفراد ووكلاء موثقين.",
  alternates: { canonical: "/vehicles" },
  openGraph: { title: "All vehicles — Sahla Daraj", url: "/vehicles" },
};

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
