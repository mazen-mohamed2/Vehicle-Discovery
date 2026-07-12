"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/site/PageHeader";
import { AgencyCard } from "@/components/marketplace/AgencyCard";
import { useI18n } from "@/lib/i18n";
import { agenciesService } from "@/services/agencies.service";

export function DealersClient() {
  const { t } = useI18n();
  const { data } = useSuspenseQuery({
    queryKey: ["agencies"],
    queryFn: () => agenciesService.list(),
  });
  return (
    <>
      <PageHeader eyebrow="Dealers" title={t("dealers.title")} subtitle={t("agencies.subtitle")} />
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.map((a) => (
            <AgencyCard key={a.id} a={a} />
          ))}
        </div>
      </section>
    </>
  );
}
