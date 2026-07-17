import type { Metadata } from "next";
import { QueryClient, HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { listingsService } from "@/services/listings.service";
import { VehiclesClient } from "./vehicles-client";
import { queryKeys } from "@/lib/query-keys";
import { getRequestLocale, pageMetadata } from "@/lib/server-locale";
import { parseDiscoveryParams } from "@/lib/vehicle-discovery";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

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

export default async function VehiclesPage({ searchParams }: Props) {
  const raw = await searchParams;
  const urlParams = new URLSearchParams();
  Object.entries(raw).forEach(([key, value]) => {
    if (typeof value === "string") urlParams.set(key, value);
  });
  const params = parseDiscoveryParams(urlParams);
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.listings.discovery(params),
    queryFn: () => listingsService.discover(params),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <VehiclesClient />
    </HydrationBoundary>
  );
}
