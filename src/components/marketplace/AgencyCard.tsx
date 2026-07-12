"use client";

import Link from "next/link";
import { ShieldCheck, Star, MapPin, ArrowRight } from "lucide-react";
import type { Agency } from "@/lib/types";
import { useI18n } from "@/lib/i18n";

export function AgencyCard({ a }: { a: Agency }) {
  const { t } = useI18n();
  return (
    <Link
      href={`/dealers/${a.id}`}
      className="group flex flex-col gap-4 rounded-2xl surface-card p-5 shadow-card transition-all hover:-translate-y-1 hover:shadow-elegant"
    >
      <div className="flex items-start gap-3">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl gradient-primary text-primary-foreground text-xl font-black shadow-elegant">
          {a.name.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-base font-bold">{a.name}</h3>
            {a.verified && <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />}
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-warning text-warning" />
              {a.rating.toFixed(1)}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {a.location}
            </span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-secondary/60 p-3">
        <div>
          <p className="text-lg font-black">{a.completedDeals}</p>
          <p className="text-[10px] uppercase text-muted-foreground">{t("agency.deals")}</p>
        </div>
        <div>
          <p className="text-lg font-black">{a.vehicleCount}</p>
          <p className="text-[10px] uppercase text-muted-foreground">{t("agency.vehicles")}</p>
        </div>
      </div>
      <div className="flex items-center justify-between text-sm font-semibold text-primary">
        {t("agency.view")}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
      </div>
    </Link>
  );
}
