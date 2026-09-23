import type { Locale } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";

const localeTags: Record<Locale, string> = { ar: "ar-EG", en: "en-US" };

export function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(localeTags[locale]).format(value);
}

export function formatCurrency(value: number, currency: "EGP" | "USD", locale: Locale) {
  return formatMoney(value, currency, locale);
}

export function formatDate(value: string | Date, locale: Locale) {
  return new Intl.DateTimeFormat(localeTags[locale], { dateStyle: "medium" }).format(
    new Date(value),
  );
}

export function formatRelativeTime(value: string | Date, locale: Locale, now = new Date()) {
  const days = Math.round((new Date(value).getTime() - now.getTime()) / 86_400_000);
  return new Intl.RelativeTimeFormat(localeTags[locale], { numeric: "auto" }).format(days, "day");
}

export function formatMileage(value: number, locale: Locale, unit: string) {
  return `${formatNumber(value, locale)} ${unit}`;
}

export function formatYear(value: number, locale: Locale) {
  return new Intl.NumberFormat(localeTags[locale], { useGrouping: false }).format(value);
}
