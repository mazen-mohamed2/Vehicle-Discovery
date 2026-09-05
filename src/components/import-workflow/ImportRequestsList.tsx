"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AuthBoundary } from "@/components/auth/AuthBoundary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useImportWorkflow } from "@/hooks/use-import-workflow";
import { useI18n } from "@/lib/i18n";
import type { DealerImportOfferView, ImportRequestStatus } from "@/lib/import-workflow";
import { formatCurrency, formatDate, formatYear } from "@/lib/locale";

export function ImportRequestsList({ dealer = false }: { dealer?: boolean }) {
  const { t, locale } = useI18n();
  const workflow = useImportWorkflow();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ImportRequestStatus | "ALL">("ALL");
  const source = dealer ? workflow.openRequests : workflow.ownedRequests;
  const offersByRequest = useMemo(
    () => new Map(workflow.dealerOffers.map((offer) => [offer.requestId, offer])),
    [workflow.dealerOffers],
  );
  const ownerOfferCounts = useMemo(() => {
    const counts = new Map<string, number>();
    workflow.ownedOffers.forEach((offer) =>
      counts.set(offer.requestId, (counts.get(offer.requestId) ?? 0) + 1),
    );
    return counts;
  }, [workflow.ownedOffers]);
  const items = source
    .filter((item) => status === "ALL" || item.status === status)
    .filter((item) =>
      `${item.make} ${item.model}`.toLowerCase().includes(search.trim().toLowerCase()),
    );
  const base = dealer ? "/dealer-account/import-requests" : "/account/import-requests";
  return (
    <AuthBoundary role={dealer ? "dealer" : "user"}>
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-primary">
              {t(dealer ? "import.dealer.eyebrow" : "import.owner.eyebrow")}
            </p>
            <h1 className="text-3xl font-black">
              {t(dealer ? "import.opportunities" : "import.myRequests")}
            </h1>
          </div>
          {!dealer && (
            <Button asChild>
              <Link href="/import">{t("import.create.action")}</Link>
            </Button>
          )}
        </header>
        <div className="my-6 grid gap-3 sm:grid-cols-2">
          <Input
            aria-label={t("import.search")}
            placeholder={t("import.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {!dealer && (
            <select
              aria-label={t("import.filter.status")}
              value={status}
              onChange={(e) => setStatus(e.target.value as ImportRequestStatus | "ALL")}
              className="h-10 rounded-md border bg-background px-3"
            >
              <option value="ALL">{t("import.status.ALL")}</option>
              {["OPEN", "OFFER_ACCEPTED", "CANCELLED"].map((value) => (
                <option key={value} value={value}>
                  {t(`import.status.${value}`)}
                </option>
              ))}
            </select>
          )}
        </div>
        {workflow.isLoading ? (
          <p role="status">{t("a11y.loading")}</p>
        ) : workflow.isError ? (
          <p role="alert">{t("import.error.load")}</p>
        ) : items.length === 0 ? (
          <section className="rounded-2xl surface-card p-10 text-center">
            <h2 className="text-xl font-black">
              {t(dealer ? "import.empty.opportunities" : "import.empty.requests")}
            </h2>
          </section>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((item) => (
              <article key={item.id} className="rounded-2xl surface-card p-5 shadow-card">
                <div className="flex justify-between gap-3">
                  <h2 className="font-black">
                    {item.make} {item.model}
                  </h2>
                  <span className="rounded-full bg-secondary px-2 py-1 text-xs">
                    {t(`import.status.${item.status}`)}
                  </span>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">{t("form.year")}</dt>
                    <dd>{formatYear(item.year, locale)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t("form.budget")}</dt>
                    <dd>{formatCurrency(item.budget, item.currency, locale)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t("import.created")}</dt>
                    <dd>{formatDate(item.createdAt, locale)}</dd>
                  </div>
                  {dealer && (
                    <div>
                      <dt className="text-muted-foreground">{t("import.offer.status")}</dt>
                      <dd>
                        {offersByRequest.has(item.id)
                          ? t(`import.offer.${offersByRequest.get(item.id)?.status}`)
                          : t("import.offer.none")}
                      </dd>
                    </div>
                  )}
                  {!dealer && (
                    <div>
                      <dt className="text-muted-foreground">{t("import.offers.title")}</dt>
                      <dd>{ownerOfferCounts.get(item.id) ?? 0}</dd>
                    </div>
                  )}
                </dl>
                <Button asChild size="sm" className="mt-5">
                  <Link href={`${base}/${item.id}`}>{t("import.viewDetails")}</Link>
                </Button>
              </article>
            ))}
          </div>
        )}
        {dealer && (
          <DealerOfferHistory items={workflow.dealerOfferHistory} isLoading={workflow.isLoading} />
        )}
      </main>
    </AuthBoundary>
  );
}

function DealerOfferHistory({
  items,
  isLoading,
}: {
  items: DealerImportOfferView[];
  isLoading: boolean;
}) {
  const { t, locale } = useI18n();
  return (
    <section className="mt-10" aria-labelledby="dealer-offer-history-title">
      <h2 id="dealer-offer-history-title" className="text-2xl font-black">
        {t("import.offer.mine")}
      </h2>
      {isLoading ? null : items.length === 0 ? (
        <p className="mt-4 rounded-2xl surface-card p-8 text-center text-muted-foreground">
          {t("import.empty.dealerOffers")}
        </p>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {items.map(({ offer, request }) => (
            <article key={offer.id} className="rounded-2xl surface-card p-5 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h3 className="font-black">
                  {request.make} {request.model}
                </h3>
                <span className="rounded-full bg-secondary px-2 py-1 text-xs font-semibold">
                  {t(`import.offer.${offer.status}`)}
                </span>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">{t("import.offer.price")}</dt>
                  <dd>{formatCurrency(offer.price, offer.currency, locale)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t("import.offer.currency")}</dt>
                  <dd>{offer.currency}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t("import.updated")}</dt>
                  <dd>{formatDate(offer.updatedAt, locale)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t("import.request.status")}</dt>
                  <dd>{t(`import.status.${request.status}`)}</dd>
                </div>
              </dl>
              {request.status === "OPEN" && (
                <Button asChild size="sm" className="mt-5">
                  <Link href={`/dealer-account/import-requests/${request.id}`}>
                    {t("import.viewDetails")}
                  </Link>
                </Button>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
