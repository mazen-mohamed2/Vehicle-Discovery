"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";

export function RegisterClient() {
  const { t } = useI18n();
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-14 sm:px-6">
      <div className="rounded-2xl surface-card p-8 shadow-elegant">
        <h1 className="text-2xl font-black">{t("auth.register.title")}</h1>
        <form className="mt-6 grid gap-4" onSubmit={(e) => e.preventDefault()}>
          <div className="grid gap-2">
            <Label htmlFor="register-name">{t("form.name")}</Label>
            <Input id="register-name" name="name" autoComplete="name" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="register-email">{t("form.email")}</Label>
            <Input id="register-email" name="email" type="email" autoComplete="email" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="register-password">{t("form.password")}</Label>
            <Input
              id="register-password"
              name="password"
              type="password"
              autoComplete="new-password"
            />
          </div>
          <Button className="gradient-primary text-primary-foreground">
            {t("auth.register.title")}
          </Button>
        </form>
        <p className="mt-6 text-sm text-muted-foreground text-center">
          <Link href="/auth/login" className="text-primary font-semibold hover:underline">
            {t("nav.login")}
          </Link>
        </p>
      </div>
    </section>
  );
}
