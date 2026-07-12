import type { Metadata } from "next";
import { QueryClient, HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { agenciesService } from "@/services/agencies.service";
import { DealersClient } from "./dealers-client";

export const metadata: Metadata = {
  title: "المعارض والوكلاء — سهلة درج",
  description: "وكلاء ومعارض معتمدون بسمعة موثقة على سهلة درج.",
  alternates: { canonical: "/dealers" },
  openGraph: { url: "/dealers" },
};

export default async function DealersPage() {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: ["agencies"],
    queryFn: () => agenciesService.list(),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DealersClient />
    </HydrationBoundary>
  );
}
