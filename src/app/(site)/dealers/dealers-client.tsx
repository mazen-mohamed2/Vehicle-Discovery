"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/site/PageHeader";
import { AgencyCard } from "@/components/marketplace/AgencyCard";
import { useI18n } from "@/lib/i18n";
import { agenciesService } from "@/services/agencies.service";
import { queryKeys } from "@/lib/query-keys";
import { listingsService } from "@/services/listings.service";
import {
  DealerGridSkeleton,
  EmptyState,
  QueryErrorState,
} from "@/components/marketplace/CollectionStates";

export function DealersClient() {
  const { t } = useI18n();
  const {
    data = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.agencies.all,
    queryFn: () => agenciesService.list(),
  });
  const inventoryQueries = useQueries({
    queries: data.map((agency) => ({
      queryKey: queryKeys.listings.byAgency(agency.id),
      queryFn: () => listingsService.byAgency(agency.id),
    })),
  });
  const inventoryLoading = inventoryQueries.some((query) => query.isLoading);
  const inventoryError = inventoryQueries.some((query) => query.isError);

  const retry = () => {
    void refetch();
    inventoryQueries.forEach((query) => void query.refetch());
  };
  return (
    <>
      <PageHeader
        eyebrow={t("eyebrow.dealers")}
        title={t("dealers.title")}
        subtitle={t("agencies.subtitle")}
      />
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {isLoading || inventoryLoading ? (
            <DealerGridSkeleton />
          ) : isError || inventoryError ? (
            <QueryErrorState retry={retry} />
          ) : data.length > 0 ? (
            data.map((a, index) => (
              <AgencyCard
                key={a.id}
                a={a}
                vehicleCount={inventoryQueries[index].data?.length ?? 0}
              />
            ))
          ) : (
            <EmptyState
              title={t("state.dealers.empty.title")}
              description={t("state.dealers.empty.description")}
            />
          )}
        </div>
      </section>
    </>
  );
}
