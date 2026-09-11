"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { AuthBoundary } from "@/components/auth/AuthBoundary";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { useMarketplaceCommunication } from "@/hooks/use-marketplace-communication";
import { communicationDetailState, CommunicationError } from "@/lib/communication";
import { useI18n } from "@/lib/i18n";
import { formatDate } from "@/lib/locale";
import { publicCatalogService } from "@/services/public-catalog.service";
import { developmentPublicProfile } from "@/services/auth.service";

export function ConversationDetail({ id }: { id: string }) {
  const { t, locale } = useI18n();
  const workflow = useMarketplaceCommunication(id);
  const [body, setBody] = useState("");
  const [fieldError, setFieldError] = useState("");
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
            <header className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm text-primary">{t("messages.vehicleContext")}</p>
                <h1 className="text-3xl font-black">
                  {publicCatalogService.byId(workflow.conversation.listingId)?.title ??
                    workflow.conversation.listingId}
                </h1>
              </div>
              <Button asChild variant="outline">
                <Link href="/messages">{t("messages.back")}</Link>
              </Button>
            </header>
            <section
              className="mt-5 flex items-center gap-3 rounded-2xl surface-card p-4"
              aria-label={t("messages.counterpart")}
            >
              <Avatar className="h-12 w-12">
                {counterpart?.avatarUrl && <AvatarImage src={counterpart.avatarUrl} alt="" />}
                <AvatarFallback aria-hidden="true">{initials || "?"}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-bold">
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
              {counterpart?.role === "dealer" && counterpart.dealerId && (
                <Button asChild variant="outline" size="sm" className="ms-auto shrink-0">
                  <Link href={`/dealers/${counterpart.dealerId}`}>
                    {t("vehicle.dealerProfile")}
                  </Link>
                </Button>
              )}
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
              />
              {fieldError && (
                <p id="message-error" className="mt-1 text-sm text-destructive">
                  {fieldError}
                </p>
              )}
              <Button className="mt-3" disabled={workflow.isPending}>
                {workflow.isPending ? t("messages.sending") : t("messages.send")}
              </Button>
            </form>
          </>
        )}
      </main>
    </AuthBoundary>
  );
}
