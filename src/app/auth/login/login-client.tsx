"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";

export function LoginClient() {
  const { t } = useI18n();
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-14 sm:px-6">
      <div className="rounded-2xl surface-card p-8 shadow-elegant">
        <h1 className="text-2xl font-black">{t("auth.login.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("brand.tagline")}</p>
        <form className="mt-6 grid gap-4" onSubmit={(e) => e.preventDefault()}>
          <div className="grid gap-2">
            <Label htmlFor="login-email">{t("form.email")}</Label>
            <Input id="login-email" name="email" type="email" autoComplete="email" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="login-password">{t("form.password")}</Label>
            <Input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
            />
          </div>
          <Button className="gradient-primary text-primary-foreground">
            {t("auth.login.title")}
          </Button>
        </form>
        <p className="mt-6 text-sm text-muted-foreground text-center">
          <Link href="/auth/register" className="text-primary font-semibold hover:underline">
            {t("nav.register")}
          </Link>
        </p>
      </div>
    </section>
  );
}
