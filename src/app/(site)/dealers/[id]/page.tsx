import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QueryClient, HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { agenciesService } from "@/services/agencies.service";
import { listingsService } from "@/services/listings.service";
import { DealerDetailClient } from "./dealer-detail-client";
import { queryKeys } from "@/lib/query-keys";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const agency = await agenciesService.byId(id);
  return {
    title: agency ? `${agency.name} — سهلة درج` : `وكيل ${id} — سهلة درج`,
    alternates: { canonical: `/dealers/${id}` },
    openGraph: { url: `/dealers/${id}` },
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
    queryKey: queryKeys.listings.byAgency(id),
    queryFn: () => listingsService.byAgency(id),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DealerDetailClient id={id} />
    </HydrationBoundary>
  );
}
