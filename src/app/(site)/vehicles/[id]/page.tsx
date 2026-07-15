import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QueryClient, HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { listingsService } from "@/services/listings.service";
import { VehicleDetailClient } from "./vehicle-detail-client";
import { queryKeys } from "@/lib/query-keys";
import { getRequestLocale } from "@/lib/server-locale";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const vehicle = await listingsService.byId(id);
  const locale = await getRequestLocale();
  const brand = locale === "ar" ? "سهلة درج" : "Sahla Daraj";
  return {
    title: vehicle
      ? `${vehicle.title} — ${brand}`
      : `${locale === "ar" ? "سيارة" : "Vehicle"} — ${id} — ${brand}`,
    description:
      locale === "ar" ? "تفاصيل السيارة على سهلة درج." : "Vehicle details on Sahla Daraj.",
    alternates: { canonical: `/vehicles/${id}` },
    openGraph: { url: `/vehicles/${id}`, type: "website" },
  };
}

export default async function VehicleDetailPage({ params }: Props) {
  const { id } = await params;
  const vehicle = await listingsService.byId(id);
  if (!vehicle) notFound();

  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.listings.detail(id),
    queryFn: () => listingsService.byId(id),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <VehicleDetailClient id={id} />
    </HydrationBoundary>
  );
}
