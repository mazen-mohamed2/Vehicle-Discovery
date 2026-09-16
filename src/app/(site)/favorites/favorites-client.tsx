"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Heart, Search, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/site/PageHeader";
import { VehicleCard } from "@/components/marketplace/VehicleCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { listingsService } from "@/services/listings.service";
import { queryKeys } from "@/lib/query-keys";
import { QueryErrorState, VehicleGridSkeleton } from "@/components/marketplace/CollectionStates";
import { useFavorites } from "@/hooks/use-favorites";
import { formatDate } from "@/lib/locale";
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

type FavoriteSort = "saved" | "price-asc" | "price-desc" | "year-desc" | "year-asc";

export function FavoritesClient() {
  const { t, locale } = useI18n();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<FavoriteSort>("saved");
  const { favorites, isHydrating, isError, refetch, clearFavorites, isClearing } = useFavorites();
  const listingsQuery = useQuery({
    queryKey: queryKeys.listings.all,
    queryFn: listingsService.list,
    refetchOnMount: "always",
  });
  const items = useMemo(() => {
    const favoriteById = new Map(favorites.map((favorite) => [favorite.listingId, favorite]));
    const term = search.trim().toLocaleLowerCase();
    const selected = (listingsQuery.data ?? []).filter(
      (vehicle) =>
        favoriteById.has(vehicle.id) &&
        (!term ||
          [vehicle.title, vehicle.specs.make, vehicle.specs.model].some((value) =>
            value.toLocaleLowerCase().includes(term),
          )),
    );
    return [...selected].sort((a, b) => {
      if (sort === "price-asc") return a.price - b.price;
      if (sort === "price-desc") return b.price - a.price;
      if (sort === "year-desc") return b.year - a.year;
      if (sort === "year-asc") return a.year - b.year;
      const aDate = Date.parse(favoriteById.get(a.id)?.createdAt ?? "") || 0;
      const bDate = Date.parse(favoriteById.get(b.id)?.createdAt ?? "") || 0;
      return bDate - aDate;
    });
  }, [favorites, listingsQuery.data, search, sort]);
  const favoriteById = useMemo(
    () => new Map(favorites.map((favorite) => [favorite.listingId, favorite])),
    [favorites],
  );

  return (
    <>
      <PageHeader eyebrow={t("eyebrow.saved")} title={t("favorites.title")} />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {!isHydrating && favorites.length > 0 && (
          <div className="mb-6 flex flex-col gap-3 rounded-2xl surface-card p-4 shadow-card sm:flex-row sm:items-end">
            <label className="relative flex-1">
              <span className="sr-only">{t("favorites.search")}</span>
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("favorites.search")}
                className="ps-10"
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold">
              <span>{t("favorites.sort")}</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as FavoriteSort)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {["saved", "price-asc", "price-desc", "year-desc", "year-asc"].map((value) => (
                  <option key={value} value={value}>
                    {t(`favorites.sort.${value}`)}
                  </option>
                ))}
              </select>
            </label>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-destructive">
                  <Trash2 className="me-2 h-4 w-4" />
                  {t("favorites.clear")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("favorites.clear.title")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("favorites.clear.description")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("common.close")}</AlertDialogCancel>
                  <AlertDialogAction disabled={isClearing} onClick={() => clearFavorites()}>
                    {t("favorites.clear.confirm")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
        {isHydrating || listingsQuery.isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <VehicleGridSkeleton />
          </div>
        ) : isError || listingsQuery.isError ? (
          <QueryErrorState
            retry={() => {
              void refetch();
              void listingsQuery.refetch();
            }}
          />
        ) : favorites.length === 0 ? (
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
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
            {t("favorites.noResults")}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((vehicle) => {
              const savedAt = favoriteById.get(vehicle.id)?.createdAt;
              const validDate = savedAt && !Number.isNaN(Date.parse(savedAt));
              return (
                <article key={vehicle.id} className="min-w-0">
                  <VehicleCard v={vehicle} />
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t("favorites.savedDate")}:{" "}
                    {validDate ? formatDate(savedAt, locale) : t("vehicle.notAvailable")}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
