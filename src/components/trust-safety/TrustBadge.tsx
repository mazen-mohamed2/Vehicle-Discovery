"use client";

import { ShieldCheck } from "lucide-react";
import { isVerified, type VerificationStatus } from "@/lib/trust-safety";
import { useI18n } from "@/lib/i18n";

export function TrustBadge({ status }: { status: VerificationStatus }) {
  const { t } = useI18n();
  if (!isVerified(status)) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
      <ShieldCheck className="h-4 w-4" aria-hidden="true" /> {t("safety.verified")}
    </span>
  );
}
