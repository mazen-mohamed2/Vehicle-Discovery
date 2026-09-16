import type { Metadata } from "next";
import { QueryClient, HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { listingsService } from "@/services/listings.service";
import { VehiclesClient } from "./vehicles-client";
import { queryKeys } from "@/lib/query-keys";
import { getRequestLocale, pageMetadata } from "@/lib/server-locale";
import { parseDiscoveryParams } from "@/lib/vehicle-discovery";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const locale = await getRequestLocale();
  const raw = await searchParams;
  const category = parseDiscoveryParams(
    new URLSearchParams(typeof raw.category === "string" ? { category: raw.category } : {}),
  ).category;
  const names =
    locale === "ar"
      ? { CAR: "السيارات", MOTORCYCLE: "الدراجات النارية", BOAT: "القوارب" }
      : { CAR: "Cars", MOTORCYCLE: "Motorcycles", BOAT: "Boats" };
  const [defaultTitle, defaultDescription] = pageMetadata.vehicles[locale];
  const title = category
    ? `${names[category]} — ${locale === "ar" ? "سهلة درج" : "Sahla Daraj"}`
    : defaultTitle;
  const description = category
    ? locale === "ar"
      ? `تصفح إعلانات ${names[category]} من الأفراد والوكلاء.`
      : `Browse ${names[category].toLowerCase()} listed by individuals and dealers.`
    : defaultDescription;
  const canonical = category ? `/vehicles?category=${category}` : "/vehicles";
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical },
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
