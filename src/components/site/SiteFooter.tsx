"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SiteFooter() {
  const { t } = useI18n();
  const year = new Date().getFullYear();

  const cols = [
    {
      title: t("footer.marketplace"),
      links: [
        { href: "/c2c", label: t("nav.c2c") },
        { href: "/dealers", label: t("nav.dealers") },
        { href: "/import", label: t("nav.import") },
        { href: "/vehicles", label: t("vehicles.title") },
      ],
    },
    {
      title: t("footer.company"),
      links: [
        { href: "/about", label: t("about.title") },
        { href: "/how-it-works", label: t("nav.how") },
        { href: "/contact", label: t("contact.title") },
      ],
    },
    {
      title: t("footer.support"),
      links: [
        { href: "/contact", label: t("contact.title") },
        { href: "/how-it-works", label: t("nav.how") },
      ],
    },
    {
      title: t("footer.legal"),
      links: [
        { href: "/about", label: t("legal.terms") },
        { href: "/about", label: t("legal.privacy") },
      ],
    },
  ] as const;

  return (
    <footer className="mt-24 border-t border-border/60 bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-xl gradient-primary shadow-elegant">
                <span className="text-primary-foreground font-black text-sm">س</span>
              </div>
              <span className="text-lg font-black tracking-tight">{t("brand.name")}</span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">{t("brand.tagline")}</p>
            <div className="mt-6">
              <p className="text-sm font-semibold">{t("footer.newsletter")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("footer.newsletter.desc")}</p>
              <form className="mt-3 flex gap-2" onSubmit={(e) => e.preventDefault()}>
                <Input
                  aria-label={t("footer.newsletter.placeholder")}
                  type="email"
                  placeholder={t("footer.newsletter.placeholder")}
                  className="h-10"
                />
                <Button type="submit" className="h-10 gradient-primary text-primary-foreground">
                  {t("footer.subscribe")}
                </Button>
              </form>
            </div>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <h4 className="text-sm font-bold">{c.title}</h4>
              <ul className="mt-4 space-y-2.5">
                {c.links.map((l, i) => (
                  <li key={i}>
                    <Link
                      href={l.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>
            © {year} {t("brand.name")}. {t("footer.rights")}.
          </p>
          <div className="flex items-center gap-4">
            <span>{t("region.currency")}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
