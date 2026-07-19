import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QueryClient, HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { agenciesService } from "@/services/agencies.service";
import { listingsService } from "@/services/listings.service";
import { DealerDetailClient } from "./dealer-detail-client";
import { queryKeys } from "@/lib/query-keys";
import { getRequestLocale } from "@/lib/server-locale";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const agency = await agenciesService.byId(id);
  const locale = await getRequestLocale();
  const brand = locale === "ar" ? "سهلة درج" : "Sahla Daraj";
  if (!agency) {
    return {
      title: `${locale === "ar" ? "وكيل غير موجود" : "Dealer not found"} — ${brand}`,
      robots: { index: false, follow: false },
    };
  }
  const description =
    locale === "ar"
      ? `تعرف على ${agency.name} في ${agency.location} وتصفح السيارات الجديدة والمستعملة المتاحة.`
      : `View ${agency.name} in ${agency.location} and browse its available new and used vehicles.`;
  return {
    title: `${agency.name} — ${brand}`,
    description,
    alternates: { canonical: `/dealers/${id}` },
    openGraph: {
      title: agency.name,
      description,
      url: `/dealers/${id}`,
      type: "website",
      images: agency.logoUrl ? [{ url: agency.logoUrl, alt: agency.name }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: agency.name,
      description,
      images: agency.logoUrl ? [agency.logoUrl] : undefined,
    },
  };
}

export default async function DealerDetailPage({ params }: Props) {
  const { id } = await params;
  const agency = await agenciesService.byId(id);
  if (!agency) notFound();

  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.agencies.detail(id),
    queryFn: () => agenciesService.byId(id),
  });
  await queryClient.prefetchQuery({
    queryKey: queryKeys.agencies.similar(id, 3),
    queryFn: () => agenciesService.similar(id, 3),
  });
  await queryClient.prefetchQuery({
    queryKey: queryKeys.listings.byAgency(id),
    queryFn: () => listingsService.byAgency(id),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DealerDetailClient id={id} />
    </HydrationBoundary>
  );
}
