"use client";

import { useDeferredValue, useMemo, useState } from "react";
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Flag,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  Share2,
  Star,
  Store,
  UserRoundCheck,
} from "lucide-react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { VehicleCard } from "@/components/marketplace/VehicleCard";
import { AgencyCard } from "@/components/marketplace/AgencyCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, VehicleGridSkeleton } from "@/components/marketplace/CollectionStates";
import { useI18n } from "@/lib/i18n";
import { agenciesService } from "@/services/agencies.service";
import { listingsService } from "@/services/listings.service";
import { queryKeys } from "@/lib/query-keys";
import { formatCurrency, formatNumber, formatYear } from "@/lib/locale";
import {
  filterDealerInventory,
  type DealerInventoryFilters,
  type DealerInventorySort,
} from "@/lib/dealer-inventory";
import type { FuelType, Transmission } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { ReportDialog } from "@/components/trust-safety/ReportDialog";
import { TrustBadge } from "@/components/trust-safety/TrustBadge";
import { trustSafetyService } from "@/services/trust-safety.service";
import {
  listingCategories,
  type BoatType,
  type MotorcycleType,
  type PropulsionType,
} from "@/lib/marketplace-listing";

const defaultFilters: DealerInventoryFilters = {
  search: "",
  category: "",
  make: "",
  bodyType: "",
  fuel: "",
  transmission: "",
  motorcycleType: "",
  boatType: "",
  propulsion: "",
  sort: "newest",
};

