"use client";

import Link from "next/link";
import Image from "next/image";
import { useQueries, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Search,
  Users,
  Store,
  Globe2,
  ShieldCheck,
  CheckCircle2,
  Send,
  Scale,
  Lock,
  Truck,
} from "lucide-react";
import { SectionHeader } from "@/components/site/SectionHeader";
import { VehicleCard } from "@/components/marketplace/VehicleCard";
import { AgencyCard } from "@/components/marketplace/AgencyCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { listingsService } from "@/services/listings.service";
import { agenciesService } from "@/services/agencies.service";
import { mockBrands, mockStats, mockTestimonials, mockFaqs } from "@/services/mock-data";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { queryKeys } from "@/lib/query-keys";
import { formatNumber } from "@/lib/locale";
import { canonicalMake } from "@/lib/vehicle-discovery";

export function HomeClient() {
  return (
    <>
      <Hero />
      <Paths />
      <Featured />
      <Brands />
      <Agencies />
      <ImportFlow />
      <Trust />
      <Recent />
      <Stats />
      <Testimonials />
      <FAQ />
      <FinalCTA />
    </>
  );
}

function Hero() {
  const { t } = useI18n();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const submitSearch = () => {
    const value = search.trim();
    if (!value) return router.push("/vehicles");
    const brand = mockBrands.find((item) => item.toLowerCase() === value.toLowerCase());
    const params = new URLSearchParams(brand ? { make: canonicalMake(brand) } : { q: value });
    router.push(`/vehicles?${params.toString()}`);
  };
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <Image
          src="/assets/hero-car.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/85 to-background" />
        <div className="absolute inset-0 gradient-hero opacity-70" />
      </div>
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24 lg:px-8 lg:pb-24 lg:pt-32">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            {t("brand.tagline")}
          </span>
          <h1 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            {t("hero.title")}
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            {t("hero.subtitle")}
          </p>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            submitSearch();
          }}
          className="mt-8 flex flex-col gap-3 rounded-2xl surface-card p-3 shadow-elegant sm:flex-row sm:items-center"
        >
          <div className="flex flex-1 items-center gap-2 rounded-xl bg-secondary/60 px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              aria-label={t("search.placeholder")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("search.placeholder")}
              className="h-12 border-0 bg-transparent shadow-none focus-visible:ring-0"
            />
          </div>
          <Button
            size="lg"
            className="h-12 gradient-primary text-primary-foreground shadow-elegant"
          >
            {t("search.button")}
          </Button>
        </form>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link href="/vehicles">
            <Button variant="outline" size="lg" className="h-11">
              {t("hero.cta.browse")}
              <ArrowRight className="h-4 w-4 ms-1.5 rtl:rotate-180" />
            </Button>
          </Link>
          <Link href="/vehicles">
            <Button variant="ghost" size="lg" className="h-11">
              {t("hero.cta.sell")}
            </Button>
          </Link>
          <Link href="/import">
            <Button variant="ghost" size="lg" className="h-11">
              {t("hero.cta.import")}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function Paths() {
  const { t } = useI18n();
  const cards = [
    { href: "/c2c", icon: Users, title: t("path.c2c.title"), desc: t("path.c2c.desc") },
    { href: "/dealers", icon: Store, title: t("path.dealer.title"), desc: t("path.dealer.desc") },
    { href: "/import", icon: Globe2, title: t("path.import.title"), desc: t("path.import.desc") },
  ] as const;
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <SectionHeader
        eyebrow={t("eyebrow.marketplace")}
        title={t("paths.title")}
        subtitle={t("paths.subtitle")}
      />
      <div className="grid gap-5 md:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group relative overflow-hidden rounded-2xl surface-card p-6 shadow-card transition-all hover:-translate-y-1 hover:shadow-elegant"
          >
            <div className="absolute -inset-x-4 -top-16 h-32 gradient-primary opacity-0 blur-3xl transition-opacity group-hover:opacity-30" />
            <div className="relative">
              <div className="grid h-12 w-12 place-items-center rounded-xl gradient-primary text-primary-foreground shadow-elegant">
                <c.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-xl font-bold">{c.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{c.desc}</p>
              <div className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                {t("common.explore")}
                <ArrowRight className="h-4 w-4 rtl:rotate-180 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function Featured() {
  const { t } = useI18n();
  const { data } = useSuspenseQuery({
    queryKey: queryKeys.listings.featured,
    queryFn: () => listingsService.featured(),
  });
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow={t("eyebrow.featured")}
        title={t("featured.title")}
        subtitle={t("featured.subtitle")}
        action={
          <Link href="/vehicles">
            <Button variant="outline">
              {t("featured.viewAll")}
              <ArrowRight className="h-4 w-4 ms-1.5 rtl:rotate-180" />
            </Button>
          </Link>
        }
      />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {data.map((v) => (
          <VehicleCard key={v.id} v={v} />
        ))}
      </div>
    </section>
  );
}

function Brands() {
  const { t } = useI18n();
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeader title={t("brands.title")} />
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6">
        {mockBrands.map((b) => (
          <Link
            key={b}
            href={`/vehicles?make=${encodeURIComponent(canonicalMake(b))}`}
            className="group flex h-20 items-center justify-center rounded-xl surface-card px-3 text-sm font-bold text-muted-foreground transition-all hover:-translate-y-0.5 hover:text-foreground hover:shadow-card"
          >
            {b}
          </Link>
        ))}
      </div>
    </section>
  );
}

