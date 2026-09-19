"use client";

import Link from "next/link";
import { AuthBoundary } from "@/components/auth/AuthBoundary";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/use-notifications";
import { useI18n } from "@/lib/i18n";
import { formatDate } from "@/lib/locale";
import { ListingContext } from "@/components/marketplace/ListingContext";
import { marketplaceCommunicationService } from "@/services/marketplace-communication.service";

export function NotificationCenter() {
  const { t, locale } = useI18n();
  const state = useNotifications();
  return (
    <AuthBoundary>
      <main className="mx-auto min-h-[60vh] max-w-4xl px-4 py-10 sm:px-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-3xl font-black">{t("notifications.title")}</h1>
          {!state.isHydrating && state.unreadCount > 0 && (
            <Button
              variant="outline"
              disabled={state.isPending}
              onClick={() => void state.markAllRead()}
            >
              {t("notifications.markAll")}
            </Button>
          )}
        </header>
        {state.isHydrating ? (
          <p className="mt-6" role="status">
            {t("a11y.loading")}
          </p>
        ) : state.isError ? (
          <p className="mt-6" role="alert">
            {t("notifications.error")}
          </p>
        ) : state.notifications.length === 0 ? (
          <section className="mt-6 rounded-2xl surface-card p-10 text-center">
            <h2 className="text-xl font-black">{t("notifications.empty")}</h2>
          </section>
        ) : (
          <ol className="mt-6 grid gap-3">
            {state.notifications.map((notification) => {
              let listingId: string | undefined;
              const hasListingContext =
                notification.type === "NEW_MESSAGE" ||
                notification.type === "NEW_VEHICLE_OFFER" ||
                notification.type === "VEHICLE_OFFER_ACCEPTED" ||
                notification.type === "VEHICLE_OFFER_REJECTED" ||
                notification.type === "VEHICLE_OFFER_WITHDRAWN";
              try {
                listingId = state.actor
                  ? marketplaceCommunicationService.listingIdForNotification(
                      state.actor,
                      notification,
                    )
                  : undefined;
              } catch {
                listingId = undefined;
              }
              return (
                <li key={notification.id} className="rounded-2xl surface-card p-4 shadow-card">
                  <Link
                    href={notification.href}
                    onClick={() => void state.markRead(notification.id)}
                    className="block rounded-lg p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex items-start gap-3">
                      {!notification.readAt && (
                        <span
                          className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary"
                          aria-label={t("notifications.unread")}
                        />
                      )}
                      <div>
                        <h2 className="font-bold">
                          {t(`notifications.type.${notification.type}`)}
                        </h2>
                        <time className="mt-1 block text-xs text-muted-foreground">
                          {formatDate(notification.createdAt, locale)}
                        </time>
                      </div>
                    </div>
                  </Link>
                  {hasListingContext && (
                    <ListingContext
                      listingId={listingId ?? notification.relatedId}
                      className="mt-3"
                      showPrice={false}
                    />
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </main>
    </AuthBoundary>
  );
}