export function DealerDetailClient({ id }: { id: string }) {
  const { t, locale } = useI18n();
  const auth = useAuth();
  const [filters, setFilters] = useState(defaultFilters);
  const [reportOpen, setReportOpen] = useState(false);
  const deferredSearch = useDeferredValue(filters.search);
  const { data: agency } = useSuspenseQuery({
    queryKey: queryKeys.agencies.detail(id),
    queryFn: () => agenciesService.byId(id),
  });
  const inventoryQuery = useQuery({
    queryKey: queryKeys.listings.byAgency(id),
    queryFn: () => listingsService.byAgency(id),
    refetchOnMount: "always",
  });
  const { data: recommendations } = useSuspenseQuery({
    queryKey: queryKeys.agencies.similar(id, 3),
    queryFn: () => agenciesService.similar(id, 3),
  });
  const inventory = useMemo(() => inventoryQuery.data ?? [], [inventoryQuery.data]);
  const visibleInventory = useMemo(
    () => filterDealerInventory(inventory, { ...filters, search: deferredSearch }),
    [deferredSearch, filters, inventory],
  );
  const makes = useMemo(
    () =>
      [
        ...new Set(
          inventory
            .filter((item) => !filters.category || item.category === filters.category)
            .map((item) => item.specs.make),
        ),
      ].sort(),
    [inventory, filters.category],
  );
  const bodyTypes = useMemo(
    () =>
      [
        ...new Set(
          inventory.flatMap((item) =>
            item.category === "CAR" && item.specs.bodyType ? [item.specs.bodyType] : [],
          ),
        ),
      ].sort(),
    [inventory],
  );
  const motorcycleTypes = useMemo(
    () =>
      [
        ...new Set(
          inventory.flatMap((item) =>
            item.category === "MOTORCYCLE" && item.specs.motorcycleType
              ? [item.specs.motorcycleType]
              : [],
          ),
        ),
      ].sort(),
    [inventory],
  );
  const boatTypes = useMemo(
    () =>
      [
        ...new Set(
          inventory.flatMap((item) =>
            item.category === "BOAT" && item.specs.boatType ? [item.specs.boatType] : [],
          ),
        ),
      ].sort(),
    [inventory],
  );
  const propulsions = useMemo(
    () =>
      [
        ...new Set(
          inventory.flatMap((item) =>
            item.category === "BOAT" && item.specs.propulsion ? [item.specs.propulsion] : [],
          ),
        ),
      ].sort(),
    [inventory],
  );

  if (!agency) return null;
  const newVehicles = inventory.filter((vehicle) => vehicle.condition === "new").length;
  const usedVehicles = inventory.length - newVehicles;
  const averagePrice = inventory.length
    ? inventory.reduce((total, vehicle) => total + vehicle.price, 0) / inventory.length
    : 0;
  const yearsInMarketplace = Math.max(0, new Date().getFullYear() - agency.since);
  const updateFilter = <Key extends keyof DealerInventoryFilters>(
    key: Key,
    value: DealerInventoryFilters[Key],
  ) => setFilters((current) => ({ ...current, [key]: value }));
  const placeholderAction = (action: string) =>
    auth.requireAuth(`/dealers/${id}`, () =>
      toast.info(action, { description: t("dealer.contact.placeholder") }),
    );

  return (
    <main>
      <section
        className="relative overflow-hidden border-b border-border/60"
        aria-labelledby="dealer-title"
      >
        <div className="absolute inset-0 -z-10 gradient-hero opacity-70" />
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="flex min-w-0 flex-col gap-5 sm:flex-row">
              <Avatar className="h-24 w-24 shrink-0 rounded-2xl border-2 border-primary/30 shadow-elegant">
                {agency.logoUrl && <AvatarImage src={agency.logoUrl} alt={agency.name} />}
                <AvatarFallback className="rounded-2xl gradient-primary text-3xl font-black text-primary-foreground">
                  {agency.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 id="dealer-title" className="break-words text-3xl font-black sm:text-4xl">
                    {agency.name}
                  </h1>
                  <TrustBadge status={trustSafetyService.publicStatus("DEALER", agency.id)} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                  <span
                    className="inline-flex items-center gap-1.5"
                    aria-label={t("dealer.rating")}
                  >
                    <Star className="h-4 w-4 fill-warning text-warning" aria-hidden="true" />
                    {formatNumber(agency.rating, locale)} ·{" "}
                    {formatNumber(agency.reviewCount ?? 0, locale)} {t("dealer.reviews")}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {agency.location}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4" />
                    {t("agency.since")} {formatYear(agency.since, locale)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock3 className="h-4 w-4" />
                    {t("dealer.responseTime")}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-secondary px-3 py-1">
                    {t("dealer.sellerType")}
                  </span>
                  <span className="rounded-full bg-secondary px-3 py-1">
                    {formatNumber(inventory.length, locale)} {t("dealer.activeListings")}
                  </span>
                </div>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
                  {t("dealer.description").replace("{dealer}", agency.name)}
                </p>
              </div>
            </div>
            <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex md:max-w-xs md:flex-wrap md:justify-end">
              <Button
                onClick={() => placeholderAction(t("dealer.contact"))}
                className="col-span-2 sm:col-span-1"
              >
                <MessageCircle className="me-2 h-4 w-4" /> {t("dealer.contact")}
              </Button>
              <Button
                variant="outline"
                onClick={() => auth.requireAuth(`/dealers/${id}`, () => setReportOpen(true))}
              >
                <Flag className="me-2 h-4 w-4" /> {t("safety.report.dealer")}
              </Button>
              <Button variant="outline" onClick={() => placeholderAction(t("dealer.call"))}>
                <Phone className="me-2 h-4 w-4" /> {t("dealer.call")}
              </Button>
              <Button variant="outline" onClick={() => placeholderAction(t("dealer.whatsapp"))}>
                <MessageCircle className="me-2 h-4 w-4" /> {t("dealer.whatsapp")}
              </Button>
              <Button
                variant="outline"
                aria-label={t("dealer.share")}
                onClick={() => {
                  if (navigator.share)
                    void navigator.share({ title: agency.name, url: window.location.href });
                  else {
                    void navigator.clipboard?.writeText(window.location.href);
                    toast.success(t("dealer.share.copied"));
                  }
                }}
              >
                <Share2 className="me-2 h-4 w-4" /> {t("dealer.share")}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
        <section aria-labelledby="dealer-stats-title">
          <h2 id="dealer-stats-title" className="sr-only">
            {t("dealer.stats")}
          </h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatCard
              icon={Store}
              label={t("dealer.totalVehicles")}
              value={formatNumber(inventory.length, locale)}
            />
            <StatCard
              icon={CheckCircle2}
              label={t("dealer.newVehicles")}
              value={formatNumber(newVehicles, locale)}
            />
            <StatCard
              icon={UserRoundCheck}
              label={t("dealer.usedVehicles")}
              value={formatNumber(usedVehicles, locale)}
            />
            <StatCard
              icon={Building2}
              label={t("dealer.averagePrice")}
              value={formatCurrency(averagePrice, "EGP", locale)}
            />
            <StatCard
              icon={CalendarDays}
              label={t("dealer.yearsMarketplace")}
              value={formatNumber(yearsInMarketplace, locale)}
            />
          </div>
        </section>

        <section aria-labelledby="dealer-inventory-title">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="dealer-inventory-title" className="text-2xl font-black">
                {t("dealer.inventory")}
              </h2>
              <p className="text-sm text-muted-foreground">{t("dealer.inventoryDescription")}</p>
            </div>
            <span className="text-sm font-semibold">
              {formatNumber(visibleInventory.length, locale)} {t("agency.vehicles")}
            </span>
          </div>
          <div className="mt-5 grid gap-3 rounded-2xl surface-card p-4 shadow-card sm:grid-cols-2 lg:grid-cols-6">
            <label className="relative sm:col-span-2 lg:col-span-2">
              <span className="sr-only">{t("dealer.searchInventory")}</span>
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filters.search}
                onChange={(event) => updateFilter("search", event.target.value)}
                placeholder={t("dealer.searchInventory")}
                className="ps-10"
              />
            </label>
            <InventorySelect
              label={t("category.choose")}
              value={filters.category ?? ""}
              onChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  category: value as DealerInventoryFilters["category"],
                  make: "",
                  bodyType: "",
                  fuel: "",
                  transmission: "",
                  motorcycleType: "",
                  boatType: "",
                  propulsion: "",
                  sort:
                    value === "BOAT" && current.sort === "mileage-asc" ? "newest" : current.sort,
                }))
              }
              options={[...listingCategories]}
              labels={(value) => t(`category.${value}`)}
              allLabel={t("category.all")}
            />
            <InventorySelect
              label={t("form.make")}
              value={filters.make}
              onChange={(value) => updateFilter("make", value)}
              options={makes}
              allLabel={t("discovery.all")}
            />
            {(!filters.category || filters.category === "CAR") && (
              <InventorySelect
                label={t("vehicle.bodyType")}
                value={filters.bodyType}
                onChange={(value) => updateFilter("bodyType", value)}
                options={bodyTypes}
                allLabel={t("discovery.all")}
              />
            )}
            {filters.category === "MOTORCYCLE" && (
              <InventorySelect
                label={t("category.motorcycleType")}
                value={filters.motorcycleType ?? ""}
                onChange={(value) => updateFilter("motorcycleType", value as "" | MotorcycleType)}
                options={motorcycleTypes}
                labels={(value) => t(`motorcycleType.${value}`)}
                allLabel={t("discovery.all")}
              />
            )}
            {filters.category === "BOAT" && (
              <>
                <InventorySelect
                  label={t("category.boatType")}
                  value={filters.boatType ?? ""}
                  onChange={(value) => updateFilter("boatType", value as "" | BoatType)}
                  options={boatTypes}
                  labels={(value) => t(`boatType.${value}`)}
                  allLabel={t("discovery.all")}
                />
                <InventorySelect
                  label={t("category.propulsion")}
                  value={filters.propulsion ?? ""}
                  onChange={(value) => updateFilter("propulsion", value as "" | PropulsionType)}
                  options={propulsions}
                  labels={(value) => t(`propulsion.${value}`)}
                  allLabel={t("discovery.all")}
                />
              </>
            )}
            {(!filters.category || filters.category === "CAR") && (
              <InventorySelect
                label={t("vehicle.fuel")}
                value={filters.fuel}
                onChange={(value) => updateFilter("fuel", value as "" | FuelType)}
                options={["gasoline", "diesel", "hybrid", "electric"]}
                labels={(value) => t(`fuel.${value}`)}
                allLabel={t("discovery.all")}
              />
            )}
            {(!filters.category || filters.category === "CAR") && (
              <InventorySelect
                label={t("vehicle.transmission")}
                value={filters.transmission}
                onChange={(value) => updateFilter("transmission", value as "" | Transmission)}
                options={["automatic", "manual"]}
                labels={(value) => t(`transmission.${value}`)}
                allLabel={t("discovery.all")}
              />
            )}
            <InventorySelect
              label={t("discovery.sort")}
              value={filters.sort}
              onChange={(value) => updateFilter("sort", value as DealerInventorySort)}
              options={
                filters.category === "BOAT"
                  ? ["newest", "price-asc", "price-desc"]
                  : ["newest", "price-asc", "price-desc", "mileage-asc"]
              }
              labels={(value) =>
                t(
                  `sort.${value === "price-asc" ? "priceAsc" : value === "price-desc" ? "priceDesc" : value === "mileage-asc" ? "mileageAsc" : "newest"}`,
                )
              }
            />
            {Object.entries(filters).some(([key, value]) => key !== "sort" && value) && (
              <Button variant="ghost" onClick={() => setFilters(defaultFilters)}>
                {t("discovery.clear")}
              </Button>
            )}
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {inventoryQuery.isLoading ? (
              <VehicleGridSkeleton count={4} />
            ) : visibleInventory.length > 0 ? (
              visibleInventory.map((vehicle) => <VehicleCard key={vehicle.id} v={vehicle} />)
            ) : (
              <EmptyState
                title={t("state.dealer.empty.title")}
                description={
                  inventory.length
                    ? t("dealer.noFilterResults")
                    : t("state.dealer.empty.description")
                }
              />
            )}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section
            className="rounded-2xl surface-card p-6 shadow-card"
            aria-labelledby="dealer-about-title"
          >
            <h2 id="dealer-about-title" className="text-xl font-black">
              {t("dealer.about")}
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {t("dealer.description").replace("{dealer}", agency.name)}
            </p>
            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
              <AboutFact
                icon={MapPin}
                label={t("dealer.address")}
                value={agency.address ?? agency.location}
              />
              <AboutFact
                icon={Clock3}
                label={t("dealer.workingHours")}
                value={agency.workingHours ?? t("vehicle.notAvailable")}
              />
              <AboutFact
                icon={Phone}
                label={t("dealer.phone")}
                value={agency.phone ?? t("vehicle.notAvailable")}
              />
              <AboutFact
                icon={Mail}
                label={t("dealer.email")}
                value={agency.email ?? t("vehicle.notAvailable")}
              />
              <AboutFact
                icon={Building2}
                label={t("dealer.website")}
                value={agency.website ?? t("vehicle.notAvailable")}
              />
            </dl>
          </section>
          <section
            className="overflow-hidden rounded-2xl surface-card shadow-card"
            aria-labelledby="dealer-map-title"
          >
            <div className="p-6">
              <h2 id="dealer-map-title" className="text-xl font-black">
                {t("dealer.map")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {agency.address ?? agency.location}
              </p>
            </div>
            <div
              className="grid min-h-64 place-items-center bg-secondary/50"
              role="img"
              aria-label={t("dealer.mapPlaceholder")}
            >
              <div className="text-center text-muted-foreground">
                <MapPin className="mx-auto h-10 w-10 text-primary" />
                <p className="mt-2 text-sm font-semibold">{t("dealer.mapPlaceholder")}</p>
              </div>
            </div>
          </section>
        </div>

        <section aria-labelledby="similar-dealers-title">
          <div>
            <h2 id="similar-dealers-title" className="text-2xl font-black">
              {t("dealer.similar")}
            </h2>
            <p className="text-sm text-muted-foreground">{t("dealer.similarDescription")}</p>
          </div>
          {recommendations.length > 0 ? (
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {recommendations.map(({ agency: recommendation, vehicleCount }) => (
                <AgencyCard
                  key={recommendation.id}
                  a={recommendation}
                  vehicleCount={vehicleCount}
                />
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              {t("dealer.noSimilar")}
            </p>
          )}
        </section>
      </div>
      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetType="DEALER"
        targetId={id}
      />
    </main>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Store;
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-2xl surface-card p-4 shadow-card">
      <Icon className="h-5 w-5 text-primary" />
      <p className="mt-3 break-words text-xl font-black">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </article>
  );
}

function InventorySelect({
  label,
  value,
  onChange,
  options,
  labels = (option) => option,
  allLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  labels?: (value: string) => string;
  allLabel?: string;
}) {
  return (
    <label className="grid gap-1 text-xs font-semibold">
      <span>{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 min-w-0 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {allLabel !== undefined && <option value="">{allLabel}</option>}
        {options.map((option) => (
          <option key={option} value={option}>
            {labels(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function AboutFact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </dt>
      <dd className="mt-1 break-words font-semibold">{value}</dd>
    </div>
  );
}
