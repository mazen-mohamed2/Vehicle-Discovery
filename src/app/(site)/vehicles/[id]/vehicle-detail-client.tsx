"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Eye,
  Flag,
  Heart,
  MapPin,
  MessageSquare,
  HandCoins,
  Scale,
  Share2,
  Star,
  Store,
  UserRound,
} from "lucide-react";
import type { Agency, VehicleListing } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useI18n } from "@/lib/i18n";
import { formatCurrency, formatDate, formatMileage, formatNumber, formatYear } from "@/lib/locale";
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
import { toast } from "sonner";
import { VehicleGallery } from "./vehicle-gallery";
import { useFavorites } from "@/hooks/use-favorites";
import { useCompare } from "@/hooks/use-compare";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useMarketplaceCommunication } from "@/hooks/use-marketplace-communication";
import { CommunicationError } from "@/lib/communication";
import { ReportDialog } from "@/components/trust-safety/ReportDialog";
import { TrustBadge } from "@/components/trust-safety/TrustBadge";
import { trustSafetyService } from "@/services/trust-safety.service";
import { VehicleVerificationAction } from "@/components/trust-safety/VehicleVerificationAction";
import { carEngineDisplay, listingCategoryRegistry } from "@/lib/marketplace-listing";

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
  const [offerOpen, setOfferOpen] = useState(false);
  const { isFavorite, toggleFavorite, isHydrating, togglingListingId } = useFavorites();
  const saved = isFavorite(v.id);
  const {
    isCompared,
    toggleCompare,
    canCompareListing,
    isHydrating: compareHydrating,
  } = useCompare();
  const compared = isCompared(v.id);
  const auth = useAuth();
  const router = useRouter();
  const communication = useMarketplaceCommunication();
  const returnPath = `/vehicles/${v.id}`;
  const ownListing = Boolean(auth.user && v.sellerUserId === auth.user.id);
  const existingOffer = communication.buyerOffers.find(
    (offer) => offer.listingId === v.id && offer.status === "PENDING",
  );

  const overview = [
    [t("category.kind"), t(listingCategoryRegistry[v.category].labelKey)],
    [t("form.year"), formatYear(v.year, locale)],
    [t("vehicle.condition"), t(v.condition === "new" ? "card.new" : "card.used")],
  ];
  const mechanical: string[][] = [];
  if (v.category === "CAR") {
    overview.push([t("card.km"), formatMileage(v.specs.mileage ?? 0, locale, t("card.km"))]);
    overview.push([t("vehicle.bodyType"), v.specs.bodyType || t("vehicle.notAvailable")]);
    mechanical.push([t("vehicle.fuel"), t(`fuel.${v.specs.fuelType}`)]);
    mechanical.push([t("vehicle.transmission"), t(`transmission.${v.specs.transmission}`)]);
    mechanical.push([t("vehicle.engine"), carEngineDisplay(v) ?? t("vehicle.notAvailable")]);
    mechanical.push([t("vehicle.color"), v.specs.exteriorColor || t("vehicle.notAvailable")]);
  } else if (v.category === "MOTORCYCLE") {
    overview.push([t("card.km"), formatMileage(v.specs.mileage ?? 0, locale, t("card.km"))]);
    overview.push([t("category.motorcycleType"), t(`motorcycleType.${v.specs.motorcycleType}`)]);
    mechanical.push([
      t("category.engineCapacity"),
      `${v.specs.engineCapacityCc ?? "—"} ${t("category.cc")}`,
    ]);
    if (v.specs.transmission)
      mechanical.push([t("vehicle.transmission"), t(`transmission.${v.specs.transmission}`)]);
  } else {
    overview.push([t("category.boatType"), t(`boatType.${v.specs.boatType}`)]);
    overview.push([t("category.length"), `${v.specs.lengthMeters ?? "—"} ${t("category.meters")}`]);
    mechanical.push([t("category.propulsion"), t(`propulsion.${v.specs.propulsion}`)]);
    if (v.specs.engineCount)
      mechanical.push([t("category.engineCount"), String(v.specs.engineCount)]);
    if (v.specs.engineHours !== undefined)
      mechanical.push([t("category.engineHours"), String(v.specs.engineHours)]);
    if (v.specs.hullMaterial) mechanical.push([t("category.hullMaterial"), v.specs.hullMaterial]);
  }
  const listing = [
    ...(v.category === "CAR" ? [[t("vehicle.vin"), v.specs.vin ?? t("vehicle.notAvailable")]] : []),
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
              <TrustBadge status={trustSafetyService.publicStatus("VEHICLE", v.id)} />
            </div>
            <h1 className="mt-4 text-2xl font-black sm:text-3xl">{v.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatYear(v.year, locale)} · {v.specs.make} {v.specs.model}
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
                disabled={ownListing || communication.isPending}
                onClick={() =>
                  auth.requireAuth(returnPath, async () => {
                    try {
                      const conversation = await communication.startConversation(v.id);
                      router.push(`/messages/${conversation.id}`);
                    } catch (error) {
                      toast.error(
                        t(
                          error instanceof CommunicationError && error.code === "SELF_INTERACTION"
                            ? "communication.self"
                            : "communication.error",
                        ),
                      );
                    }
                  })
                }
              >
                <MessageSquare className="me-2 h-4 w-4" /> {t("vehicle.contactSeller")}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="col-span-2"
                disabled={ownListing}
                onClick={() => auth.requireAuth(returnPath, () => setOfferOpen(true))}
              >
                <HandCoins className="me-2 h-4 w-4" /> {t("vehicleOffers.make")}
              </Button>
              {isHydrating ? (
                <Skeleton role="status" aria-label={t("a11y.loading")} className="h-10 w-full" />
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  aria-label={saved ? t("favorites.remove") : t("favorites.add")}
                  aria-pressed={saved}
                  disabled={togglingListingId === v.id}
                  onClick={() => toggleFavorite(v.id)}
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
              {compareHydrating ? (
                <Skeleton role="status" aria-label={t("compare.loading")} className="h-10 w-full" />
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  aria-label={t(compared ? "compare.remove" : "compare.add")}
                  aria-pressed={compared}
                  onClick={() => {
                    const changed = toggleCompare(v.id);
                    if (!changed)
                      toast.error(
                        t(canCompareListing(v.id) ? "compare.limit" : "category.compareSame"),
                      );
                    else toast.success(t(compared ? "compare.removed" : "compare.added"));
                  }}
                >
                  <Scale className="me-2 h-4 w-4" />{" "}
                  {t(compared ? "compare.removeShort" : "compare.addShort")}
                </Button>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={ownListing}
              className="mt-2 w-full text-muted-foreground"
              onClick={() => auth.requireAuth(returnPath, () => setReportOpen(true))}
            >
              <Flag className="me-2 h-4 w-4" /> {t("vehicle.report")}
            </Button>
            {ownListing && <VehicleVerificationAction listingId={v.id} />}
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
            href={`/vehicles?category=${v.category}&make=${encodeURIComponent(v.specs.make)}`}
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
        onOpenChange={setReportOpen}
        targetType="LISTING"
        targetId={v.id}
      />
      <VehicleOfferDialog
        open={offerOpen}
        onOpenChange={setOfferOpen}
        listingId={v.id}
        currency={v.currency}
        existingOfferId={existingOffer?.id}
        onCreate={communication.createOffer}
        onWithdraw={(id) => communication.runOfferAction({ action: "withdraw", id })}
        pending={communication.isPending}
      />
    </main>
  );
}

function VehicleOfferDialog({
  open,
  onOpenChange,
  listingId,
  currency,
  existingOfferId,
  onCreate,
  onWithdraw,
  pending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId: string;
  currency: "EGP" | "USD";
  existingOfferId?: string;
  onCreate: (input: {
    listingId: string;
    amount: number;
    currency: "EGP" | "USD";
    note?: string;
  }) => Promise<unknown>;
  onWithdraw: (id: string) => Promise<unknown>;
  pending: boolean;
}) {
  const { t } = useI18n();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const submit = async () => {
    setError("");
    try {
      await onCreate({ listingId, amount: Number(amount), currency, note });
      onOpenChange(false);
      setAmount("");
      setNote("");
      toast.success(t("vehicleOffers.created"));
    } catch (caught) {
      setError(
        t(
          caught instanceof CommunicationError && caught.code === "DUPLICATE_ACTIVE_OFFER"
            ? "vehicleOffers.duplicate"
            : "vehicleOffers.invalid",
        ),
      );
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("vehicleOffers.make")}</DialogTitle>
          <DialogDescription>{t("vehicleOffers.makeDescription")}</DialogDescription>
        </DialogHeader>
        {existingOfferId ? (
          <div>
            <p>{t("vehicleOffers.existing")}</p>
            <Button
              className="mt-4"
              variant="outline"
              disabled={pending}
              onClick={async () => {
                await onWithdraw(existingOfferId);
                onOpenChange(false);
              }}
            >
              {t("vehicleOffers.withdraw")}
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            <label htmlFor="vehicle-offer-amount" className="font-bold">
              {t("vehicleOffers.amount")}
              <Input
                id="vehicle-offer-amount"
                type="number"
                min="1"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "vehicle-offer-error" : undefined}
              />
            </label>
            <p className="text-sm text-muted-foreground">
              {t("vehicleOffers.currency")}: {currency}
            </p>
            <label htmlFor="vehicle-offer-note" className="font-bold">
              {t("vehicleOffers.note")}
              <Textarea
                id="vehicle-offer-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>
            {error && (
              <p id="vehicle-offer-error" role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t("common.close")}
              </Button>
              <Button disabled={pending} onClick={() => void submit()}>
                {pending ? t("vehicleOffers.submitting") : t("vehicleOffers.submit")}
              </Button>
            </DialogFooter>
          </div>
        )}
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
        <TrustBadge
          status={trustSafetyService.publicStatus(
            isAgency ? "DEALER" : "INDIVIDUAL",
            isAgency
              ? (seller?.id ?? vehicle.sellerId)
              : (vehicle.sellerUserId ?? vehicle.sellerId),
          )}
        />
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
      ) : vehicle.sellerUserId ? (
        <Button asChild variant="outline" className="mt-5 w-full">
          <Link href={`/sellers/${vehicle.sellerUserId}`}>{t("seller.viewProfile")}</Link>
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
