"use client";

import { Suspense } from "react";
import { PageHeader } from "@/components/site/PageHeader";
import { useI18n } from "@/lib/i18n";
import { VehicleDiscovery } from "@/components/marketplace/VehicleDiscovery";
import { VehicleGridSkeleton } from "@/components/marketplace/CollectionStates";

export function C2CClient() {
  const { t } = useI18n();
  return (
    <>
      <PageHeader eyebrow={t("eyebrow.c2c")} title={t("c2c.title")} subtitle={t("path.c2c.desc")} />
      <Suspense
        fallback={
          <div className="mx-auto grid max-w-7xl gap-5 px-4 py-10 sm:grid-cols-2 lg:grid-cols-3">
            <VehicleGridSkeleton />
          </div>
        }
      >
        <VehicleDiscovery
          lockedSellerType="individual"
          emptyTitle={t("state.c2c.empty.title")}
          emptyDescription={t("discovery.noResults")}
        />
      </Suspense>
    </>
  );
}
