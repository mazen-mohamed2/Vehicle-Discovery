"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/site/PageHeader";
import { VehicleCard } from "@/components/marketplace/VehicleCard";
import { useI18n } from "@/lib/i18n";
import { listingsService } from "@/services/listings.service";

export function VehiclesClient() {
  const { t } = useI18n();
  const { data } = useSuspenseQuery({
    queryKey: ["listings", "all"],
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
          {data.map((v) => (
            <VehicleCard key={v.id} v={v} />
          ))}
        </div>
      </section>
    </>
  );
}
