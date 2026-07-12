"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { PageHeader } from "@/components/site/PageHeader";
import { VehicleCard } from "@/components/marketplace/VehicleCard";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { favoritesService } from "@/services/favorites.service";
import { listingsService } from "@/services/listings.service";

export function FavoritesClient() {
  const { t } = useI18n();
  const { data: favs = [] } = useQuery({
    queryKey: ["favorites"],
    queryFn: () => favoritesService.list(),
  });
  const { data: all = [] } = useQuery({
    queryKey: ["listings", "all"],
    queryFn: () => listingsService.list(),
  });
  const ids = new Set(favs.map((f) => f.listingId));
  const items = all.filter((v) => ids.has(v.id));

  return (
    <>
      <PageHeader eyebrow="Saved" title={t("favorites.title")} />
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {items.length === 0 ? (
          <div className="grid place-items-center rounded-2xl surface-card p-14 text-center shadow-card">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-muted-foreground">
              <Heart className="h-6 w-6" />
            </div>
            <p className="mt-4 text-base font-semibold">{t("favorites.empty")}</p>
            <Link href="/vehicles">
              <Button className="mt-6 gradient-primary text-primary-foreground">
                {t("hero.cta.browse")}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((v) => (
              <VehicleCard key={v.id} v={v} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
