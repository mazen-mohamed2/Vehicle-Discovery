"use client";

import Link from "next/link";
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
  const action = async (name: "accept" | "reject" | "withdraw", id: string) => {
    await workflow.runOfferAction({ action: name, id });
  };
  return (
    <AuthBoundary role={role}>
      <main className="mx-auto min-h-[60vh] max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-black">
          {t(received ? "vehicleOffers.received" : "vehicleOffers.mine")}
        </h1>
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
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {offers.map((offer) => (
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
