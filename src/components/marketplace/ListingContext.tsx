"use client";

import Image from "next/image";
import Link from "next/link";
import { ImageOff } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { formatCurrency } from "@/lib/locale";
import { cn } from "@/lib/utils";
import { listingContextService } from "@/services/listing-context.service";
import type { ListingContextPresentation } from "@/services/listing-context.service";

export function ListingContext({
  listingId,
  className,
  showPrice = true,
  compact = false,
  resolvedContext,
}: {
  listingId: string;
  className?: string;
  showPrice?: boolean;
  compact?: boolean;
  resolvedContext?: ListingContextPresentation;
}) {
  const { t, locale } = useI18n();
  const context = resolvedContext ?? listingContextService.resolve(listingId);
  const body = (
    <>
      <div
        className={cn(
          "relative shrink-0 overflow-hidden rounded-lg bg-muted",
          compact ? "h-14 w-16" : "h-20 w-24 sm:w-28",
        )}
      >
        {context.thumbnail ? (
          <Image
            src={context.thumbnail}
            alt={context.thumbnailAlt || context.title || t("listing.context.unavailable")}
            fill
            unoptimized={context.thumbnail.startsWith("blob:")}
            sizes={compact ? "64px" : "112px"}
            className="object-cover"
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-muted-foreground">
            <ImageOff className="h-6 w-6" aria-hidden="true" />
          </span>
        )}
      </div>
      <span className="min-w-0 flex-1">
        <span className="block break-words font-black leading-snug">
          {context.title ?? t("listing.context.unavailable")}
        </span>
        {context.category && (
          <span className="mt-1 block text-xs font-semibold text-primary">
            {t(`category.single.${context.category}`)}
          </span>
        )}
        {showPrice && context.price !== undefined && context.currency && (
          <span className="mt-1 block text-sm text-muted-foreground">
            {formatCurrency(context.price, context.currency, locale)}
          </span>
        )}
        {context.href && (
          <span className="mt-1 block text-xs font-semibold text-primary underline-offset-4 group-hover:underline">
            {t("listing.context.view")}
          </span>
        )}
      </span>
    </>
  );
  const classes = cn(
    "flex min-w-0 items-center gap-3 rounded-xl border border-border bg-background/60",
    compact ? "p-2" : "p-3",
    className,
  );
  return context.href ? (
    <Link
      href={context.href}
      className={cn(
        "group transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        classes,
      )}
      aria-label={`${t("listing.context.view")}: ${context.title}`}
    >
      {body}
    </Link>
  ) : (
    <div className={classes} role="status">
      {body}
    </div>
  );
}
