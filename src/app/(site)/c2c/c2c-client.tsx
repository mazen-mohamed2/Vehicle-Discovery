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

export function C2CClient() {
  const { t } = useI18n();
  const {
    data = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.listings.c2c,
    queryFn: () => listingsService.byOwner(),
  });
  return (
    <>
      <PageHeader eyebrow={t("eyebrow.c2c")} title={t("c2c.title")} subtitle={t("path.c2c.desc")} />
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
              title={t("state.c2c.empty.title")}
              description={t("state.c2c.empty.description")}
            />
          )}
        </div>
      </section>
    </>
  );
}
