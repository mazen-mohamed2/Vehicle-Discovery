"use client";

import { Suspense } from "react";
import { PageHeader } from "@/components/site/PageHeader";
import { useI18n } from "@/lib/i18n";
import { VehicleDiscovery } from "@/components/marketplace/VehicleDiscovery";
import { VehicleGridSkeleton } from "@/components/marketplace/CollectionStates";

export function VehiclesClient() {
  const { t } = useI18n();
  return (
    <>
      <PageHeader
        eyebrow={t("eyebrow.marketplace")}
        title={t("vehicles.title")}
        subtitle={t("featured.subtitle")}
      />
      <Suspense
        fallback={
          <div className="mx-auto grid max-w-7xl gap-5 px-4 py-10 sm:grid-cols-2 lg:grid-cols-3">
            <VehicleGridSkeleton />
          </div>
        }
      >
        <VehicleDiscovery
          emptyTitle={t("state.vehicles.empty.title")}
          emptyDescription={t("discovery.noResults")}
        />
      </Suspense>
    </>
  );
}
