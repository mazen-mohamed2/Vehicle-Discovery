"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart, MapPin, Gauge, ShieldCheck, Star } from "lucide-react";
import { useState } from "react";
import type { VehicleListing } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import { favoritesService } from "@/services/favorites.service";
import { cn } from "@/lib/utils";

export function VehicleCard({ v }: { v: VehicleListing }) {
  const { t, locale } = useI18n();
  const [fav, setFav] = useState(() => favoritesService.has(v.id));

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    if (fav) {
      favoritesService.remove(v.id);
      setFav(false);
    } else {
      favoritesService.add(v.id);
      setFav(true);
    }
  };

  const priceFmt = new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US").format(v.price);
  const kmFmt = new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US").format(v.mileage);

  return (
    <Link
      href={`/vehicles/${v.id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl surface-card shadow-card transition-all hover:-translate-y-1 hover:shadow-elegant"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <Image
          src={v.images[0].url}
          alt={v.images[0].alt}
          fill
          sizes="(min-width: 1280px) 22vw, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          <div className="flex flex-wrap gap-1.5">
            {v.featured && (
              <span className="rounded-full gradient-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground shadow-elegant">
                <Star className="inline h-3 w-3 me-0.5" />
                {t("card.featured")}
              </span>
            )}
            {v.verified && (
              <span className="rounded-full bg-background/90 backdrop-blur px-2.5 py-0.5 text-[10px] font-bold uppercase text-foreground border border-border">
                <ShieldCheck className="inline h-3 w-3 me-0.5 text-primary" />
                {t("card.verified")}
              </span>
            )}
          </div>
          <button
            onClick={toggle}
            aria-label="favorite"
            className={cn(
              "grid h-8 w-8 place-items-center rounded-full bg-background/90 backdrop-blur border border-border transition-colors",
              fav ? "text-destructive" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Heart className={cn("h-4 w-4", fav && "fill-current")} />
          </button>
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
            <h3 className="truncate text-sm font-bold text-foreground">{v.title}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {v.year} · {v.make}
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Gauge className="h-3.5 w-3.5" />
            {kmFmt} {t("card.km")}
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
            <p className="text-lg font-black text-foreground">
              {priceFmt}{" "}
              <span className="text-xs font-medium text-muted-foreground">{v.currency}</span>
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
