"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Store, Scale, Lock, Truck } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/site/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useImportWorkflow } from "@/hooks/use-import-workflow";
import { ImportWorkflowError } from "@/lib/import-workflow";
import { useI18n } from "@/lib/i18n";

export function ImportClient() {
  const { t } = useI18n();
  const auth = useAuth();
  const router = useRouter();
  const workflow = useImportWorkflow();
  const [fields, setFields] = useState({
    make: "",
    model: "",
    year: "",
    budget: "",
    preferences: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const steps = [
    { icon: Send, title: t("import.step1"), desc: t("import.step1.desc") },
    { icon: Store, title: t("import.step2"), desc: t("import.step2.desc") },
    { icon: Scale, title: t("import.step3"), desc: t("import.step3.desc") },
    { icon: Lock, title: t("import.step4"), desc: t("import.step4.future") },
    { icon: Truck, title: t("import.step5"), desc: t("import.step5.future") },
  ];
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (workflow.isPending) return;
    if (!auth.user) {
      auth.requireAuth("/import", () => undefined);
      return;
    }
    if (auth.role !== "user") {
      toast.error(t("import.error.individualOnly"));
      return;
    }
    try {
      const request = await workflow.createRequest({
        make: fields.make,
        model: fields.model,
        year: Number(fields.year),
        budget: Number(fields.budget),
        currency: "EGP",
        preferences: fields.preferences,
      });
      toast.success(t("import.success.created"));
      router.push(`/account/import-requests/${request.id}`);
    } catch (error) {
      if (error instanceof ImportWorkflowError) setErrors(error.fields);
      toast.error(t("import.error.validation"));
    }
  };
  const input = (name: string) => ({
    "aria-invalid": Boolean(errors[name]),
    "aria-describedby": errors[name] ? `import-${name}-error` : undefined,
  });
  const error = (name: string) =>
    errors[name] ? (
      <p id={`import-${name}-error`} className="text-sm text-destructive">
        {t(`import.validation.${errors[name]}`)}
      </p>
    ) : null;
  return (
    <>
      <PageHeader
        eyebrow={t("eyebrow.import")}
        title={t("import.title")}
        subtitle={t("path.import.desc")}
      />
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-5">
          {steps.map((step, index) => (
            <div key={step.title} className="rounded-2xl surface-card p-5 shadow-card">
              <div className="mb-3 flex items-center justify-between">
                <div className="grid h-10 w-10 place-items-center rounded-xl gradient-primary text-primary-foreground">
                  <step.icon className="h-4 w-4" />
                </div>
                <span className="text-3xl font-black text-muted-foreground/30">{index + 1}</span>
              </div>
              <h2 className="font-bold">{step.title}</h2>
              <p className="mt-1.5 text-xs text-muted-foreground">{step.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-14 grid gap-8 rounded-3xl surface-card p-6 shadow-elegant lg:grid-cols-2 lg:p-10">
          <div>
            <h2 className="text-2xl font-black">{t("import.create.title")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("import.create.description")}</p>
            {auth.role === "user" && (
              <Button asChild variant="outline" className="mt-5">
                <Link href="/account/import-requests">{t("import.myRequests")}</Link>
              </Button>
            )}
            {auth.role === "dealer" && (
              <Button asChild className="mt-5">
                <Link href="/dealer-account/import-requests">{t("import.opportunities")}</Link>
              </Button>
            )}
          </div>
          {auth.role !== "dealer" && (
            <form className="grid gap-4" onSubmit={submit} noValidate>
              <Field label={t("form.make")}>
                <Input
                  value={fields.make}
                  onChange={(e) => setFields({ ...fields, make: e.target.value })}
                  {...input("make")}
                />
                {error("make")}
              </Field>
              <Field label={t("form.model")}>
                <Input
                  value={fields.model}
                  onChange={(e) => setFields({ ...fields, model: e.target.value })}
                  {...input("model")}
                />
                {error("model")}
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("form.year")}>
                  <Input
                    type="number"
                    value={fields.year}
                    onChange={(e) => setFields({ ...fields, year: e.target.value })}
                    {...input("year")}
                  />
                  {error("year")}
                </Field>
                <Field label={t("form.budget")}>
                  <Input
                    type="number"
                    min="1"
                    value={fields.budget}
                    onChange={(e) => setFields({ ...fields, budget: e.target.value })}
                    {...input("budget")}
                  />
                  {error("budget")}
                </Field>
              </div>
              <Field label={t("import.preferences")}>
                <Textarea
                  value={fields.preferences}
                  onChange={(e) => setFields({ ...fields, preferences: e.target.value })}
                  {...input("preferences")}
                />
                {error("preferences")}
              </Field>
              <Button
                disabled={workflow.isPending}
                className="gradient-primary text-primary-foreground"
              >
                {workflow.isPending ? t("import.creating") : t("hero.cta.import")}
              </Button>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
