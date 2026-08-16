"use client";
import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { AuthBoundary } from "@/components/auth/AuthBoundary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useManagedListings } from "@/hooks/use-managed-listings";
import { useI18n } from "@/lib/i18n";
import type { ListingStatus } from "@/lib/listing";

export function MyListings() {
  const { t, locale } = useI18n();
  const data = useManagedListings();
  const [status, setStatus] = useState<ListingStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("updated");
  const listings = useMemo(
    () =>
      data.listings
        .filter((item) => status === "all" || item.status === status)
        .filter((item) =>
          `${item.make} ${item.model} ${item.trim}`.toLowerCase().includes(search.toLowerCase()),
        )
        .sort((a, b) =>
          sort === "created"
            ? b.createdAt.localeCompare(a.createdAt)
            : sort === "price"
              ? (b.price ?? 0) - (a.price ?? 0)
              : b.updatedAt.localeCompare(a.updatedAt),
        ),
    [data.listings, search, sort, status],
  );
  const action = async (
    name: "duplicate" | "sold" | "archive" | "restore" | "delete",
    id: string,
  ) => {
    if (
      (name === "delete" || name === "sold" || name === "archive") &&
      !window.confirm(t(`listing.confirm.${name}`))
    )
      return;
    try {
      await data.runAction({ name, listingId: id });
      toast.success(t("listing.success.action"));
    } catch {
      toast.error(t("listing.error.action"));
    }
  };
  return (
    <AuthBoundary>
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-primary">{t("listing.mine.eyebrow")}</p>
            <h1 className="text-3xl font-black">{t("listing.mine.title")}</h1>
          </div>
          <Button asChild>
            <Link href="/account/listings/new">{t("listing.create")}</Link>
          </Button>
        </header>
        <div className="my-6 grid gap-3 sm:grid-cols-3">
          <Input
            aria-label={t("listing.search")}
            placeholder={t("listing.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            aria-label={t("listing.filter.status")}
            value={status}
            onChange={(e) => setStatus(e.target.value as ListingStatus | "all")}
            className="h-10 rounded-md border bg-background px-3"
          >
            <option value="all">{t("listing.status.all")}</option>
            {["draft", "published", "sold", "archived"].map((value) => (
              <option key={value} value={value}>
                {t(`listing.status.${value}`)}
              </option>
            ))}
          </select>
          <select
            aria-label={t("listing.sort")}
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="h-10 rounded-md border bg-background px-3"
          >
            <option value="updated">{t("listing.sort.updated")}</option>
            <option value="created">{t("listing.sort.created")}</option>
            <option value="price">{t("listing.sort.price")}</option>
          </select>
        </div>
        {data.isLoading ? (
          <p role="status">{t("a11y.loading")}</p>
        ) : data.isError ? (
          <p role="alert">{t("listing.error.load")}</p>
        ) : !listings.length ? (
          <section className="rounded-2xl surface-card p-10 text-center">
            <h2 className="text-xl font-black">{t("listing.empty.title")}</h2>
            <p className="mt-2 text-muted-foreground">{t("listing.empty.description")}</p>
          </section>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {listings.map((listing) => (
              <article
                key={listing.id}
                className="overflow-hidden rounded-2xl surface-card shadow-card"
              >
                <div className="grid sm:grid-cols-[180px_1fr]">
                  {listing.images[0] ? (
                    <div className="relative min-h-40">
                      <Image
                        src={listing.images[0].url}
                        alt={listing.images[0].name}
                        fill
                        unoptimized={listing.images[0].temporary}
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="grid min-h-40 place-items-center bg-muted text-muted-foreground">
                      {t("listing.image.none")}
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex justify-between gap-3">
                      <h2 className="font-black">
                        {listing.make || t("listing.untitled")} {listing.model}
                      </h2>
                      <span className="rounded-full bg-secondary px-2 py-1 text-xs">
                        {t(`listing.status.${listing.status}`)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {t("listing.updated")}:{" "}
                      {new Intl.DateTimeFormat(locale).format(new Date(listing.updatedAt))}
                    </p>
                    <p className="mt-1 font-bold">
                      {listing.price ? new Intl.NumberFormat(locale).format(listing.price) : "—"}{" "}
                      {listing.currency}
                    </p>
                    {listing.status === "draft" && (
                      <p className="mt-1 text-sm">
                        {t("listing.completion")}: {listing.completionPercentage}%
                      </p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {listing.status === "draft" && (
                        <Button size="sm" asChild>
                          <Link href={`/account/listings/${listing.id}/edit`}>
                            {t("listing.continue")}
                          </Link>
                        </Button>
                      )}
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/account/listings/${listing.id}/preview`}>
                          {t("listing.preview")}
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void action("duplicate", listing.id)}
                      >
                        {t("listing.duplicate")}
                      </Button>
                      {listing.status === "published" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void action("sold", listing.id)}
                          >
                            {t("listing.sold")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void action("archive", listing.id)}
                          >
                            {t("listing.archive")}
                          </Button>
                        </>
                      )}
                      {listing.status === "sold" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void action("archive", listing.id)}
                        >
                          {t("listing.archive")}
                        </Button>
                      )}
                      {listing.status === "archived" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void action("restore", listing.id)}
                        >
                          {t("listing.restore")}
                        </Button>
                      )}
                      {(["draft", "archived"] as ListingStatus[]).includes(listing.status) && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => void action("delete", listing.id)}
                        >
                          {t("listing.delete")}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </AuthBoundary>
  );
}
