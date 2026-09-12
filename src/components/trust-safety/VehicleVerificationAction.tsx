"use client";

import { Button } from "@/components/ui/button";
import { useTrustSafety } from "@/hooks/use-trust-safety";
import { useI18n } from "@/lib/i18n";

export function VehicleVerificationAction({ listingId }: { listingId: string }) {
  const { t } = useI18n();
  const safety = useTrustSafety({ type: "VEHICLE", id: listingId });
  if (safety.isHydrating)
    return (
      <span className="mt-3 block text-sm text-muted-foreground" role="status">
        {t("a11y.loading")}
      </span>
    );
  return (
    <div className="mt-3 rounded-lg bg-secondary p-3 text-sm">
      <p>{t(`verification.vehicle.${safety.status}`)}</p>
      {(safety.status === "NOT_SUBMITTED" || safety.status === "REJECTED") && (
        <Button
          size="sm"
          variant="outline"
          className="mt-2"
          disabled={safety.isPending}
          onClick={() => void safety.submitVerification()}
        >
          {t("verification.vehicle.submit")}
        </Button>
      )}
    </div>
  );
}
