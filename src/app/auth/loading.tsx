"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";

export default function AuthLoading() {
  const { t } = useI18n();
  return (
    <div
      className="mx-auto max-w-md space-y-4 px-4 py-24"
      aria-label={t("a11y.loading")}
      aria-busy="true"
    >
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}
