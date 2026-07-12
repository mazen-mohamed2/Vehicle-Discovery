"use client";

import { Send, Store, Scale, Lock, Truck } from "lucide-react";
import { PageHeader } from "@/components/site/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";

export function ImportClient() {
  const { t } = useI18n();
  const steps = [
    { icon: Send, title: t("import.step1"), desc: t("import.step1.desc") },
    { icon: Store, title: t("import.step2"), desc: t("import.step2.desc") },
    { icon: Scale, title: t("import.step3"), desc: t("import.step3.desc") },
    { icon: Lock, title: t("import.step4"), desc: t("import.step4.desc") },
    { icon: Truck, title: t("import.step5"), desc: t("import.step5.desc") },
  ];
  return (
    <>
      <PageHeader
        eyebrow="Custom import"
        title={t("import.title")}
        subtitle={t("path.import.desc")}
      />
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-5">
          {steps.map((s, i) => (
            <div key={i} className="rounded-2xl surface-card p-5 shadow-card">
              <div className="mb-3 flex items-center justify-between">
                <div className="grid h-10 w-10 place-items-center rounded-xl gradient-primary text-primary-foreground shadow-elegant">
                  <s.icon className="h-4 w-4" />
                </div>
                <span className="text-3xl font-black text-muted-foreground/30">{i + 1}</span>
              </div>
              <h3 className="text-base font-bold">{s.title}</h3>
              <p className="mt-1.5 text-xs text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 grid gap-8 rounded-3xl surface-card p-6 shadow-elegant lg:grid-cols-2 lg:p-10">
          <div>
            <h2 className="text-2xl font-black">{t("hero.cta.import")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("path.import.desc")}</p>
          </div>
          <form className="grid gap-4" onSubmit={(e) => e.preventDefault()}>
            <div className="grid gap-2">
              <Label>Make</Label>
              <Input placeholder="BMW" />
            </div>
            <div className="grid gap-2">
              <Label>Model</Label>
              <Input placeholder="530i" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Year</Label>
                <Input type="number" placeholder="2024" />
              </div>
              <div className="grid gap-2">
                <Label>Budget (EGP)</Label>
                <Input type="number" placeholder="2500000" />
              </div>
            </div>
            <Button className="gradient-primary text-primary-foreground shadow-elegant">
              {t("hero.cta.import")}
            </Button>
          </form>
        </div>
      </section>
    </>
  );
}
