"use client";
import { AuthBoundary } from "@/components/auth/AuthBoundary";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import type { UserRole } from "@/lib/auth";
export function AccountPlaceholder({
  role,
  profile = false,
}: {
  role?: UserRole;
  profile?: boolean;
}) {
  const auth = useAuth();
  const { t } = useI18n();
  return (
    <AuthBoundary role={role}>
      <main className="mx-auto min-h-[60vh] max-w-4xl px-4 py-12 sm:px-6">
        <section className="rounded-2xl surface-card p-6 shadow-card">
          <p className="text-sm font-bold text-primary">{t("auth.account.private")}</p>
          <h1 className="mt-2 text-3xl font-black">
            {t(
              profile ? "auth.profile" : role === "dealer" ? "auth.dealerAccount" : "auth.account",
            )}
          </h1>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted-foreground">{t("form.name")}</dt>
              <dd className="font-bold">{auth.user?.displayName}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">{t("form.email")}</dt>
              <dd className="font-bold">{auth.user?.email}</dd>
            </div>
          </dl>
          <p className="mt-8 rounded-lg bg-secondary p-4 text-sm text-muted-foreground">
            {t("auth.account.future")}
          </p>
        </section>
      </main>
    </AuthBoundary>
  );
}
