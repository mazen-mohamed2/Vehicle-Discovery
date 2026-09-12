"use client";

import { ShieldCheck } from "lucide-react";
import { AuthBoundary } from "@/components/auth/AuthBoundary";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useTrustSafety } from "@/hooks/use-trust-safety";
import { useI18n } from "@/lib/i18n";

export function VerificationCenter({ role }: { role: "user" | "dealer" }) {
  const { t } = useI18n();
  const auth = useAuth();
  const subject = auth.user
    ? {
        type: role === "dealer" ? ("DEALER" as const) : ("INDIVIDUAL" as const),
        id: role === "dealer" ? (auth.user.dealerId ?? "") : auth.user.id,
      }
    : undefined;
  const safety = useTrustSafety(subject);
  return (
    <AuthBoundary role={role}>
      <main className="mx-auto min-h-[60vh] max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-black">{t("verification.title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("verification.description")}</p>
        {safety.isHydrating ? (
          <p className="mt-6" role="status">
            {t("a11y.loading")}
          </p>
        ) : safety.isError ? (
          <p className="mt-6" role="alert">
            {t("safety.error")}
          </p>
        ) : (
          <section className="mt-6 rounded-2xl surface-card p-6 shadow-card">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-7 w-7 text-primary" aria-hidden="true" />
              <div>
                <h2 className="font-black">{t(`verification.status.${safety.status}`)}</h2>
                <p className="text-sm text-muted-foreground">
                  {t(`verification.guidance.${safety.status}`)}
                </p>
              </div>
            </div>
            {(safety.status === "NOT_SUBMITTED" || safety.status === "REJECTED") && (
              <Button
                className="mt-5"
                disabled={safety.isPending}
                onClick={() => void safety.submitVerification()}
              >
                {t(safety.status === "REJECTED" ? "verification.resubmit" : "verification.submit")}
              </Button>
            )}
          </section>
        )}
        <p className="mt-5 rounded-lg bg-secondary p-4 text-sm">
          {t("verification.documentsBoundary")}
        </p>
      </main>
    </AuthBoundary>
  );
}
