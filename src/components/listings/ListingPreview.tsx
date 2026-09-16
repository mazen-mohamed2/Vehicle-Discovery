"use client";
import Image from "next/image";
import Link from "next/link";
import { AuthBoundary } from "@/components/auth/AuthBoundary";
import { Button } from "@/components/ui/button";
import { useManagedListings } from "@/hooks/use-managed-listings";
import { useI18n } from "@/lib/i18n";
import { validateListing } from "@/lib/listing-validators";
import { listingTitle, toPublicVehicle } from "@/lib/listing";
import { listingCategoryRegistry, listingSummary } from "@/lib/marketplace-listing";

export function ListingPreview({ listingId }: { listingId: string }) {
  const { t, locale } = useI18n();
  const { listing, isLoading, isError, error: loadError } = useManagedListings(listingId);
  if (isError)
    return (
      <AuthBoundary>
        <main className="mx-auto max-w-5xl px-4 py-10" role="alert">
          <p>
            {t(
              loadError instanceof Error &&
                "code" in loadError &&
                loadError.code === "LISTING_NOT_FOUND"
                ? "listing.error.notFound"
                : "listing.error.load",
            )}
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/account/listings">{t("listing.backToList")}</Link>
          </Button>
        </main>
      </AuthBoundary>
    );
  if (isLoading || !listing)
    return (
      <AuthBoundary>
        <main role="status" className="mx-auto min-h-[60vh] max-w-5xl px-4 py-10">
          {t("a11y.loading")}
        </main>
      </AuthBoundary>
    );
  const errors = validateListing(listing, true);
  const summary = listingSummary(toPublicVehicle(listing), t, locale);
  return (
    <AuthBoundary>
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-5 rounded-lg border border-primary bg-primary/10 p-4">
          <strong>{t("listing.preview.mode")}</strong>
          <p>{t("listing.preview.private")}</p>
        </div>
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
            {listing.images[0] ? (
              <Image
                src={listing.images[0].url}
                alt={listing.images[0].name}
                fill
                unoptimized={listing.images[0].temporary}
                className="object-cover"
              />
            ) : (
              <div className="grid h-full place-items-center">{t("listing.image.none")}</div>
            )}
          </div>
          <section>
            <p className="text-sm font-bold text-primary">
              {t(listingCategoryRegistry[listing.category].labelKey)} ·{" "}
              {t(`listing.status.${listing.status}`)}
            </p>
            <h1 className="mt-2 text-3xl font-black">
              {listingTitle(listing) || t("listing.untitled")}
            </h1>
            <ul className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
              {summary.map((value) => (
                <li key={value}>{value}</li>
              ))}
            </ul>
            <p className="mt-4 text-2xl font-black">
              {listing.price ?? "—"} {listing.currency}
            </p>
            <p className="mt-5 whitespace-pre-wrap text-muted-foreground">
              {listing.description || t("listing.preview.noDescription")}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button asChild>
                <Link href={`/account/listings/${listing.id}/edit`}>{t("listing.edit")}</Link>
              </Button>
              {Object.keys(errors).length ? (
                <p role="alert" className="w-full text-sm text-destructive">
                  {t("listing.preview.invalid")}
                </p>
              ) : null}
            </div>
          </section>
        </div>
      </main>
    </AuthBoundary>
  );
}
