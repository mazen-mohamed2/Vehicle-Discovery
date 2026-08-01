"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import type { UserRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function AuthBoundary({ children, role }: { children: ReactNode; role?: UserRole }) {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { t } = useI18n();
  const allowed = auth.isAuthenticated && (!role || auth.hasRole(role));
  useEffect(() => {
    if (auth.isHydrating || allowed) return;
    if (auth.isGuest) {
      const returnTo = `${pathname}${params.size ? `?${params}` : ""}`;
      router.replace(`/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
    }
  }, [allowed, auth.isGuest, auth.isHydrating, params, pathname, router]);
  if (auth.isHydrating || auth.isGuest)
    return (
      <div
        role="status"
        className="mx-auto grid min-h-[60vh] max-w-lg place-items-center px-4 text-center text-muted-foreground"
      >
        {t("auth.protected.loading")}
      </div>
    );
  if (!allowed)
    return (
      <div className="mx-auto grid min-h-[60vh] max-w-lg place-items-center px-4 text-center">
        <div>
          <ShieldCheck className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-4 text-2xl font-black">{t("auth.unauthorized")}</h1>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button asChild>
              <Link href={auth.role === "dealer" ? "/dealer-account" : "/account"}>
                {t("auth.roleDenied.account")}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">{t("auth.roleDenied.home")}</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  return children;
}
