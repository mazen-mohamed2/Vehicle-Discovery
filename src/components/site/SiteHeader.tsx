"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Menu, Moon, Scale, Sun, Globe, User, X } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCompare } from "@/hooks/use-compare";
import { useFavorites } from "@/hooks/use-favorites";
import { formatNumber } from "@/lib/locale";

export function SiteHeader() {
  const { t, locale, setLocale, theme, setTheme } = useI18n();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { compareCount, isHydrating: compareHydrating } = useCompare();
  const { favorites, isHydrating: favoritesHydrating } = useFavorites();
  const favoritesCount = favorites.length;
  const favoritesLabel = favoritesHydrating
    ? t("nav.favorites")
    : t("nav.favoritesWithCount").replace("{count}", formatNumber(favoritesCount, locale));
  const compareLabel =
    !compareHydrating && compareCount > 0
      ? t("nav.compareWithCount").replace("{count}", formatNumber(compareCount, locale))
      : t("nav.compare");

  const navLinks = [
    { href: "/c2c", label: t("nav.c2c") },
    { href: "/dealers", label: t("nav.dealers") },
    { href: "/import", label: t("nav.import") },
    { href: "/how-it-works", label: t("nav.how") },
  ] as const;

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl gradient-primary shadow-elegant">
            <span className="text-primary-foreground font-black text-sm">س</span>
          </div>
          <span className="text-lg font-black tracking-tight">{t("brand.name")}</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={pathname === l.href ? "page" : undefined}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                pathname === l.href && "bg-secondary text-foreground",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-1.5">
          <button
            onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
            className="hidden sm:inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            aria-label={t("a11y.switchLanguage")}
          >
            <Globe className="h-4 w-4" />
            {locale === "ar" ? "EN" : "ع"}
          </button>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            aria-label={t("a11y.toggleTheme")}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <Link
            href="/favorites"
            aria-label={favoritesLabel}
            aria-current={pathname === "/favorites" ? "page" : undefined}
            className={cn(
              "hidden lg:inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              pathname === "/favorites" && "bg-secondary text-foreground",
            )}
          >
            <Heart className="h-4 w-4" />
            <span className="hidden xl:inline">{t("nav.favorites")}</span>
            {!favoritesHydrating && <span>({formatNumber(favoritesCount, locale)})</span>}
          </Link>
          <Link
            href="/compare"
            aria-label={compareLabel}
            aria-current={pathname === "/compare" ? "page" : undefined}
            className={cn(
              "hidden lg:inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              pathname === "/compare" && "bg-secondary text-foreground",
            )}
          >
            <Scale className="h-4 w-4" />
            <span className="hidden xl:inline">{t("nav.compare")}</span>
            {!compareHydrating && compareCount > 0 && (
              <span>({formatNumber(compareCount, locale)})</span>
            )}
          </Link>
          <Link href="/auth/login" className="hidden md:inline-flex">
            <Button variant="ghost" size="sm" className="h-9">
              <User className="h-4 w-4 me-1.5" />
              {t("nav.login")}
            </Button>
          </Link>
          <Link href="/vehicles" className="hidden md:inline-flex">
            <Button
              size="sm"
              className="h-9 gradient-primary text-primary-foreground shadow-elegant hover:opacity-90"
            >
              {t("nav.sell")}
            </Button>
          </Link>

          <button
            onClick={() => setOpen((o) => !o)}
            className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg text-foreground hover:bg-secondary"
            aria-label={t("a11y.menu")}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-border/60 bg-background">
          <div className="mx-auto max-w-7xl px-4 py-3 flex flex-col gap-1">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={pathname === l.href ? "page" : undefined}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/favorites"
              aria-label={favoritesLabel}
              aria-current={pathname === "/favorites" ? "page" : undefined}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                pathname === "/favorites" && "bg-secondary text-foreground",
              )}
            >
              <Heart className="h-4 w-4" />
              <span>{t("nav.favorites")}</span>
              {!favoritesHydrating && <span>({formatNumber(favoritesCount, locale)})</span>}
            </Link>
            <Link
              href="/compare"
              aria-label={compareLabel}
              aria-current={pathname === "/compare" ? "page" : undefined}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                pathname === "/compare" && "bg-secondary text-foreground",
              )}
            >
              <Scale className="h-4 w-4" />
              <span>{t("nav.compare")}</span>
              {!compareHydrating && compareCount > 0 && (
                <span>({formatNumber(compareCount, locale)})</span>
              )}
            </Link>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Link href="/auth/login" onClick={() => setOpen(false)}>
                <Button variant="outline" size="sm" className="w-full">
                  {t("nav.login")}
                </Button>
              </Link>
              <Link href="/vehicles" onClick={() => setOpen(false)}>
                <Button size="sm" className="w-full gradient-primary text-primary-foreground">
                  {t("nav.sell")}
                </Button>
              </Link>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <button
                onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 hover:bg-secondary"
                aria-label={t("a11y.switchLanguage")}
              >
                <Globe className="h-4 w-4" />
                {locale === "ar" ? "English" : "العربية"}
              </button>
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 hover:bg-secondary"
                aria-label={t("a11y.toggleTheme")}
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
