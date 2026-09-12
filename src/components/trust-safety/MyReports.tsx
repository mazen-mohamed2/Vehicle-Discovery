"use client";

import { AuthBoundary } from "@/components/auth/AuthBoundary";
import { useTrustSafety } from "@/hooks/use-trust-safety";
import { useI18n } from "@/lib/i18n";
import { formatDate } from "@/lib/locale";

export function MyReports({ role }: { role: "user" | "dealer" }) {
  const { t, locale } = useI18n();
  const safety = useTrustSafety();
  return (
    <AuthBoundary role={role}>
      <main className="mx-auto min-h-[60vh] max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-black">{t("safety.reports.mine")}</h1>
        {safety.isHydrating ? (
          <p className="mt-6" role="status">
            {t("a11y.loading")}
          </p>
        ) : safety.isError ? (
          <p className="mt-6" role="alert">
            {t("safety.error")}
          </p>
        ) : safety.reports.length === 0 ? (
          <section className="mt-6 rounded-2xl surface-card p-10 text-center">
            <h2 className="text-xl font-black">{t("safety.reports.empty")}</h2>
          </section>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {safety.reports.map((report) => (
              <article key={report.id} className="rounded-2xl surface-card p-5 shadow-card">
                <h2 className="font-black">{t(`safety.report.target.${report.targetType}`)}</h2>
                <dl className="mt-3 grid gap-2 text-sm">
                  <div>
                    <dt className="text-muted-foreground">{t("safety.report.reason")}</dt>
                    <dd>{t(`safety.report.reason.${report.reason}`)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t("safety.report.status")}</dt>
                    <dd>{t(`safety.report.status.${report.status}`)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t("safety.report.submitted")}</dt>
                    <dd>{formatDate(report.createdAt, locale)}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </main>
    </AuthBoundary>
  );
}
