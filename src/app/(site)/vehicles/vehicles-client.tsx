"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/site/PageHeader";
import { VehicleCard } from "@/components/marketplace/VehicleCard";
import { useI18n } from "@/lib/i18n";
import { listingsService } from "@/services/listings.service";
import { queryKeys } from "@/lib/query-keys";
import {
  EmptyState,
  QueryErrorState,
  VehicleGridSkeleton,
} from "@/components/marketplace/CollectionStates";

export function VehiclesClient() {
  const { t } = useI18n();
  const {
    data = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.listings.all,
    queryFn: () => listingsService.list(),
  });
  return (
    <>
      <PageHeader
        eyebrow="Marketplace"
        title={t("vehicles.title")}
        subtitle={t("featured.subtitle")}
      />
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {isLoading ? (
            <VehicleGridSkeleton />
          ) : isError ? (
            <QueryErrorState retry={() => void refetch()} />
          ) : data.length > 0 ? (
            data.map((v) => <VehicleCard key={v.id} v={v} />)
          ) : (
            <EmptyState
              title={t("state.vehicles.empty.title")}
              description={t("state.vehicles.empty.description")}
            />
          )}
        </div>
      </section>
    </>
  );
}
