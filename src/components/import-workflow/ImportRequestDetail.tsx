"use client";
import { TransactionEntry } from "@/components/transactions/TransactionEntry";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AuthBoundary } from "@/components/auth/AuthBoundary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useImportWorkflow } from "@/hooks/use-import-workflow";
import { useI18n } from "@/lib/i18n";
import { formatCurrency, formatDate, formatYear } from "@/lib/locale";
import { agenciesService } from "@/services/agencies.service";
import { TrustBadge } from "@/components/trust-safety/TrustBadge";
import { trustSafetyService } from "@/services/trust-safety.service";
import { resolveImportDetailState, type ImportOfferRecord } from "@/lib/import-workflow";
import { queryKeys } from "@/lib/query-keys";

export function ImportRequestDetail({ id, dealer = false }: { id: string; dealer?: boolean }) {
  const { t, locale } = useI18n();
  const workflow = useImportWorkflow(id);
  const request = workflow.request;
  const detailState = resolveImportDetailState({
    isLoading: workflow.isLoading,
    request,
    error: workflow.error,
  });
  const action = async (name: "cancel" | "accept" | "reject" | "withdraw", offerId?: string) => {
    try {
      await workflow.runAction({ name, id, offerId });
      toast.success(t("import.success.updated"));
    } catch {
      toast.error(t("import.error.action"));
    }
  };
  if (detailState === "loading")
    return (
      <AuthBoundary role={dealer ? "dealer" : "user"}>
        <main className="mx-auto min-h-[60vh] max-w-5xl px-4 py-10" role="status">
          {t("a11y.loading")}
        </main>
      </AuthBoundary>
    );
  if (detailState !== "ready" || !request) {
    const title =
      detailState === "forbidden"
        ? t("import.accessDenied")
        : detailState === "not-found"
          ? t("import.requestNotFound")
          : t("import.error.load");
    return (
      <AuthBoundary role={dealer ? "dealer" : "user"}>
        <main className="mx-auto grid min-h-[60vh] place-items-center px-4 text-center">
          <div>
            <h1 className="text-2xl font-black">{title}</h1>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link
                  href={dealer ? "/dealer-account/import-requests" : "/account/import-requests"}
                >
                  {t("import.back")}
                </Link>
              </Button>
              {detailState === "forbidden" && (
                <Button asChild variant="outline">
                  <Link href={dealer ? "/dealer-account" : "/account"}>
                    {t("import.goToAccount")}
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </main>
      </AuthBoundary>
    );
  }
  return (
    <AuthBoundary role={dealer ? "dealer" : "user"}>
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <header className="flex flex-wrap justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-primary">{t(`import.status.${request.status}`)}</p>
            <h1 className="text-3xl font-black">
              {request.make} {request.model}
            </h1>
          </div>
          <Button asChild variant="outline">
            <Link href={dealer ? "/dealer-account/import-requests" : "/account/import-requests"}>
              {t("import.back")}
            </Link>
          </Button>
        </header>
        <section className="mt-6 rounded-2xl surface-card p-6 shadow-card">
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Fact label={t("import.make")} value={request.make} />
            <Fact label={t("import.model")} value={request.model} />
            <Fact label={t("form.year")} value={formatYear(request.year, locale)} />
            <Fact
              label={t("form.budget")}
              value={formatCurrency(request.budget, request.currency, locale)}
            />
            <Fact label={t("import.created")} value={formatDate(request.createdAt, locale)} />
            <Fact label={t("import.updated")} value={formatDate(request.updatedAt, locale)} />
            <Fact label={t("import.request.status")} value={t(`import.status.${request.status}`)} />
          </dl>
          {request.preferences && (
            <div className="mt-5">
              <h2 className="font-bold">{t("import.preferences")}</h2>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                {request.preferences}
              </p>
            </div>
          )}
          {request.status === "OFFER_ACCEPTED" && (
            <p className="mt-5 rounded-lg bg-primary/10 p-4 text-sm">
              {t("import.accepted.backendBoundary")}
            </p>
          )}
          {!dealer && request.status === "OPEN" && (
            <Confirm
              label={t("import.cancel")}
              title={t("import.cancel.title")}
              description={t("import.cancel.description")}
              onConfirm={() => void action("cancel")}
            />
          )}
        </section>
        {dealer ? (
          <DealerOfferForm
            requestId={id}
            requestStatus={request.status}
            existing={workflow.dealerOffers.find((offer) => offer.requestId === id)}
            onWithdraw={(offerId) => void action("withdraw", offerId)}
          />
        ) : (
          <section className="mt-8">
            <h2 className="text-2xl font-black">{t("import.offers.title")}</h2>
            {workflow.offers.length === 0 ? (
              <p className="mt-4 rounded-2xl surface-card p-8 text-center text-muted-foreground">
                {t("import.empty.offers")}
              </p>
            ) : (
              <div className="mt-4 grid gap-4">
                {workflow.offers.map((offer) => (
                  <OwnerOffer
                    key={offer.id}
                    offer={offer}
                    canAct={request.status === "OPEN"}
                    onAccept={() => void action("accept", offer.id)}
                    onReject={() => void action("reject", offer.id)}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </AuthBoundary>
  );
}
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-bold">{value}</dd>
    </div>
  );
}
function Confirm({
  label,
  title,
  description,
  onConfirm,
}: {
  label: string;
  title: string;
  description: string;
  onConfirm: () => void;
}) {
  const { t } = useI18n();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="mt-5 text-destructive">
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.close")}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{label}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
function OwnerOffer({
  offer,
  canAct,
  onAccept,
  onReject,
}: {
  offer: ImportOfferRecord;
  canAct: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  const { t, locale } = useI18n();
  const dealer = useQuery({
    queryKey: queryKeys.agencies.detail(offer.dealerId ?? "missing"),
    queryFn: () => (offer.dealerId ? agenciesService.byId(offer.dealerId) : Promise.resolve(null)),
  });
  return (
    <article className="rounded-2xl surface-card p-5 shadow-card">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h3 className="font-black">{dealer.data?.name ?? t("import.offer.dealer")}</h3>
          {dealer.data && (
            <p className="text-sm text-muted-foreground">
              {dealer.data.rating}{" "}
              <TrustBadge status={trustSafetyService.publicStatus("DEALER", dealer.data.id)} />
            </p>
          )}
        </div>
        <span className="rounded-full bg-secondary px-2 py-1 text-xs">
          {t(`import.offer.${offer.status}`)}
        </span>
      </div>
      <p className="mt-4 text-xl font-black">
        {formatCurrency(offer.price, offer.currency, locale)}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("import.offer.currency")}: {offer.currency}
      </p>
      <p className="mt-2 text-sm">
        {t("import.offer.delivery")}: {offer.estimatedDelivery}
      </p>
      {offer.notes && <p className="mt-2 text-sm text-muted-foreground">{offer.notes}</p>}
      {offer.status === "ACCEPTED" && (
        <TransactionEntry
          source={{ type: "IMPORT_OFFER", offerId: offer.id, importRequestId: offer.requestId }}
          canStart
        />
      )}
      {canAct && offer.status === "PENDING" && (
        <div className="mt-4 flex gap-2">
          <Confirm
            label={t("import.offer.accept")}
            title={t("import.offer.accept.title")}
            description={t("import.offer.accept.description")}
            onConfirm={onAccept}
          />
          <Button variant="outline" className="mt-5" onClick={onReject}>
            {t("import.offer.reject")}
          </Button>
        </div>
      )}
    </article>
  );
}
function DealerOfferForm({
  requestId,
  requestStatus,
  existing,
  onWithdraw,
}: {
  requestId: string;
  requestStatus: "OPEN" | "OFFER_ACCEPTED" | "CANCELLED";
  existing?: ImportOfferRecord;
  onWithdraw: (id: string) => void;
}) {
  const { t, locale } = useI18n();
  const workflow = useImportWorkflow(requestId);
  const [value, setValue] = useState({ price: "", delivery: "", notes: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await workflow.submitOffer({
        id: requestId,
        input: {
          price: Number(value.price),
          currency: "EGP",
          estimatedDelivery: value.delivery,
          notes: value.notes,
        },
      });
      toast.success(t("import.offer.success"));
    } catch (error) {
      if (error && typeof error === "object" && "fields" in error)
        setErrors(error.fields as Record<string, string>);
      else toast.error(t("import.offer.duplicate"));
    }
  };
  if (existing)
    return (
      <section className="mt-8 rounded-2xl surface-card p-6">
        <h2 className="text-xl font-black">{t("import.offer.yours")}</h2>
        <p className="mt-2">{t(`import.offer.${existing.status}`)}</p>
        <p className="mt-2 font-bold">
          {formatCurrency(existing.price, existing.currency, locale)}
        </p>
        <p className="text-sm text-muted-foreground">
          {t("import.offer.currency")}: {existing.currency}
        </p>
        {existing.status === "PENDING" && (
          <Button
            variant="outline"
            className="mt-4 text-destructive"
            onClick={() => onWithdraw(existing.id)}
          >
            {t("import.offer.withdraw")}
          </Button>
        )}
      </section>
    );
  if (requestStatus !== "OPEN") return null;
  return (
    <section className="mt-8 rounded-2xl surface-card p-6">
      <h2 className="text-xl font-black">{t("import.offer.submit")}</h2>
      <form className="mt-5 grid gap-4" onSubmit={submit}>
        <Label>
          {t("import.offer.price")}
          <Input
            type="number"
            min="1"
            value={value.price}
            aria-invalid={Boolean(errors.price)}
            aria-describedby={errors.price ? "offer-price-error" : undefined}
            onChange={(e) => setValue({ ...value, price: e.target.value })}
          />
          {errors.price && (
            <span id="offer-price-error" className="text-sm text-destructive">
              {t(`import.validation.${errors.price}`)}
            </span>
          )}
        </Label>
        <Label>
          {t("import.offer.currency")}
          <select
            value="EGP"
            disabled
            className="mt-1 h-10 w-full rounded-md border bg-muted px-3 text-sm"
          >
            <option value="EGP">EGP</option>
          </select>
        </Label>
        <Label>
          {t("import.offer.delivery")}
          <Input
            value={value.delivery}
            aria-invalid={Boolean(errors.estimatedDelivery)}
            aria-describedby={errors.estimatedDelivery ? "offer-delivery-error" : undefined}
            onChange={(e) => setValue({ ...value, delivery: e.target.value })}
          />
          {errors.estimatedDelivery && (
            <span id="offer-delivery-error" className="text-sm text-destructive">
              {t(`import.validation.${errors.estimatedDelivery}`)}
            </span>
          )}
        </Label>
        <Label>
          {t("import.offer.notes")}
          <Textarea
            value={value.notes}
            onChange={(e) => setValue({ ...value, notes: e.target.value })}
          />
        </Label>
        <Button disabled={workflow.isPending}>
          {workflow.isPending ? t("import.offer.submitting") : t("import.offer.submit")}
        </Button>
      </form>
    </section>
  );
}
