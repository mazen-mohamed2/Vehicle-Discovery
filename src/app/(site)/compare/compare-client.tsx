"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ImageOff, Scale, Share2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useCompare } from "@/hooks/use-compare";
import { useI18n } from "@/lib/i18n";
import { listingsService } from "@/services/listings.service";
import { queryKeys } from "@/lib/query-keys";
import { createCompareQuery, parseCompareUrlIds } from "@/lib/compare-url";
import { reconcileCompareIds } from "@/services/compare.service";
import { formatCurrency, formatMileage, formatYear } from "@/lib/locale";
import type { VehicleListing } from "@/lib/types";
import { carEngineDisplay, listingCategoryRegistry } from "@/lib/marketplace-listing";
import { Button } from "@/components/ui/button";
import { VehicleGridSkeleton } from "@/components/marketplace/CollectionStates";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function CompareClient() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastUrlValue = useRef<string | null>(null);
  const pendingUrlValue = useRef<string | null | undefined>(undefined);
  const { comparedIds, isHydrating, replaceCompare } = useCompare();
  const listingsQuery = useQuery({
    queryKey: queryKeys.listings.all,
    queryFn: listingsService.list,
    refetchOnMount: "always",
  });
  const all = useMemo(() => listingsQuery.data ?? [], [listingsQuery.data]);
  const validIds = useMemo(() => new Set(all.map((vehicle) => vehicle.id)), [all]);
  const vehicles = useMemo(() => {
    const byId = new Map(all.map((vehicle) => [vehicle.id, vehicle]));
    return comparedIds.flatMap((id) => {
      const vehicle = byId.get(id);
      return vehicle ? [vehicle] : [];
    });
  }, [all, comparedIds]);
  const updateUrl = useCallback(
    (ids: string[]) => {
      const query = createCompareQuery(ids);
      const next = `${pathname}${query}`;
      const current = `${pathname}${searchParams.toString() ? `?${searchParams}` : ""}`;
      const expectedValue = ids.length > 0 ? ids.join(",") : null;
      pendingUrlValue.current = expectedValue;
      lastUrlValue.current = expectedValue;
      if (next !== current) router.replace(next, { scroll: false });
      else pendingUrlValue.current = undefined;
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    if (isHydrating || listingsQuery.isLoading || listingsQuery.isFetching || !listingsQuery.data)
      return;
    const raw = searchParams.get("vehicles");
    if (pendingUrlValue.current !== undefined) {
      if (raw === pendingUrlValue.current) pendingUrlValue.current = undefined;
      else return;
    }
    if (raw !== null && raw !== lastUrlValue.current) {
      const valid = reconcileCompareIds(parseCompareUrlIds(raw, validIds), all);
      lastUrlValue.current = valid.join(",");
      if (valid.join(",") !== comparedIds.join(",")) replaceCompare(valid);
      if (raw !== valid.join(",")) updateUrl(valid);
    } else if (raw === null && comparedIds.length > 0) {
      const validPersisted = reconcileCompareIds(comparedIds, all);
      if (validPersisted.join(",") !== comparedIds.join(",")) replaceCompare(validPersisted);
      updateUrl(validPersisted);
    }
  }, [
    comparedIds,
    isHydrating,
    listingsQuery.data,
    listingsQuery.isFetching,
    listingsQuery.isLoading,
    all,
    replaceCompare,
    searchParams,
    updateUrl,
    validIds,
  ]);

  const setComparison = (ids: string[]) => {
    const valid = reconcileCompareIds(ids, all);
    replaceCompare(valid);
    updateUrl(valid);
  };
  const remove = (id: string) => {
    const next = comparedIds.filter((item) => item !== id);
    setComparison(next);
  };
  const share = async () => {
    const url = `${window.location.origin}${pathname}${createCompareQuery(comparedIds)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("compare.copied"));
    } catch {
      if (navigator.share) void navigator.share({ title: t("compare.title"), url });
      else toast.error(t("compare.clipboardFailure"));
    }
  };

  if (isHydrating || listingsQuery.isLoading)
    return (
      <main className="mx-auto max-w-7xl px-4 py-10">
        <VehicleGridSkeleton count={4} />
      </main>
    );
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">{t("compare.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("compare.description")}</p>
        </div>
        {vehicles.length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void share()}>
              <Share2 className="me-2 h-4 w-4" />
              {t("compare.share")}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-destructive">
                  <Trash2 className="me-2 h-4 w-4" />
                  {t("compare.clear")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("compare.clear.title")}</AlertDialogTitle>
                  <AlertDialogDescription>{t("compare.clear.description")}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("common.close")}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      setComparison([]);
                    }}
                  >
                    {t("compare.clear.confirm")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>
      {vehicles.length === 0 ? (
        <EmptyCompare />
      ) : vehicles.length === 1 ? (
        <OneVehicleState vehicle={vehicles[0]} onRemove={() => remove(vehicles[0].id)} />
      ) : (
        <>
          <div
            className="mt-8 overflow-x-auto rounded-2xl border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            tabIndex={0}
            aria-label={t("compare.tableLabel")}
          >
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr>
                  <th scope="col" className="sticky start-0 z-10 w-44 bg-background p-4 text-start">
                    {t("compare.attribute")}
                  </th>
                  {vehicles.map((vehicle) => (
                    <th
                      scope="col"
                      key={vehicle.id}
                      className="w-56 min-w-56 border-s p-4 align-top"
                    >
                      <CompareMedia vehicle={vehicle} />
                      <Link
                        href={`/vehicles/${vehicle.id}`}
                        className="mt-3 line-clamp-2 min-h-10 break-words font-bold hover:text-primary"
                      >
                        {vehicle.title}
                      </Link>
                      <button
                        type="button"
                        onClick={() => remove(vehicle.id)}
                        aria-label={t("compare.remove")}
                        className="mt-2 inline-flex items-center gap-1 rounded-sm text-xs text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <X className="h-3 w-3" />
                        {t("compare.removeShort")}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonRows(t, locale, vehicles[0].category).map((row) => (
                  <ComparisonRow
                    key={row.label}
                    label={row.label}
                    values={vehicles.map(row.value)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );

  function EmptyCompare() {
    return (
      <div className="mt-8 grid place-items-center rounded-2xl surface-card p-14 text-center">
        <ScaleIcon />
        <h2 className="mt-4 text-xl font-bold">{t("compare.empty")}</h2>
        <Button asChild className="mt-5">
          <Link href="/vehicles">{t("hero.cta.browse")}</Link>
        </Button>
      </div>
    );
  }
  function ScaleIcon() {
    return <Scale className="h-10 w-10 text-primary" />;
  }

  function OneVehicleState({
    vehicle,
    onRemove,
  }: {
    vehicle: VehicleListing;
    onRemove: () => void;
  }) {
    return (
      <section
        className="mt-8 mx-auto max-w-md rounded-2xl surface-card p-5 shadow-card"
        aria-labelledby="one-vehicle-title"
      >
        <CompareMedia vehicle={vehicle} />
        <h2 id="one-vehicle-title" className="mt-4 text-lg font-bold">
          <Link href={`/vehicles/${vehicle.id}`} className="hover:text-primary">
            {vehicle.title}
          </Link>
        </h2>
        <p className="mt-1 font-black">{formatCurrency(vehicle.price, vehicle.currency, locale)}</p>
        <p className="mt-4 text-sm text-muted-foreground">{t("compare.minimum")}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/vehicles">{t("hero.cta.browse")}</Link>
          </Button>
          <Button type="button" variant="outline" className="text-destructive" onClick={onRemove}>
            <X className="me-2 h-4 w-4" />
            {t("compare.removeShort")}
          </Button>
        </div>
      </section>
    );
  }
}

const compareMediaFrameClass =
  "relative mx-auto h-36 w-48 overflow-hidden rounded-xl border border-border/60 bg-muted";

function CompareMedia({ vehicle }: { vehicle: VehicleListing }) {
  const { t } = useI18n();
  const image = vehicle.images[0];
  return (
    <div className={compareMediaFrameClass}>
      {image ? (
        <Image
          src={image.url}
          alt={image.alt}
          fill
          unoptimized={image.url.startsWith("blob:")}
          sizes="192px"
          className="object-contain p-2"
        />
      ) : (
        <div
          className="absolute inset-2 grid place-items-center text-muted-foreground"
          role="img"
          aria-label={t("vehicle.gallery.noImages")}
        >
          <ImageOff className="h-10 w-10" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

function comparisonRows(
  t: (key: string) => string,
  locale: "ar" | "en",
  category: VehicleListing["category"],
) {
  const common = [
    {
      label: t("compare.price"),
      value: (v: VehicleListing) => formatCurrency(v.price, v.currency, locale),
    },
    {
      label: t("category.kind"),
      value: (v: VehicleListing) => t(listingCategoryRegistry[v.category].labelKey),
    },
    { label: t("form.make"), value: (v: VehicleListing) => v.specs.make },
    { label: t("form.model"), value: (v: VehicleListing) => v.specs.model },
    { label: t("form.year"), value: (v: VehicleListing) => formatYear(v.year, locale) },
  ];
  const categoryRows =
    category === "CAR"
      ? [
          {
            label: t("card.km"),
            value: (v: VehicleListing) =>
              v.category === "CAR"
                ? formatMileage(v.specs.mileage ?? 0, locale, t("card.km"))
                : t("vehicle.notAvailable"),
          },
          {
            label: t("vehicle.transmission"),
            value: (v: VehicleListing) =>
              v.category === "CAR"
                ? t(`transmission.${v.specs.transmission}`)
                : t("vehicle.notAvailable"),
          },
          {
            label: t("vehicle.fuel"),
            value: (v: VehicleListing) =>
              v.category === "CAR" ? t(`fuel.${v.specs.fuelType}`) : t("vehicle.notAvailable"),
          },
          {
            label: t("vehicle.engine"),
            value: (v: VehicleListing) =>
              v.category === "CAR"
                ? (carEngineDisplay(v) ?? t("vehicle.notAvailable"))
                : t("vehicle.notAvailable"),
          },
          {
            label: t("vehicle.bodyType"),
            value: (v: VehicleListing) =>
              v.category === "CAR"
                ? v.specs.bodyType || t("vehicle.notAvailable")
                : t("vehicle.notAvailable"),
          },
        ]
      : category === "MOTORCYCLE"
        ? [
            {
              label: t("card.km"),
              value: (v: VehicleListing) =>
                v.category === "MOTORCYCLE"
                  ? formatMileage(v.specs.mileage ?? 0, locale, t("card.km"))
                  : t("vehicle.notAvailable"),
            },
            {
              label: t("category.motorcycleType"),
              value: (v: VehicleListing) =>
                v.category === "MOTORCYCLE"
                  ? t(`motorcycleType.${v.specs.motorcycleType}`)
                  : t("vehicle.notAvailable"),
            },
            {
              label: t("category.engineCapacity"),
              value: (v: VehicleListing) =>
                v.category === "MOTORCYCLE"
                  ? `${v.specs.engineCapacityCc ?? "—"} ${t("category.cc")}`
                  : t("vehicle.notAvailable"),
            },
          ]
        : [
            {
              label: t("category.boatType"),
              value: (v: VehicleListing) =>
                v.category === "BOAT"
                  ? t(`boatType.${v.specs.boatType}`)
                  : t("vehicle.notAvailable"),
            },
            {
              label: t("category.length"),
              value: (v: VehicleListing) =>
                v.category === "BOAT"
                  ? `${v.specs.lengthMeters ?? "—"} ${t("category.meters")}`
                  : t("vehicle.notAvailable"),
            },
            {
              label: t("category.propulsion"),
              value: (v: VehicleListing) =>
                v.category === "BOAT"
                  ? t(`propulsion.${v.specs.propulsion}`)
                  : t("vehicle.notAvailable"),
            },
            {
              label: t("category.engineHours"),
              value: (v: VehicleListing) =>
                v.category === "BOAT"
                  ? String(v.specs.engineHours ?? "—")
                  : t("vehicle.notAvailable"),
            },
            {
              label: t("category.enginePower"),
              value: (v: VehicleListing) =>
                v.category === "BOAT" && v.specs.enginePowerHp
                  ? `${v.specs.enginePowerHp} ${t("category.horsepower")}`
                  : t("vehicle.notAvailable"),
            },
            {
              label: t("category.passengerCapacity"),
              value: (v: VehicleListing) =>
                v.category === "BOAT"
                  ? String(v.specs.passengerCapacity ?? "—")
                  : t("vehicle.notAvailable"),
            },
          ];
  return [
    ...common,
    ...categoryRows,
    {
      label: t("vehicle.condition"),
      value: (v: VehicleListing) => t(v.condition === "new" ? "card.new" : "card.used"),
    },
    { label: t("vehicle.location"), value: (v: VehicleListing) => v.location },
    { label: t("vehicle.seller"), value: (v: VehicleListing) => v.sellerName },
  ];
}

function ComparisonRow({ label, values }: { label: string; values: string[] }) {
  const { t } = useI18n();
  const differs = new Set(values).size > 1;
  return (
    <tr className={cn("border-t", differs && "bg-primary/5")}>
      <th scope="row" className="sticky start-0 z-10 bg-background p-4 text-start font-semibold">
        {label}
        {differs && (
          <span className="mt-1 block text-[10px] font-normal text-primary">
            {t("compare.differs")}
          </span>
        )}
      </th>
      {values.map((value, index) => (
        <td key={`${value}-${index}`} className="border-s p-4 text-center">
          {value}
        </td>
      ))}
    </tr>
  );
}
