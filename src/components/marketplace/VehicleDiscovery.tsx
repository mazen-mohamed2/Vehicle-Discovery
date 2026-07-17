"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Filter, Search, SlidersHorizontal } from "lucide-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { SellerType } from "@/lib/types";
import { parseDiscoveryParams, canonicalMake } from "@/lib/vehicle-discovery";
import { queryKeys } from "@/lib/query-keys";
import { listingsService } from "@/services/listings.service";
import { useI18n } from "@/lib/i18n";
import { formatCurrency, formatMileage, formatNumber } from "@/lib/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { VehicleCard } from "./VehicleCard";
import { QueryErrorState, VehicleGridSkeleton } from "./CollectionStates";

type Props = { lockedSellerType?: SellerType; emptyTitle: string; emptyDescription: string };

export function VehicleDiscovery({ lockedSellerType, emptyTitle, emptyDescription }: Props) {
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useMemo(
    () => parseDiscoveryParams(new URLSearchParams(searchParams), lockedSellerType),
    [searchParams, lockedSellerType],
  );
  const committedSearch = params.q ?? "";
  const [search, setSearch] = useState(committedSearch);
  const searchDraftRef = useRef(committedSearch);
  const committedSearchRef = useRef(committedSearch);
  const searchIsLocallyDirtyRef = useRef(false);
  const searchTimerRef = useRef<number | null>(null);
  const searchSequenceRef = useRef(0);
  const composingRef = useRef(false);
  const updateRef = useRef<
    (changes: Record<string, string | undefined>, resetPage?: boolean) => void
  >(() => undefined);

  const update = useCallback(
    (changes: Record<string, string | undefined>, resetPage = true) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(changes).forEach(([key, value]) =>
        value ? next.set(key, value) : next.delete(key),
      );
      if (resetPage) next.delete("page");
      if (next.toString() === searchParams.toString()) return;
      router.replace(`${pathname}${next.size ? `?${next.toString()}` : ""}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );
  updateRef.current = update;

  const cancelSearchCommit = useCallback(() => {
    searchSequenceRef.current += 1;
    if (searchTimerRef.current !== null) {
      window.clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }
  }, []);

  const commitSearch = useCallback((draft: string) => {
    const normalized = draft.trim();
    if (normalized === committedSearchRef.current) {
      if (normalized === searchDraftRef.current.trim()) {
        searchIsLocallyDirtyRef.current = false;
      }
      return;
    }
    updateRef.current({ q: normalized || undefined });
  }, []);

  const scheduleSearchCommit = useCallback(
    (draft: string) => {
      cancelSearchCommit();
      if (composingRef.current) return;
      if (draft === "") {
        commitSearch("");
        return;
      }
      const sequence = searchSequenceRef.current;
      searchTimerRef.current = window.setTimeout(() => {
        if (sequence !== searchSequenceRef.current || composingRef.current) return;
        searchTimerRef.current = null;
        commitSearch(searchDraftRef.current);
      }, 400);
    },
    [cancelSearchCommit, commitSearch],
  );

  const changeSearch = (value: string) => {
    searchIsLocallyDirtyRef.current = true;
    searchDraftRef.current = value;
    setSearch(value);
    scheduleSearchCommit(value);
  };

  useEffect(() => {
    if (searchIsLocallyDirtyRef.current) {
      committedSearchRef.current = committedSearch;
      if (committedSearch === searchDraftRef.current.trim()) {
        searchIsLocallyDirtyRef.current = false;
      }
      return;
    }
    if (committedSearch !== committedSearchRef.current) {
      cancelSearchCommit();
      committedSearchRef.current = committedSearch;
      searchDraftRef.current = committedSearch;
      setSearch(committedSearch);
    }
  }, [cancelSearchCommit, committedSearch]);

  useEffect(() => cancelSearchCommit, [cancelSearchCommit]);

  const query = useQuery({
    queryKey: queryKeys.listings.discovery(params),
    queryFn: () => listingsService.discover(params),
    placeholderData: keepPreviousData,
  });
  const result = query.data;
  const clear = () => {
    cancelSearchCommit();
    searchIsLocallyDirtyRef.current = true;
    searchDraftRef.current = "";
    setSearch("");
    if (searchParams.size) {
      router.replace(pathname, { scroll: false });
    } else {
      committedSearchRef.current = "";
      searchIsLocallyDirtyRef.current = false;
    }
  };

  const activeFilterCount = [
    params.q,
    params.make,
    params.model,
    params.year,
    params.priceMin,
    params.priceMax,
    params.mileageMin,
    params.mileageMax,
    params.fuel,
    params.transmission,
    params.condition,
    lockedSellerType ? undefined : params.sellerType,
    params.location,
  ].filter((value) => value !== undefined && value !== "").length;

  const filterPanel = result ? (
    <FilterFields
      params={params}
      facets={result.facets}
      lockedSellerType={lockedSellerType}
      update={update}
      locale={locale}
    />
  ) : null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-3 rounded-2xl surface-card p-4 shadow-card lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(event) => changeSearch(event.target.value)}
            onCompositionStart={() => {
              composingRef.current = true;
              cancelSearchCommit();
            }}
            onCompositionEnd={(event) => {
              composingRef.current = false;
              changeSearch(event.currentTarget.value);
            }}
            placeholder={t("search.placeholder")}
            aria-label={t("search.placeholder")}
            className="h-11 ps-10"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="lg:hidden">
                <Filter className="me-2 h-4 w-4" />
                {t("discovery.filters")}
                {activeFilterCount > 0 && (
                  <span className="ms-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">
                    {formatNumber(activeFilterCount, locale)}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent
              side={locale === "ar" ? "left" : "right"}
              className="overflow-y-auto"
              closeLabel={t("common.close")}
            >
              <SheetHeader>
                <SheetTitle>{t("discovery.filters")}</SheetTitle>
                <SheetDescription>{t("discovery.filters.description")}</SheetDescription>
              </SheetHeader>
              <div className="mt-6">{filterPanel}</div>
            </SheetContent>
          </Sheet>
          <SelectField
            label={t("discovery.sort")}
            value={params.sort}
            onChange={(value) => update({ sort: value === "newest" ? undefined : value })}
            options={[
              ["newest", t("sort.newest")],
              ["oldest", t("sort.oldest")],
              ["price-asc", t("sort.priceAsc")],
              ["price-desc", t("sort.priceDesc")],
              ["mileage-asc", t("sort.mileageAsc")],
              ["mileage-desc", t("sort.mileageDesc")],
            ]}
            compact
          />
          <SelectField
            label={t("discovery.pageSize")}
            value={String(params.pageSize)}
            onChange={(value) => update({ pageSize: value === "8" ? undefined : value })}
            options={[
              ["4", "4"],
              ["8", "8"],
              ["12", "12"],
              ["24", "24"],
            ]}
            compact
          />
          <span className="text-sm font-semibold">
            {t("discovery.results").replace("{count}", formatNumber(result?.total ?? 0, locale))}
          </span>
          {activeFilterCount > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={clear}>
              {t("discovery.clear")}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl surface-card p-5 shadow-card overscroll-contain">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-bold">
                <SlidersHorizontal className="h-4 w-4" />
                {t("discovery.filters")}
              </h2>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clear}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  {t("discovery.clear")}
                </button>
              )}
            </div>
            {filterPanel}
          </div>
        </aside>
        <div>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {query.isLoading ? (
              <VehicleGridSkeleton count={params.pageSize} />
            ) : query.isError ? (
              <QueryErrorState retry={() => void query.refetch()} />
            ) : result && result.items.length > 0 ? (
              result.items.map((vehicle) => <VehicleCard key={vehicle.id} v={vehicle} />)
            ) : (
              <div className="col-span-full rounded-2xl surface-card p-12 text-center shadow-card">
                <h2 className="text-lg font-bold">{emptyTitle}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{emptyDescription}</p>
                <Button onClick={clear} variant="outline" className="mt-5">
                  {t("discovery.clear")}
                </Button>
              </div>
            )}
          </div>
          {result && result.totalPages > 1 && (
            <nav
              className="mt-8 flex items-center justify-center gap-3"
              aria-label={t("discovery.pagination")}
            >
              <Button
                variant="outline"
                disabled={result.page <= 1}
                onClick={() => update({ page: String(result.page - 1) }, false)}
              >
                {t("pagination.previous")}
              </Button>
              <span className="text-sm text-muted-foreground">
                {t("pagination.page")
                  .replace("{page}", formatNumber(result.page, locale))
                  .replace("{total}", formatNumber(result.totalPages, locale))}
              </span>
              <Button
                variant="outline"
                disabled={result.page >= result.totalPages}
                onClick={() => update({ page: String(result.page + 1) }, false)}
              >
                {t("pagination.next")}
              </Button>
            </nav>
          )}
        </div>
      </div>
    </section>
  );
}

function FilterFields({
  params,
  facets,
  lockedSellerType,
  update,
  locale,
}: {
  params: ReturnType<typeof parseDiscoveryParams>;
  facets: {
    makes: string[];
    models: string[];
    years: number[];
    locations: string[];
    priceRange: [number, number];
    mileageRange: [number, number];
  };
  lockedSellerType?: SellerType;
  update: (changes: Record<string, string | undefined>) => void;
  locale: "ar" | "en";
}) {
  const { t } = useI18n();
  const option = (values: Array<string | number>) =>
    values.map((value) => [String(value), String(value)] as [string, string]);
  return (
    <div className="grid gap-4">
      <SelectField
        label={t("form.make")}
        value={params.make ?? ""}
        onChange={(value) => update({ make: value || undefined, model: undefined })}
        options={facets.makes.map((make) => [canonicalMake(make), canonicalMake(make)])}
        allLabel={t("discovery.all")}
      />
      <SelectField
        label={t("form.model")}
        value={params.model ?? ""}
        onChange={(value) => update({ model: value || undefined })}
        options={option(facets.models)}
        allLabel={t("discovery.all")}
      />
      <SelectField
        label={t("form.year")}
        value={params.year ? String(params.year) : ""}
        onChange={(value) => update({ year: value || undefined })}
        options={option(facets.years)}
        allLabel={t("discovery.all")}
      />
      <RangeFilters params={params} facets={facets} update={update} locale={locale} />
      <SelectField
        label={t("vehicle.fuel")}
        value={params.fuel ?? ""}
        onChange={(value) => update({ fuel: value || undefined })}
        options={["gasoline", "diesel", "hybrid", "electric"].map((value) => [
          value,
          t(`fuel.${value}`),
        ])}
        allLabel={t("discovery.all")}
      />
      <SelectField
        label={t("vehicle.transmission")}
        value={params.transmission ?? ""}
        onChange={(value) => update({ transmission: value || undefined })}
        options={["automatic", "manual"].map((value) => [value, t(`transmission.${value}`)])}
        allLabel={t("discovery.all")}
      />
      <SelectField
        label={t("filter.condition")}
        value={params.condition ?? ""}
        onChange={(value) => update({ condition: value || undefined })}
        options={[
          ["new", t("card.new")],
          ["used", t("card.used")],
        ]}
        allLabel={t("discovery.all")}
      />
      {!lockedSellerType && (
        <SelectField
          label={t("filter.sellerType")}
          value={params.sellerType ?? ""}
          onChange={(value) => update({ sellerType: value || undefined })}
          options={[
            ["individual", t("card.byOwner")],
            ["agency", t("card.byAgency")],
          ]}
          allLabel={t("discovery.all")}
        />
      )}
      <SelectField
        label={t("vehicle.location")}
        value={params.location ?? ""}
        onChange={(value) => update({ location: value || undefined })}
        options={option(facets.locations)}
        allLabel={t("discovery.all")}
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  allLabel,
  compact,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[][];
  allLabel?: string;
  compact?: boolean;
}) {
  return (
    <label className={compact ? "block" : "grid gap-1.5 text-xs font-semibold"}>
      <span className={compact ? "sr-only" : undefined}>{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${compact ? "h-11 min-w-36" : "h-10 w-full"} rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
      >
        {allLabel !== undefined && <option value="">{allLabel}</option>}
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function RangeFilters({
  params,
  facets,
  update,
  locale,
}: {
  params: ReturnType<typeof parseDiscoveryParams>;
  facets: { priceRange: [number, number]; mileageRange: [number, number] };
  update: (changes: Record<string, string | undefined>) => void;
  locale: "ar" | "en";
}) {
  const { t } = useI18n();
  const [priceFloor, priceCeiling] = facets.priceRange;
  const [mileageFloor, mileageCeiling] = facets.mileageRange;
  const activePrice: [number, number] = [
    params.priceMin ?? priceFloor,
    params.priceMax ?? priceCeiling,
  ];
  const activeMileage: [number, number] = [
    params.mileageMin ?? mileageFloor,
    params.mileageMax ?? mileageCeiling,
  ];
  const [price, setPrice] = useState(activePrice);
  const [mileage, setMileage] = useState(activeMileage);
  useEffect(
    () => setPrice([params.priceMin ?? priceFloor, params.priceMax ?? priceCeiling]),
    [params.priceMin, params.priceMax, priceFloor, priceCeiling],
  );
  useEffect(
    () => setMileage([params.mileageMin ?? mileageFloor, params.mileageMax ?? mileageCeiling]),
    [params.mileageMin, params.mileageMax, mileageFloor, mileageCeiling],
  );
  const commitPrice = (values: number[]) =>
    update({
      priceMin: values[0] === facets.priceRange[0] ? undefined : String(values[0]),
      priceMax: values[1] === facets.priceRange[1] ? undefined : String(values[1]),
    });
  const commitMileage = (values: number[]) =>
    update({
      mileageMin: values[0] === facets.mileageRange[0] ? undefined : String(values[0]),
      mileageMax: values[1] === facets.mileageRange[1] ? undefined : String(values[1]),
    });
  return (
    <div className="grid gap-5">
      <fieldset className="grid gap-3">
        <div className="flex items-center justify-between gap-2">
          <legend className="text-xs font-semibold">{t("filter.priceRange")}</legend>
          {(params.priceMin !== undefined || params.priceMax !== undefined) && (
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => {
                setPrice(facets.priceRange);
                commitPrice(facets.priceRange);
              }}
            >
              {t("common.clear")}
            </button>
          )}
        </div>
        <div
          className="flex justify-between gap-2 text-xs text-muted-foreground"
          aria-live="polite"
        >
          <span>{formatCurrency(price[0], "EGP", locale)}</span>
          <span>{formatCurrency(price[1], "EGP", locale)}</span>
        </div>
        <Slider
          min={facets.priceRange[0]}
          max={facets.priceRange[1]}
          step={10_000}
          minStepsBetweenThumbs={1}
          value={price}
          onValueChange={(values) => setPrice([values[0], values[1]])}
          onValueCommit={commitPrice}
          thumbLabels={[t("filter.priceMin"), t("filter.priceMax")]}
        />
      </fieldset>
      <fieldset className="grid gap-3">
        <div className="flex items-center justify-between gap-2">
          <legend className="text-xs font-semibold">{t("filter.mileageRange")}</legend>
          {(params.mileageMin !== undefined || params.mileageMax !== undefined) && (
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => {
                setMileage(facets.mileageRange);
                commitMileage(facets.mileageRange);
              }}
            >
              {t("common.clear")}
            </button>
          )}
        </div>
        <div
          className="flex justify-between gap-2 text-xs text-muted-foreground"
          aria-live="polite"
        >
          <span>{formatMileage(mileage[0], locale, t("card.km"))}</span>
          <span>{formatMileage(mileage[1], locale, t("card.km"))}</span>
        </div>
        <Slider
          min={facets.mileageRange[0]}
          max={facets.mileageRange[1]}
          step={1_000}
          minStepsBetweenThumbs={1}
          value={mileage}
          onValueChange={(values) => setMileage([values[0], values[1]])}
          onValueCommit={commitMileage}
          thumbLabels={[t("filter.mileageMin"), t("filter.mileageMax")]}
        />
      </fieldset>
    </div>
  );
}
