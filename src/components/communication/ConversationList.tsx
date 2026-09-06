"use client";

import Link from "next/link";
import { AuthBoundary } from "@/components/auth/AuthBoundary";
import { useMarketplaceCommunication } from "@/hooks/use-marketplace-communication";
import { useI18n } from "@/lib/i18n";
import { formatDate } from "@/lib/locale";
import { publicCatalogService } from "@/services/public-catalog.service";
import { developmentPublicProfile } from "@/services/auth.service";

export function ConversationList() {
  const { t, locale } = useI18n();
  const workflow = useMarketplaceCommunication();
  return (
    <AuthBoundary>
      <main className="mx-auto min-h-[60vh] max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-black">{t("messages.title")}</h1>
        {workflow.isLoading ? (
          <p className="mt-6" role="status">
            {t("a11y.loading")}
          </p>
        ) : workflow.isError ? (
          <p className="mt-6" role="alert">
            {t("messages.error")}
          </p>
        ) : workflow.conversationSummaries.length === 0 ? (
          <section className="mt-6 rounded-2xl surface-card p-10 text-center">
            <h2 className="text-xl font-black">{t("messages.empty")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("messages.empty.description")}</p>
          </section>
        ) : (
          <div className="mt-6 grid gap-3">
            {workflow.conversationSummaries.map(({ conversation, lastMessage, unreadCount }) => {
              const otherId = conversation.participantUserIds.find(
                (id) => id !== workflow.actor?.id,
              )!;
              const other = developmentPublicProfile(otherId);
              const listing = publicCatalogService.byId(conversation.listingId);
              return (
                <Link
                  key={conversation.id}
                  href={`/messages/${conversation.id}`}
                  className="rounded-2xl surface-card p-5 shadow-card transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <h2 className="font-black">
                        {other?.displayName ?? t("messages.participant")}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {listing?.title ?? conversation.listingId}
                      </p>
                      <p className="mt-1 max-w-xl truncate text-sm text-muted-foreground">
                        {lastMessage?.body ?? t("messages.noMessages")}
                      </p>
                    </div>
                    <div className="text-end">
                      <time className="text-xs text-muted-foreground">
                        {formatDate(conversation.lastMessageAt ?? conversation.createdAt, locale)}
                      </time>
                      {unreadCount > 0 && (
                        <span
                          className="mt-2 block rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground"
                          aria-label={t("messages.unreadCount").replace(
                            "{count}",
                            String(unreadCount),
                          )}
                        >
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </AuthBoundary>
  );
}
