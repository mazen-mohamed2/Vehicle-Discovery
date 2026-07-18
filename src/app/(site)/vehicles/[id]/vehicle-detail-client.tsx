"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  Flag,
  Heart,
  MapPin,
  Phone,
  Share2,
  ShieldCheck,
  Star,
  Store,
  UserRound,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Agency, Favorite, VehicleListing } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useI18n } from "@/lib/i18n";
import { favoritesService } from "@/services/favorites.service";
import { formatCurrency, formatDate, formatMileage, formatNumber, formatYear } from "@/lib/locale";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { VehicleCard } from "@/components/marketplace/VehicleCard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { VehicleGallery } from "./vehicle-gallery";

export function VehicleDetailClient({
  vehicle: v,
  seller,
  related,
}: {
  vehicle: VehicleListing;
  seller?: Agency;
  related: VehicleListing[];
}) {
  const { t, locale } = useI18n();
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const queryClient = useQueryClient();
  const { data: favorites, isPending: favoritesHydrating } = useQuery({
    queryKey: queryKeys.favorites.all,
    queryFn: favoritesService.list,
  });
  const saved = favorites?.some((favorite) => favorite.listingId === v.id) ?? false;
  const favoriteMutation = useMutation({
    mutationFn: async () => {
      if (saved) await favoritesService.remove(v.id);
      else await favoritesService.add(v.id);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.favorites.all });
      const previous = queryClient.getQueryData<Favorite[]>(queryKeys.favorites.all) ?? [];
      queryClient.setQueryData<Favorite[]>(
        queryKeys.favorites.all,
        saved
          ? previous.filter((favorite) => favorite.listingId !== v.id)
          : [
              ...previous,
              {
                id: `optimistic_${v.id}`,
                userId: "me",
                listingId: v.id,
                createdAt: new Date().toISOString(),
              },
            ],
      );
      return { previous };
    },
    onError: (_error, _variables, context) =>
      queryClient.setQueryData(queryKeys.favorites.all, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.favorites.all }),
  });

  const overview = [
    [t("form.year"), formatYear(v.year, locale)],
    [t("card.km"), formatMileage(v.mileage, locale, t("card.km"))],
    [t("vehicle.condition"), t(v.condition === "new" ? "card.new" : "card.used")],
    [t("vehicle.bodyType"), v.bodyType ?? t("vehicle.notAvailable")],
  ];
  const mechanical = [
    [t("vehicle.fuel"), t(`fuel.${v.fuel}`)],
    [t("vehicle.transmission"), t(`transmission.${v.transmission}`)],
    [t("vehicle.engine"), v.engine ?? t("vehicle.notAvailable")],
    [t("vehicle.color"), v.color ?? t("vehicle.notAvailable")],
  ];
  const listing = [
    [t("vehicle.vin"), v.vin ?? t("vehicle.notAvailable")],
    [t("vehicle.stockId"), v.stockId ?? v.id.toUpperCase()],
    [t("vehicle.listed"), formatDate(v.createdAt, locale)],
    [t("vehicle.updated"), formatDate(v.updatedAt ?? v.createdAt, locale)],
    [t("vehicle.views"), formatNumber(v.views ?? 0, locale)],
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <nav aria-label={t("vehicle.breadcrumb")}>
        <Link
          href="/vehicles"
          className="inline-flex items-center gap-1.5 rounded-sm text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {t("vehicles.title")}
        </Link>
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <div className="min-w-0 space-y-8">
          <VehicleGallery images={v.images} title={v.title} />

          <section
            className="rounded-2xl surface-card p-5 shadow-card sm:p-6"
            aria-labelledby="specifications-title"
          >
            <h2 id="specifications-title" className="text-xl font-black">
              {t("vehicle.specifications")}
            </h2>
            <div className="mt-5 grid gap-6 md:grid-cols-2">
              <SpecificationGroup title={t("vehicle.overview")} items={overview} />
              <SpecificationGroup title={t("vehicle.mechanical")} items={mechanical} />
              <SpecificationGroup
                title={t("vehicle.listingDetails")}
                items={listing}
                className="md:col-span-2"
              />
            </div>
          </section>
        </div>

        <aside className="space-y-5" aria-label={t("vehicle.purchaseInformation")}>
          <section className="rounded-2xl surface-card p-6 shadow-elegant lg:static lg:top-24">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-secondary px-2 py-1 font-semibold">
                {v.sellerType === "agency" ? t("card.byAgency") : t("card.byOwner")}
              </span>
              {v.verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-primary">
                  <ShieldCheck className="h-3 w-3" /> {t("card.verified")}
                </span>
              )}
            </div>
            <h1 className="mt-4 text-2xl font-black sm:text-3xl">{v.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatYear(v.year, locale)} · {v.make} {v.model}
            </p>
            <p className="mt-4 text-3xl font-black bg-gradient-to-br from-primary to-primary-glow bg-clip-text text-transparent">
              {formatCurrency(v.price, v.currency, locale)}
            </p>
            <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" /> {v.location}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-2">
              <Button
                size="lg"
                className="col-span-2 gradient-primary text-primary-foreground shadow-elegant"
                title={t("common.soon")}
              >
                <Phone className="me-2 h-4 w-4" /> {t("vehicle.contactSeller")}
              </Button>
              {favoritesHydrating ? (
                <Skeleton role="status" aria-label={t("a11y.loading")} className="h-10 w-full" />
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  aria-label={saved ? t("favorites.remove") : t("favorites.add")}
                  aria-pressed={saved}
                  disabled={favoriteMutation.isPending}
                  onClick={() => favoriteMutation.mutate()}
                >
                  <Heart className={cn("me-2 h-4 w-4", saved && "fill-current text-destructive")} />
                  {t("vehicle.save")}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                aria-label={t("vehicle.share")}
                onClick={() =>
                  void navigator.share?.({ title: v.title, url: window.location.href })
                }
              >
                <Share2 className="me-2 h-4 w-4" /> {t("vehicle.share")}
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2 w-full text-muted-foreground"
              onClick={() => setReportOpen(true)}
            >
              <Flag className="me-2 h-4 w-4" /> {t("vehicle.report")}
            </Button>
          </section>

          <SellerCard vehicle={v} seller={seller} />
        </aside>
      </div>

      <section className="mt-12" aria-labelledby="related-title">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="related-title" className="text-2xl font-black">
              {t("vehicle.related")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("vehicle.relatedDescription")}</p>
          </div>
          <Link
            href={`/vehicles?make=${encodeURIComponent(v.make)}`}
            className="text-sm font-bold text-primary hover:underline"
          >
            {t("featured.viewAll")}
          </Link>
        </div>
        {related.length > 0 ? (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((vehicle) => (
              <VehicleCard key={vehicle.id} v={vehicle} />
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            {t("vehicle.noRelated")}
          </div>
        )}
      </section>
      <ReportDialog
        open={reportOpen}
        reason={reportReason}
        onOpenChange={setReportOpen}
        onReasonChange={setReportReason}
        onSubmit={() => {
          setReportOpen(false);
          setReportReason("");
          toast.success(t("vehicle.report.successTitle"), {
            description: t("vehicle.report.successDescription"),
          });
        }}
      />
      <Toaster position={locale === "ar" ? "bottom-left" : "bottom-right"} />
    </main>
  );
}

function ReportDialog({
  open,
  reason,
  onOpenChange,
  onReasonChange,
  onSubmit,
}: {
  open: boolean;
  reason: string;
  onOpenChange: (open: boolean) => void;
  onReasonChange: (reason: string) => void;
  onSubmit: () => void;
}) {
  const { t } = useI18n();
  const reasons = ["incorrect", "sold", "fraud", "duplicate", "other"];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("vehicle.report.title")}</DialogTitle>
          <DialogDescription>{t("vehicle.report.description")}</DialogDescription>
        </DialogHeader>
        <RadioGroup
          value={reason}
          onValueChange={onReasonChange}
          aria-label={t("vehicle.report.reasonLabel")}
          className="my-2 gap-3"
        >
          {reasons.map((value) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm font-medium hover:bg-muted/60"
            >
              <RadioGroupItem value={value} />
              {t(`vehicle.report.reason.${value}`)}
            </label>
          ))}
        </RadioGroup>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.close")}
          </Button>
          <Button type="button" disabled={!reason} onClick={onSubmit}>
            {t("vehicle.report.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SpecificationGroup({
  title,
  items,
  className,
}: {
  title: string;
  items: string[][];
  className?: string;
}) {
  return (
    <section className={className}>
      <h3 className="border-b pb-2 text-sm font-bold text-primary">{title}</h3>
      <dl className="mt-2 divide-y divide-border/60">
        {items.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 py-2.5 text-sm">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-end font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function SellerCard({ vehicle, seller }: { vehicle: VehicleListing; seller?: Agency }) {
  const { t, locale } = useI18n();
  const isAgency = vehicle.sellerType === "agency";
  return (
    <section className="rounded-2xl surface-card p-5 shadow-card" aria-labelledby="seller-title">
      <h2 id="seller-title" className="sr-only">
        {t("vehicle.seller")}
      </h2>
      <div className="flex items-center gap-3">
        <Avatar className="h-14 w-14 border">
          {seller?.logoUrl && <AvatarImage src={seller.logoUrl} alt={seller.name} />}
          <AvatarFallback>{isAgency ? <Store /> : <UserRound />}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{seller?.name ?? vehicle.sellerName}</p>
          <p className="text-xs text-muted-foreground">
            {isAgency
              ? seller
                ? t("vehicle.verifiedDealer")
                : t("vehicle.sellerUnavailable")
              : t("vehicle.individualSeller")}
          </p>
        </div>
        {(seller?.verified ?? vehicle.verified) && (
          <CheckCircle2 className="h-5 w-5 text-primary" aria-label={t("card.verified")} />
        )}
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <SellerFact
          icon={Star}
          label={t("vehicle.rating")}
          value={seller ? formatNumber(seller.rating, locale) : t("vehicle.notAvailable")}
        />
        <SellerFact
          icon={Store}
          label={t("agency.vehicles")}
          value={seller ? formatNumber(seller.vehicleCount, locale) : t("vehicle.notAvailable")}
        />
        <SellerFact
          icon={CalendarDays}
          label={t("vehicle.joinedSince")}
          value={seller ? formatYear(seller.since, locale) : t("vehicle.notAvailable")}
        />
        <SellerFact
          icon={MapPin}
          label={t("vehicle.location")}
          value={seller?.location ?? vehicle.location}
        />
        <SellerFact
          icon={Clock3}
          label={t("vehicle.responseTime")}
          value={t("vehicle.responsePlaceholder")}
        />
        <SellerFact
          icon={Eye}
          label={t("vehicle.sellerType")}
          value={isAgency ? t("card.byAgency") : t("card.byOwner")}
        />
      </dl>
      {isAgency && seller ? (
        <Button asChild variant="outline" className="mt-5 w-full">
          <Link href={`/dealers/${seller.id}`}>{t("vehicle.dealerProfile")}</Link>
        </Button>
      ) : null}
    </section>
  );
}

function SellerFact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Star;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </dt>
      <dd className="mt-1 truncate font-semibold">{value}</dd>
    </div>
  );
}
