"use client";

import { DealerGridSkeleton, VehicleGridSkeleton } from "@/components/marketplace/CollectionStates";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";

export default function SiteLoading() {
  const { t } = useI18n();
  return (
    <div
      className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"
      aria-label={t("a11y.loading")}
      aria-busy="true"
    >
      <Skeleton className="mb-8 h-10 w-64" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <VehicleGridSkeleton />
      </div>
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <DealerGridSkeleton />
      </div>
    </div>
  );
}
