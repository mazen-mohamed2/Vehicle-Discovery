"use client";

import { PageHeader } from "@/components/site/PageHeader";
import { useI18n } from "@/lib/i18n";
import { Search, ShieldCheck, HandshakeIcon, Truck } from "lucide-react";

export function HowItWorksClient() {
  const { t } = useI18n();
  const steps = [
    { icon: Search, title: t("how.search.title"), desc: t("how.search.desc") },
    { icon: ShieldCheck, title: t("how.verify.title"), desc: t("how.verify.desc") },
    { icon: HandshakeIcon, title: t("how.agree.title"), desc: t("how.agree.desc") },
    { icon: Truck, title: t("how.receive.title"), desc: t("how.receive.desc") },
  ];
  return (
    <>
      <PageHeader
        eyebrow={t("eyebrow.guide")}
        title={t("how.title")}
        subtitle={t("brand.tagline")}
      />
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <div key={i} className="rounded-2xl surface-card p-6 shadow-card">
              <div className="grid h-12 w-12 place-items-center rounded-xl gradient-primary text-primary-foreground shadow-elegant">
                <s.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
