"use client";

import { PageHeader } from "@/components/site/PageHeader";
import { useI18n } from "@/lib/i18n";

export function AboutClient() {
  const { t } = useI18n();
  return (
    <>
      <PageHeader
        eyebrow={t("eyebrow.about")}
        title={t("about.title")}
        subtitle={t("brand.tagline")}
      />
      <section className="mx-auto max-w-3xl px-4 py-14 text-base leading-relaxed text-muted-foreground sm:px-6 lg:px-8">
        <p>{t("about.description")}</p>
      </section>
    </>
  );
}
