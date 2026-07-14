"use client";

import { AlertCircle, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="col-span-full grid place-items-center rounded-2xl surface-card p-12 text-center shadow-card">
      <Inbox className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      <h2 className="mt-4 text-lg font-bold">{title}</h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function QueryErrorState({ retry }: { retry: () => void }) {
  const { t } = useI18n();
  return (
    <div
      className="col-span-full grid place-items-center rounded-2xl surface-card p-12 text-center shadow-card"
      role="alert"
    >
      <AlertCircle className="h-8 w-8 text-destructive" aria-hidden="true" />
      <h2 className="mt-4 text-lg font-bold">{t("state.error.title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("state.error.description")}</p>
      <Button className="mt-5" variant="outline" onClick={retry}>
        {t("state.error.retry")}
      </Button>
    </div>
  );
}

export function VehicleGridSkeleton({ count = 8 }: { count?: number }) {
  return Array.from({ length: count }, (_, index) => (
    <div key={index} className="overflow-hidden rounded-2xl surface-card shadow-card">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-7 w-1/2" />
      </div>
    </div>
  ));
}

export function DealerGridSkeleton({ count = 4 }: { count?: number }) {
  return Array.from({ length: count }, (_, index) => (
    <div key={index} className="space-y-4 rounded-2xl surface-card p-5 shadow-card">
      <Skeleton className="h-14 w-14 rounded-xl" />
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-16 w-full rounded-xl" />
    </div>
  ));
}
