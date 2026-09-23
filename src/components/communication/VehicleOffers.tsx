"use client";

import Link from "next/link";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { defaultOfferFilters, presentOffers, type OfferFilters } from "@/lib/offer-presentation";
import { listingContextService } from "@/services/listing-context.service";
import { TransactionEntry } from "@/components/transactions/TransactionEntry";
import { AuthBoundary } from "@/components/auth/AuthBoundary";
import { Button } from "@/components/ui/button";
import { useMarketplaceCommunication } from "@/hooks/use-marketplace-communication";
import { useI18n } from "@/lib/i18n";
import { formatCurrency, formatDate } from "@/lib/locale";
import { developmentPublicProfile } from "@/services/auth.service";
import type { VehicleOfferRecord } from "@/lib/communication";
import { ListingContext } from "@/components/marketplace/ListingContext";

export function VehicleOffers({
  received = false,
  role = "user",
}: {
  received?: boolean;
  role?: "user" | "dealer";
}) {
  const { t, locale } = useI18n();
  const workflow = useMarketplaceCommunication();
  const offers = received ? workflow.receivedOffers : workflow.buyerOffers;
  const [filters, setFilters] = useState<OfferFilters>(defaultOfferFilters);
  const contexts = new Map(
    offers.map((offer) => {
      try {
        return [offer.listingId, listingContextService.resolve(offer.listingId)] as const;
      } catch {
        return [offer.listingId, { listingId: offer.listingId, available: false }] as const;
      }
    }),
  );
  const visible = presentOffers(offers, filters, contexts);
  const action = async (name: "accept" | "reject" | "withdraw", id: string) => {
    await workflow.runOfferAction({ action: name, id });
  };
  return (
    <AuthBoundary role={role}>
      <main className="mx-auto min-h-[60vh] max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-black">
          {t(received ? "vehicleOffers.received" : "vehicleOffers.mine")}
        </h1>
        <section
          aria-label={t("offers.controls")}
          className="mt-5 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <label className="min-w-0 text-sm font-semibold">
            {t("offers.search")}
            <Input
              value={filters.search}
              onChange={(event) => setFilters({ ...filters, search: event.target.value })}
            />
          </label>
          <OfferSelect
            label={t("offers.status")}
            value={filters.status}
            onChange={(status) => setFilters({ ...filters, status })}
            options={["ALL", "PENDING", "ACCEPTED", "REJECTED", "WITHDRAWN"].map((value) => ({
              value,
              label: t(value === "ALL" ? "offers.all" : `vehicleOffers.status.${value}`),
            }))}
          />
          <OfferSelect
            label={t("offers.category")}
            value={filters.category}
            onChange={(category) => setFilters({ ...filters, category })}
            options={["ALL", "CAR", "MOTORCYCLE", "BOAT"].map((value) => ({
              value,
              label: t(value === "ALL" ? "offers.all" : `category.single.${value}`),
            }))}
          />
          <OfferSelect
            label={t("offers.sort")}
            value={filters.sort}
            onChange={(sort) => setFilters({ ...filters, sort })}
            options={["newest", "oldest", "amountHigh", "amountLow"].map((value) => ({
              value,
              label: t(`offers.${value}`),
            }))}
          />
          <Button variant="outline" size="sm" onClick={() => setFilters(defaultOfferFilters)}>
            {t("offers.reset")}
          </Button>
          {(filters.sort === "amountHigh" || filters.sort === "amountLow") && (
            <p className="text-xs text-muted-foreground sm:col-span-2">
              {t("offers.currencySort")}
            </p>
          )}
        </section>
        {workflow.isLoading ? (
          <p className="mt-6" role="status">
            {t("a11y.loading")}
          </p>
        ) : workflow.isError ? (
          <p className="mt-6" role="alert">
            {t("vehicleOffers.error")}
          </p>
        ) : offers.length === 0 ? (
          <section className="mt-6 rounded-2xl surface-card p-10 text-center">
            <h2 className="text-xl font-black">
              {t(received ? "vehicleOffers.emptyReceived" : "vehicleOffers.emptyMine")}
            </h2>
          </section>
        ) : visible.length === 0 ? (
          <p role="status" className="mt-6 rounded-2xl surface-card p-6">
            {t("offers.noMatches")}
          </p>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {visible.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                received={received}
                pending={workflow.isPending}
                onAction={action}
              />
            ))}
          </div>
        )}
      </main>
    </AuthBoundary>
  );
}

function OfferSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: string; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <label className="min-w-0 text-sm font-semibold">
      {label}
      <select
        className="mt-1 h-10 w-full min-w-0 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function OfferCard({
  offer,
  received,
  pending,
  onAction,
}: {
  offer: VehicleOfferRecord;
  received: boolean;
  pending: boolean;
  onAction: (action: "accept" | "reject" | "withdraw", id: string) => Promise<void>;
}) {
  const { t, locale } = useI18n();
  const counterpart = developmentPublicProfile(received ? offer.buyerUserId : offer.sellerUserId);
  return (
    <article className="rounded-2xl surface-card p-5 shadow-card">
      <ListingContext listingId={offer.listingId} />
      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground">
            {t(received ? "vehicleOffers.buyer" : "vehicleOffers.seller")}
          </h2>
          {counterpart ? (
            <Link
              className="text-sm text-muted-foreground hover:text-primary hover:underline"
              href={
                counterpart.role === "dealer" && counterpart.dealerId
                  ? `/dealers/${counterpart.dealerId}`
                  : `/sellers/${counterpart.id}`
              }
            >
              {counterpart.displayName}
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t(received ? "vehicleOffers.buyer" : "vehicleOffers.seller")}
            </p>
          )}
        </div>
        <span className="rounded-full bg-secondary px-2 py-1 text-xs font-semibold">
          {t(`vehicleOffers.status.${offer.status}`)}
        </span>
      </div>
      <p className="mt-4 text-xl font-black">
        {formatCurrency(offer.amount, offer.currency, locale)}
      </p>
      <p className="text-sm text-muted-foreground">
        {t("vehicleOffers.currency")}: {offer.currency}
      </p>
      {offer.note && <p className="mt-3 whitespace-pre-wrap text-sm">{offer.note}</p>}
      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div>
          <dt className="text-muted-foreground">{t("import.created")}</dt>
          <dd>{formatDate(offer.createdAt, locale)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("import.updated")}</dt>
          <dd>{formatDate(offer.updatedAt, locale)}</dd>
        </div>
      </dl>
      {offer.status === "ACCEPTED" && (
        <TransactionEntry
          source={{ type: "LISTING_OFFER", offerId: offer.id, listingId: offer.listingId }}
          canStart={!received}
        />
      )}
      {offer.status === "PENDING" && (
        <div className="mt-5 flex flex-wrap gap-2">
          {received ? (
            <>
              <Button
                size="sm"
                disabled={pending}
                onClick={() => void onAction("accept", offer.id)}
              >
                {t("vehicleOffers.accept")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => void onAction("reject", offer.id)}
              >
                {t("vehicleOffers.reject")}
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => void onAction("withdraw", offer.id)}
            >
              {t("vehicleOffers.withdraw")}
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
