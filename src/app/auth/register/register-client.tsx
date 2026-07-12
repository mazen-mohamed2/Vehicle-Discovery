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
            <Label>Name</Label>
            <Input />
          </div>
          <div className="grid gap-2">
            <Label>Email</Label>
            <Input type="email" />
          </div>
          <div className="grid gap-2">
            <Label>Password</Label>
            <Input type="password" />
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
