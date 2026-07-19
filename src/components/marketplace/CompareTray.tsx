"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Scale, X } from "lucide-react";
import { useCompare } from "@/hooks/use-compare";
import { useI18n } from "@/lib/i18n";
import { formatNumber } from "@/lib/locale";
import { Button } from "@/components/ui/button";

export function CompareTray() {
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const { compareCount, isHydrating, clearCompare } = useCompare();
  if (isHydrating || compareCount === 0 || pathname === "/compare") return null;
  return (
    <aside
      className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-md items-center gap-3 rounded-2xl border bg-background/95 p-3 shadow-elegant backdrop-blur"
      aria-label={t("compare.summary")}
    >
      <Scale className="h-5 w-5 shrink-0 text-primary" />
      <p className="min-w-0 flex-1 text-sm font-semibold">
        {t("compare.count").replace("{count}", formatNumber(compareCount, locale))}
      </p>
      <Button asChild size="sm">
        <Link href="/compare">{t("compare.open")}</Link>
      </Button>
      <button
        type="button"
        onClick={clearCompare}
        aria-label={t("compare.clear")}
        className="rounded-md p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="h-4 w-4" />
      </button>
    </aside>
  );
}
