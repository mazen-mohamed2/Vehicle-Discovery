"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Flag, ShieldBan } from "lucide-react";
import { AuthBoundary } from "@/components/auth/AuthBoundary";
import { Button } from "@/components/ui/button";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { useMarketplaceCommunication } from "@/hooks/use-marketplace-communication";
import { communicationDetailState, CommunicationError } from "@/lib/communication";
import { useI18n } from "@/lib/i18n";
import { formatDate } from "@/lib/locale";
import { developmentPublicProfile } from "@/services/auth.service";
import { ReportDialog } from "@/components/trust-safety/ReportDialog";
import { ListingContext } from "@/components/marketplace/ListingContext";

export function ConversationDetail({ id }: { id: string }) {
  const { t, locale } = useI18n();
  const workflow = useMarketplaceCommunication(id);
  const [body, setBody] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const state = communicationDetailState({
    isLoading: workflow.isLoading,
    value: workflow.conversation,
    error: workflow.error,
  });
  const counterpartId = workflow.conversation?.participantUserIds.find(
    (participantId) => participantId !== workflow.actor?.id,
  );
  const counterpart = counterpartId ? developmentPublicProfile(counterpartId) : null;
  const initials = counterpart?.displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  useEffect(() => {
    if (state === "ready") void workflow.markRead(id);
    // Mark once when the authorized detail resolves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, state]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (workflow.isPending) return;
    setFieldError("");
    try {
      await workflow.sendMessage({ id, body });
      setBody("");
    } catch (error) {
      setFieldError(
        error instanceof CommunicationError && error.fields.body === "required"
          ? t("messages.validation.required")
          : t("messages.validation.invalid"),
      );
    }
  };
  return (
    <AuthBoundary>
      <main className="mx-auto min-h-[60vh] max-w-4xl px-4 py-10 sm:px-6">
        {state === "loading" ? (
          <p role="status">{t("a11y.loading")}</p>
        ) : state !== "ready" || !workflow.conversation ? (
          <section className="rounded-2xl surface-card p-10 text-center">
            <h1 className="text-2xl font-black">
              {t(
                state === "forbidden"
                  ? "messages.forbidden"
                  : state === "not-found"
                    ? "messages.notFound"
                    : "messages.error",
              )}
            </h1>
            <Button asChild className="mt-5">
              <Link href="/messages">{t("messages.back")}</Link>
            </Button>
          </section>
        ) : (
          <>
            <header className="flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm text-primary">{t("messages.vehicleContext")}</p>
                <h1 className="line-clamp-2 break-words text-2xl font-black leading-tight sm:text-3xl">
                  {t("messages.conversation")}
                </h1>
              </div>
              <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                <Link href="/messages">{t("messages.back")}</Link>
              </Button>
            </header>
            <section className="mt-5" aria-label={t("listing.context.label")}>
              <ListingContext listingId={workflow.conversation.listingId} />
            </section>
            <section
              className="mt-5 rounded-2xl surface-card p-4"
              aria-label={t("messages.counterpart")}
            >
              <div className="flex min-w-0 items-center gap-3">
                <Avatar className="h-12 w-12 shrink-0">
                  {counterpart?.avatarUrl && <AvatarImage src={counterpart.avatarUrl} alt="" />}
                  <AvatarFallback aria-hidden="true">{initials || "?"}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="break-words font-bold">
                    {counterpart?.displayName ?? t("messages.participant")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      counterpart?.role === "dealer"
                        ? "messages.participant.dealer"
                        : "messages.participant.individual",
                    )}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-2 min-[390px]:grid-cols-3 sm:flex sm:flex-wrap sm:justify-end">
                {counterpart && (
                  <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                    <Link
                      href={
                        counterpart.role === "dealer" && counterpart.dealerId
                          ? `/dealers/${counterpart.dealerId}`
                          : `/sellers/${counterpart.id}`
                      }
                    >
                      {t(
                        counterpart.role === "dealer"
                          ? "vehicle.dealerProfile"
                          : "seller.viewProfile",
                      )}
                    </Link>
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => setReportOpen(true)}
                >
                  <Flag className="me-1 h-4 w-4" />
                  {t("safety.report.title")}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto">
                      <ShieldBan className="me-1 h-4 w-4" />
                      {t(workflow.blockState.blockedByMe ? "safety.unblock" : "safety.block")}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {t(
                          workflow.blockState.blockedByMe
                            ? "safety.unblock.confirmTitle"
                            : "safety.block.confirmTitle",
                        )}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {t(
                          workflow.blockState.blockedByMe
                            ? "safety.unblock.confirmDescription"
                            : "safety.block.confirmDescription",
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t("form.cancel")}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() =>
                          void workflow.toggleBlock({
                            id,
                            blocked: workflow.blockState.blockedByMe,
                          })
                        }
                      >
                        {t(workflow.blockState.blockedByMe ? "safety.unblock" : "safety.block")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </section>
            <section
              className="mt-6 min-h-72 rounded-2xl surface-card p-5"
              aria-label={t("messages.history")}
            >
              {workflow.messages.length === 0 ? (
                <p className="py-16 text-center text-muted-foreground">
                  {t("messages.noMessages")}
                </p>
              ) : (
                <ol className="grid gap-3">
                  {workflow.messages.map((message) => {
                    const mine = message.senderUserId === workflow.actor?.id;
                    return (
                      <li
                        key={message.id}
                        className={mine ? "ms-auto max-w-[85%]" : "me-auto max-w-[85%]"}
                      >
                        <div
                          className={
                            mine
                              ? "rounded-2xl bg-primary p-3 text-primary-foreground"
                              : "rounded-2xl bg-secondary p-3"
                          }
                        >
                          <p className="whitespace-pre-wrap break-words text-sm">{message.body}</p>
                        </div>
                        <time className="mt-1 block text-xs text-muted-foreground">
                          {formatDate(message.createdAt, locale)}
                        </time>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
            {workflow.blockState.blocked && (
              <p className="mt-4 rounded-lg bg-secondary p-3 text-sm" role="status">
                {t(
                  workflow.blockState.blockedByMe ? "safety.blockedByYou" : "safety.blockedByOther",
                )}
              </p>
            )}
            <form className="mt-4" onSubmit={submit} aria-busy={workflow.isPending}>
              <label htmlFor="message-body" className="font-bold">
                {t("messages.compose")}
              </label>
              <Textarea
                id="message-body"
                className="mt-2"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                aria-invalid={Boolean(fieldError)}
                aria-describedby={fieldError ? "message-error" : undefined}
                disabled={workflow.blockState.blocked}
              />
              {fieldError && (
                <p id="message-error" className="mt-1 text-sm text-destructive">
                  {fieldError}
                </p>
              )}
              <Button className="mt-3" disabled={workflow.isPending || workflow.blockState.blocked}>
                {workflow.isPending ? t("messages.sending") : t("messages.send")}
              </Button>
            </form>
            <ReportDialog
              open={reportOpen}
              onOpenChange={setReportOpen}
              targetType="CONVERSATION"
              targetId={id}
            />
          </>
        )}
      </main>
    </AuthBoundary>
  );
}
