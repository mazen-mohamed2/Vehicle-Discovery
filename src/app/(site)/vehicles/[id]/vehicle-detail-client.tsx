"use client";

import Link from "next/link";
import Image from "next/image";
import { useSuspenseQuery } from "@tanstack/react-query";
import { MapPin, Gauge, Fuel, Cog, ShieldCheck, ArrowLeft, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { listingsService } from "@/services/listings.service";
import { queryKeys } from "@/lib/query-keys";

export function VehicleDetailClient({ id }: { id: string }) {
  const { data: v } = useSuspenseQuery({
    queryKey: queryKeys.listings.detail(id),
    queryFn: () => listingsService.byId(id),
  });
  const { t, locale } = useI18n();
  if (!v) return null;
  const price = new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US").format(v.price);
  const km = new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US").format(v.mileage);
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/vehicles"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {t("vehicles.title")}
      </Link>
      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl surface-card shadow-card">
            <Image
              src={v.images[0].url}
              alt={v.images[0].alt}
              fill
              sizes="(min-width: 1024px) 60vw, 100vw"
              className="object-cover"
            />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: Gauge, l: t("card.km"), v: km },
              { icon: Fuel, l: "Fuel", v: v.fuel },
              { icon: Cog, l: "Trans.", v: v.transmission },
              { icon: MapPin, l: "Location", v: v.location },
            ].map((s, i) => (
              <div key={i} className="rounded-xl surface-card p-4">
                <s.icon className="h-4 w-4 text-primary" />
                <p className="mt-2 text-xs uppercase text-muted-foreground">{s.l}</p>
                <p className="text-sm font-bold capitalize">{s.v}</p>
              </div>
            ))}
          </div>
        </div>
        <aside className="lg:col-span-1">
          <div className="sticky top-24 rounded-2xl surface-card p-6 shadow-elegant">
            <h1 className="text-2xl font-black">{v.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {v.year} · {v.make} {v.model}
            </p>
            <p className="mt-4 text-3xl font-black bg-gradient-to-br from-primary to-primary-glow bg-clip-text text-transparent">
              {price}{" "}
              <span className="text-sm font-medium text-muted-foreground">{v.currency}</span>
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs">
              {v.verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-primary">
                  <ShieldCheck className="h-3 w-3" />
                  {t("card.verified")}
                </span>
              )}
              <span className="rounded-full bg-secondary px-2 py-1 font-semibold">
                {v.sellerType === "agency" ? t("card.byAgency") : t("card.byOwner")}
              </span>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{v.sellerName}</p>
            <Button
              size="lg"
              className="mt-6 w-full gradient-primary text-primary-foreground shadow-elegant"
            >
              <Phone className="h-4 w-4 me-2" />
              {t("card.contact")}
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