function Agencies() {
  const { t } = useI18n();
  const { data } = useSuspenseQuery({
    queryKey: queryKeys.agencies.verified,
    queryFn: () => agenciesService.verified(),
  });
  const inventoryQueries = useQueries({
    queries: data.map((agency) => ({
      queryKey: queryKeys.listings.byAgency(agency.id),
      queryFn: () => listingsService.byAgency(agency.id),
    })),
  });
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow={t("eyebrow.verified")}
        title={t("agencies.title")}
        subtitle={t("agencies.subtitle")}
      />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {data.map((a, index) => (
          <AgencyCard key={a.id} a={a} vehicleCount={inventoryQueries[index].data?.length ?? 0} />
        ))}
      </div>
    </section>
  );
}

function ImportFlow() {
  const { t } = useI18n();
  const steps = [
    { icon: Send, title: t("import.step1"), desc: t("import.step1.desc") },
    { icon: Store, title: t("import.step2"), desc: t("import.step2.desc") },
    { icon: Scale, title: t("import.step3"), desc: t("import.step3.desc") },
    { icon: Lock, title: t("import.step4"), desc: t("import.step4.desc") },
    { icon: Truck, title: t("import.step5"), desc: t("import.step5.desc") },
  ];
  return (
    <section className="relative overflow-hidden py-16 lg:py-24">
      <div className="absolute inset-0 -z-10 gradient-hero opacity-60" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader eyebrow={t("eyebrow.import")} title={t("import.how.title")} />
        <div className="grid gap-4 md:grid-cols-5">
          {steps.map((s, i) => (
            <div key={i} className="relative rounded-2xl surface-card p-5 shadow-card">
              <div className="mb-4 flex items-center justify-between">
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
      </div>
    </section>
  );
}

function Trust() {
  const { t } = useI18n();
  const items = [
    { icon: Lock, title: t("trust.escrow"), desc: t("trust.escrow.desc") },
    { icon: ShieldCheck, title: t("trust.verified"), desc: t("trust.verified.desc") },
    { icon: CheckCircle2, title: t("trust.vehicle"), desc: t("trust.vehicle.desc") },
    { icon: Scale, title: t("trust.dispute"), desc: t("trust.dispute.desc") },
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow={t("eyebrow.trust")}
        title={t("trust.title")}
        subtitle={t("trust.subtitle")}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it, i) => (
          <div key={i} className="rounded-2xl surface-card p-6 shadow-card">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
              <it.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-bold">{it.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{it.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Recent() {
  const { t } = useI18n();
  const { data } = useSuspenseQuery({
    queryKey: queryKeys.listings.recent(6),
    queryFn: () => listingsService.recent(6),
  });
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeader eyebrow={t("eyebrow.new")} title={t("recent.title")} />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {data.slice(0, 6).map((v) => (
          <VehicleCard key={v.id} v={v} />
        ))}
      </div>
    </section>
  );
}

function Stats() {
  const { t, locale } = useI18n();
  const fmt = (n: number) => formatNumber(n, locale);
  const items = [
    { v: fmt(mockStats.listings) + "+", l: t("stats.listings") },
    { v: fmt(mockStats.agencies) + "+", l: t("stats.agencies") },
    { v: fmt(mockStats.deals) + "+", l: t("stats.deals") },
    { v: fmt(mockStats.users) + "+", l: t("stats.users") },
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid gap-4 rounded-3xl surface-card p-6 shadow-elegant sm:grid-cols-2 lg:grid-cols-4 lg:p-10">
        {items.map((it, i) => (
          <div key={i} className="text-center">
            <p className="text-4xl font-black tracking-tight lg:text-5xl bg-gradient-to-br from-primary to-primary-glow bg-clip-text text-transparent">
              {it.v}
            </p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {it.l}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Testimonials() {
  const { t } = useI18n();
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeader title={t("testimonials.title")} />
      <div className="grid gap-5 md:grid-cols-3">
        {mockTestimonials.map((tm) => (
          <blockquote key={tm.id} className="rounded-2xl surface-card p-6 shadow-card">
            <p className="text-sm leading-relaxed text-foreground">&quot;{tm.quote}&quot;</p>
            <footer className="mt-4 border-t border-border/60 pt-4">
              <p className="text-sm font-bold">{tm.author}</p>
              <p className="text-xs text-muted-foreground">{tm.role}</p>
            </footer>
          </blockquote>
        ))}
      </div>
    </section>
  );
}

function FAQ() {
  const { t } = useI18n();
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeader title={t("faq.title")} />
      <Accordion type="single" collapsible className="rounded-2xl surface-card px-2 shadow-card">
        {mockFaqs.map((f, i) => (
          <AccordionItem key={i} value={`i${i}`} className="border-border/60">
            <AccordionTrigger className="px-4 text-start text-sm font-semibold">
              {f.q}
            </AccordionTrigger>
            <AccordionContent className="px-4 text-sm text-muted-foreground">
              {f.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

function FinalCTA() {
  const { t } = useI18n();
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-3xl gradient-primary p-10 text-center shadow-elegant lg:p-16">
        <div className="absolute inset-0 opacity-30 mix-blend-overlay bg-[radial-gradient(circle_at_20%_20%,white,transparent_50%)]" />
        <div className="relative">
          <h2 className="text-3xl font-black text-primary-foreground sm:text-4xl">
            {t("cta.final.title")}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-primary-foreground/90">
            {t("cta.final.subtitle")}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/vehicles">
              <Button size="lg" variant="secondary" className="h-12">
                {t("hero.cta.browse")}
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button
                size="lg"
                variant="outline"
                className="h-12 bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                {t("nav.register")}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
