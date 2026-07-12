"use client";

import { PageHeader } from "@/components/site/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";

export function ContactClient() {
  const { t } = useI18n();
  return (
    <>
      <PageHeader eyebrow="Get in touch" title={t("contact.title")} />
      <section className="mx-auto max-w-2xl px-4 py-14 sm:px-6 lg:px-8">
        <form
          className="grid gap-4 rounded-2xl surface-card p-6 shadow-card"
          onSubmit={(e) => e.preventDefault()}
        >
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input />
          </div>
          <div className="grid gap-2">
            <Label>Email</Label>
            <Input type="email" />
          </div>
          <div className="grid gap-2">
            <Label>Message</Label>
            <Textarea rows={5} />
          </div>
          <Button className="gradient-primary text-primary-foreground">Send</Button>
        </form>
      </section>
    </>
  );
}
