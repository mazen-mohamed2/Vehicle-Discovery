"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export default function VehicleNotFound() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center">
      <h1 className="text-3xl font-black">{t("notFound.vehicle")}</h1>
      <Link href="/vehicles">
        <Button className="mt-6">{t("notFound.backVehicles")}</Button>
      </Link>
    </div>
  );
}
