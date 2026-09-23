"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AuthBoundary } from "@/components/auth/AuthBoundary";
import { Button } from "@/components/ui/button";
import { useTransactions } from "@/hooks/use-transactions";
import { useI18n } from "@/lib/i18n";
import { formatDate } from "@/lib/locale";
import {
  formatTransactionAmount,
  transactionBase,
  transactionErrorKey,
  type MarketplaceTransaction,
  type TransactionActor,
} from "@/lib/marketplace-transaction";
import { developmentPublicProfile } from "@/services/auth.service";
import { ListingContext } from "@/components/marketplace/ListingContext";
import { transactionContext } from "@/services/transaction-context.service";
import { queryKeys } from "@/lib/query-keys";

function Person({ id }: { id: string }) {
  const profile = developmentPublicProfile(id);
  return (
    <span className="break-words">
      {profile?.displayName && <span className="block">{profile.displayName}</span>}
      <bdi className="break-all text-sm text-muted-foreground">{id}</bdi>
    </span>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words font-semibold">{children}</dd>
    </div>
  );
}
function Summary({ record }: { record: MarketplaceTransaction }) {
  const { t, locale } = useI18n();
  return (
    <>
      <p className="text-sm text-muted-foreground">
        {t(`transactions.source.${record.source.type}`)} ·{" "}
        {t(`category.${record.snapshot.category}`)}
      </p>
      <h2 className="mt-2 break-words text-xl font-black">{record.snapshot.title}</h2>
      <p className="mt-3 text-sm font-bold">{t(`transactions.status.${record.status}`)}</p>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label={t("transactions.amount")}>
          <span className="text-xl">
            {formatTransactionAmount(record.agreedAmount, record.currency, locale)}
          </span>
        </Field>
        <Field label={t("transactions.currency")}>{record.currency}</Field>
        <Field label={t("transactions.created")}>{formatDate(record.createdAt, locale)}</Field>
      </dl>
    </>
  );
}
export function Transactions({ role, id }: { role: "user" | "dealer"; id?: string }) {
  const workflow = useTransactions(id);
  const { t } = useI18n();
  const query = id ? workflow.detail : workflow.list;
  const loading = workflow.auth.isHydrating || query.isPending;
  const base = transactionBase(role);
  return (
    <AuthBoundary role={role}>
      <main className="mx-auto min-h-[60vh] max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-black">
          {t(id ? "transactions.detail" : "transactions.mine")}
        </h1>
        <p className="mt-4 rounded-xl bg-secondary p-4 text-sm text-muted-foreground">
          {t("transactions.boundary")}
        </p>
        {id && (
          <Button asChild variant="outline" className="mt-4">
            <Link href={base}>{t("transactions.back")}</Link>
          </Button>
        )}
        {loading ? (
          <p role="status" className="mt-6">
            {t("a11y.loading")}
          </p>
        ) : query.isError ? (
          <p role="alert" className="mt-6">
            {t(transactionErrorKey(query.error))}
          </p>
        ) : id && workflow.detail.data && workflow.actor ? (
          <TransactionDetail record={workflow.detail.data} actor={workflow.actor} />
        ) : (
          !id && (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {!workflow.list.data?.length && (
                <section className="rounded-2xl surface-card p-6 md:col-span-2">
                  <h2 className="text-xl font-black">{t("transactions.empty")}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t("transactions.emptyDescription")}
                  </p>
                </section>
              )}
              {workflow.list.data?.map((record) => {
                const buyer = workflow.actor?.id === record.buyerParticipantId;
                return (
                  <article
                    key={record.id}
                    className="min-w-0 rounded-2xl surface-card p-5 shadow-card"
                  >
                    <Summary record={record} />
                    <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                      <Field label={t("transactions.role")}>
                        {t(
                          buyer
                            ? "transactions.buyer"
                            : role === "dealer"
                              ? "transactions.dealer"
                              : "transactions.seller",
                        )}
                      </Field>
                      <Field label={t("transactions.counterpart")}>
                        <Person
                          id={buyer ? record.sellerParticipantId : record.buyerParticipantId}
                        />
                      </Field>
                    </dl>
                    <Button asChild size="sm" className="mt-5">
                      <Link href={`${base}/${record.id}`}>{t("transactions.view")}</Link>
                    </Button>
                  </article>
                );
              })}
            </div>
          )
        )}
      </main>
    </AuthBoundary>
  );
}
function SourceContext({
  record,
  actor,
}: {
  record: MarketplaceTransaction;
  actor: TransactionActor;
}) {
  const { t } = useI18n();
  const source = record.source;
  // Presentation resolves separately: never gates or rewrites the agreement.
  const context = useQuery({
    queryKey: [...queryKeys.transactions.detail(actor.scope, record.id), "source-context"],
    retry: false,
    queryFn: () => transactionContext(record, actor),
  });
  return (
    <section className="rounded-2xl surface-card p-5">
      <h2 className="text-xl font-black">{t("transactions.source")}</h2>
      {context.data?.type === "LISTING_OFFER" && (
        <div className="mt-4">
          <ListingContext
            listingId={context.data.listing.listingId}
            resolvedContext={context.data.listing}
            showPrice={false}
          />
          {!context.data.listing.available && (
            <p className="mt-2 break-words font-semibold">
              {record.snapshot.title} · {t(`category.single.${record.snapshot.category}`)}
            </p>
          )}
        </div>
      )}
      {source.type === "IMPORT_OFFER" && (
        <div className="mt-4 space-y-2">
          <h3 className="break-words font-bold">
            {context.data?.type === "IMPORT_OFFER" ? context.data.title : record.snapshot.title}
          </h3>
          <p className="text-sm">
            {t("transactions.dealer")}: <Person id={record.sellerParticipantId} />
          </p>
        </div>
      )}
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label={t("transactions.sourceId")}>
          <bdi className="break-all">
            {source.type === "LISTING_OFFER" ? source.listingId : source.importRequestId}
          </bdi>
        </Field>
        <Field label={t("transactions.offerId")}>
          <bdi className="break-all">{source.offerId}</bdi>
        </Field>
      </dl>
      {context.isPending ? (
        <p role="status" className="mt-4 text-sm">
          {t("a11y.loading")}
        </p>
      ) : context.isError ? (
        <p className="mt-4 text-sm">{t("transactions.contextError")}</p>
      ) : context.data?.type === "IMPORT_OFFER" && context.data.href ? (
        <Button asChild size="sm" variant="outline" className="mt-4">
          <Link href={context.data.href}>{t("transactions.viewImport")}</Link>
        </Button>
      ) : context.data?.type === "LISTING_OFFER" && context.data.listing.available ? null : (
        <p className="mt-4 text-sm text-muted-foreground">
          {t(
            source.type === "LISTING_OFFER"
              ? "transactions.listingUnavailable"
              : "transactions.importUnavailable",
          )}
        </p>
      )}
    </section>
  );
}
function TransactionDetail({
  record,
  actor,
}: {
  record: MarketplaceTransaction;
  actor: TransactionActor;
}) {
  const { t, locale } = useI18n();
  const seller = developmentPublicProfile(record.sellerParticipantId);
  return (
    <div className="mt-6 space-y-4">
      <section className="rounded-2xl surface-card p-5">
        <Summary record={record} />
        <dl className="mt-4">
          <Field label={t("transactions.id")}>
            <bdi className="break-all">{record.id}</bdi>
          </Field>
        </dl>
      </section>
      <SourceContext record={record} actor={actor} />
      <section className="rounded-2xl surface-card p-5">
        <h2 className="text-xl font-black">{t("transactions.participants")}</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label={t("transactions.buyer")}>
            <Person id={record.buyerParticipantId} />
          </Field>
          <Field
            label={t(
              record.source.type === "IMPORT_OFFER" || seller?.role === "dealer"
                ? "transactions.dealer"
                : "transactions.seller",
            )}
          >
            <Person id={record.sellerParticipantId} />
          </Field>
        </dl>
      </section>
      <section className="rounded-2xl surface-card p-5">
        <h2 className="text-xl font-black">{t("transactions.agreement")}</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label={t("transactions.amount")}>
            {formatTransactionAmount(record.agreedAmount, record.currency, locale)}
          </Field>
          <Field label={t("transactions.currency")}>{record.currency}</Field>
        </dl>
      </section>
      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-2xl surface-card p-5">
          <h2 className="text-xl font-black">{t("transactions.payment")}</h2>
          <p className="mt-2">{t(`transactions.payment.${record.payment.status}`)}</p>
        </section>
        <section className="rounded-2xl surface-card p-5">
          <h2 className="text-xl font-black">{t("transactions.escrow")}</h2>
          <p className="mt-2">{t(`transactions.escrow.${record.escrow.status}`)}</p>
        </section>
      </div>
      <section className="rounded-2xl surface-card p-5">
        <h2 className="text-xl font-black">{t("transactions.timeline")}</h2>
        <ol className="mt-3">
          <li>
            {t("transactions.created")} —{" "}
            <time dateTime={record.createdAt}>{formatDate(record.createdAt, locale)}</time>
          </li>
        </ol>
      </section>
    </div>
  );
}
