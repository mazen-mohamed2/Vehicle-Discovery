"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart, ImageOff, MapPin, Gauge, Scale, Star } from "lucide-react";
import { toast } from "sonner";
import type { VehicleListing } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { formatCurrency, formatMileage, formatYear } from "@/lib/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { useFavorites } from "@/hooks/use-favorites";
import { useCompare } from "@/hooks/use-compare";
import { TrustBadge } from "@/components/trust-safety/TrustBadge";
import { trustSafetyService } from "@/services/trust-safety.service";

export function VehicleCard({ v }: { v: VehicleListing }) {
  const { t, locale } = useI18n();
  const { isFavorite, toggleFavorite, isHydrating, togglingListingId } = useFavorites();
  const fav = isFavorite(v.id);
  const { isCompared, toggleCompare, isHydrating: compareHydrating } = useCompare();
  const compared = isCompared(v.id);

  const priceFmt = formatCurrency(v.price, v.currency, locale);
  const mileage = formatMileage(v.mileage, locale, t("card.km"));

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl surface-card shadow-card transition-all hover:-translate-y-1 hover:shadow-elegant">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {v.images[0] ? (
          <Image
            src={v.images[0].url}
            alt={v.images[0].alt}
            fill
            sizes="(min-width: 1280px) 22vw, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageOff className="h-9 w-9" aria-hidden="true" />
            <span className="text-xs font-semibold">{t("vehicle.gallery.noImages")}</span>
          </div>
        )}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          <div className="flex flex-wrap gap-1.5">
            {v.featured && (
              <span className="rounded-full gradient-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground shadow-elegant">
                <Star className="inline h-3 w-3 me-0.5" />
                {t("card.featured")}
              </span>
            )}
            <TrustBadge status={trustSafetyService.publicStatus("VEHICLE", v.id)} />
          </div>
          <div className="relative z-10 grid gap-2">
            {isHydrating ? (
              <Skeleton
                role="status"
                aria-label={t("a11y.loading")}
                className="h-8 w-8 rounded-full bg-background/90"
              />
            ) : (
              <button
                type="button"
                onClick={() => toggleFavorite(v.id)}
                disabled={togglingListingId === v.id}
                aria-label={fav ? t("favorites.remove") : t("favorites.add")}
                aria-pressed={fav}
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-full bg-background/90 backdrop-blur border border-border transition-colors disabled:cursor-wait disabled:opacity-60",
                  fav ? "text-destructive" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Heart className={cn("h-4 w-4", fav && "fill-current")} />
              </button>
            )}
            {compareHydrating ? (
              <Skeleton
                role="status"
                aria-label={t("compare.loading")}
                className="h-8 w-8 rounded-full bg-background/90"
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  const changed = toggleCompare(v.id);
                  if (!changed) toast.error(t("compare.limit"));
                  else toast.success(t(compared ? "compare.removed" : "compare.added"));
                }}
                aria-label={t(compared ? "compare.remove" : "compare.add")}
                aria-pressed={compared}
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-full border border-border bg-background/90 backdrop-blur transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  compared
                    ? "text-primary ring-1 ring-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Scale className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <div className="absolute bottom-3 start-3">
          <span
            className={cn(
              "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase",
              v.condition === "new"
                ? "bg-primary text-primary-foreground"
                : "bg-background/90 text-foreground border border-border",
            )}
          >
            {v.condition === "new" ? t("card.new") : t("card.used")}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold text-foreground">
              <Link href={`/vehicles/${v.id}`} className="after:absolute after:inset-0 after:z-0">
                {v.title}
              </Link>
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatYear(v.year, locale)} · {v.make}
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Gauge className="h-3.5 w-3.5" />
            {mileage}
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {v.location}
          </span>
        </div>
        <div className="mt-4 flex items-end justify-between pt-3 border-t border-border/60">
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">
              {v.sellerType === "agency" ? t("card.byAgency") : t("card.byOwner")}
            </p>
            <p className="text-lg font-black text-foreground">{priceFmt}</p>
          </div>
        </div>
      </div>
    </article>
  );
}
