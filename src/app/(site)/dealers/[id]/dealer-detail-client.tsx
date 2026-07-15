"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { ShieldCheck, Star, MapPin } from "lucide-react";
import { VehicleCard } from "@/components/marketplace/VehicleCard";
import { useI18n } from "@/lib/i18n";
import { agenciesService } from "@/services/agencies.service";
import { listingsService } from "@/services/listings.service";
import { queryKeys } from "@/lib/query-keys";
import { EmptyState } from "@/components/marketplace/CollectionStates";
import { formatYear } from "@/lib/locale";

export function DealerDetailClient({ id }: { id: string }) {
  const { t, locale } = useI18n();
  const { data: a } = useSuspenseQuery({
    queryKey: queryKeys.agencies.detail(id),
    queryFn: () => agenciesService.byId(id),
  });
  const { data: listings } = useSuspenseQuery({
    queryKey: queryKeys.listings.byAgency(id),
    queryFn: () => listingsService.byAgency(id),
  });

  if (!a) return null;

  return (
    <>
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 -z-10 gradient-hero opacity-70" />
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="flex items-start gap-5">
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl gradient-primary text-primary-foreground text-3xl font-black shadow-elegant">
              {a.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-black">{a.name}</h1>
                {a.verified && <ShieldCheck className="h-5 w-5 text-primary" />}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Star className="h-4 w-4 fill-warning text-warning" />
                  {a.rating.toFixed(1)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {a.location}
                </span>
                <span>
                  {t("agency.since")} {formatYear(a.since, locale)}
                </span>
              </div>
              <div className="mt-4 flex gap-6 text-sm">
                <div>
                  <span className="text-xl font-black">{a.completedDeals}</span>{" "}
                  <span className="text-muted-foreground">{t("agency.deals")}</span>
                </div>
                <div>
                  <span className="text-xl font-black">{listings.length}</span>{" "}
                  <span className="text-muted-foreground">{t("agency.vehicles")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="mb-6 text-2xl font-black">{t("featured.title")}</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {listings.length > 0 ? (
            listings.map((v) => <VehicleCard key={v.id} v={v} />)
          ) : (
            <EmptyState
              title={t("state.dealer.empty.title")}
              description={t("state.dealer.empty.description")}
            />
          )}
        </div>
      </section>
    </>
  );
}
