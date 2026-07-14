import type { Metadata } from "next";
import { QueryClient, HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { listingsService } from "@/services/listings.service";
import { C2CClient } from "./c2c-client";
import { queryKeys } from "@/lib/query-keys";

export const metadata: Metadata = {
  title: "سيارات الأفراد — سهلة درج",
  description: "سيارات مستعملة معروضة مباشرة من مالكيها في مصر.",
  alternates: { canonical: "/c2c" },
  openGraph: { url: "/c2c" },
};

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
