"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { queryKeys } from "@/lib/query-keys";
import { agenciesService } from "@/services/agencies.service";
import { listingsService } from "@/services/listings.service";
import { VehicleDetailClient } from "./vehicle-detail-client";

export function PublicVehicleDetailResolver({ id }: { id: string }) {
  const { t } = useI18n();
  const vehicleQuery = useQuery({
    queryKey: queryKeys.listings.detail(id),
    queryFn: () => listingsService.byId(id),
    refetchOnMount: "always",
  });
  const vehicle = vehicleQuery.data;
  const relatedQuery = useQuery({
    queryKey: queryKeys.listings.related(id, 4),
    queryFn: () => listingsService.related(id, 4),
    enabled: Boolean(vehicle),
    refetchOnMount: "always",
  });
  const sellerQuery = useQuery({
    queryKey: ["public-listing-seller", vehicle?.sellerId],
    queryFn: async () => {
      if (!vehicle || vehicle.sellerType !== "agency") return undefined;
      const [agency, inventory] = await Promise.all([
        agenciesService.byId(vehicle.sellerId),
        listingsService.byAgency(vehicle.sellerId),
      ]);
      return agency ? { ...agency, vehicleCount: inventory.length } : undefined;
    },
    enabled: vehicle?.sellerType === "agency",
  });

  if (vehicleQuery.isPending)
    return (
      <main className="mx-auto grid min-h-[60vh] place-items-center px-4" role="status">
        {t("a11y.loading")}
      </main>
    );
  if (!vehicle)
    return (
      <main className="mx-auto grid min-h-[60vh] place-items-center px-4 text-center">
        <div>
          <h1 className="text-2xl font-black">{t("notFound.vehicle")}</h1>
          <Button asChild className="mt-5">
            <Link href="/vehicles">{t("notFound.backVehicles")}</Link>
          </Button>
        </div>
      </main>
    );

  return (
    <VehicleDetailClient
      vehicle={vehicle}
      seller={sellerQuery.data}
      related={relatedQuery.data ?? []}
    />
  );
}
