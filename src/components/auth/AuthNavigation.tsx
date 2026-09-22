"use client";
import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { isAuthenticationDependentPath } from "@/lib/auth";

export function AuthNavigation({
  mobile = false,
  onNavigate,
}: {
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const auth = useAuth();
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const logout = async () => {
    try {
      await auth.logout();
      onNavigate?.();
      if (isAuthenticationDependentPath(pathname)) router.replace("/");
    } catch {
      toast.error(t("auth.error.logoutFailed"));
    }
  };
  if (auth.isHydrating)
    return (
      <Skeleton
        role="status"
        aria-label={t("auth.session.loading")}
        className={mobile ? "h-20 w-full" : "hidden h-9 w-28 md:block"}
      />
    );
  if (auth.isGuest)
    return mobile ? (
      <div className="grid grid-cols-2 gap-2">
        <Link href="/auth/login" onClick={onNavigate}>
          <Button variant="outline" size="sm" className="w-full">
            {t("nav.login")}
          </Button>
        </Link>
        <Link href="/auth/register" onClick={onNavigate}>
          <Button size="sm" className="w-full">
            {t("nav.register")}
          </Button>
        </Link>
      </div>
    ) : (
      <div className="hidden items-center md:flex">
        <Link href="/auth/login">
          <Button variant="ghost" size="sm">
            {t("nav.login")}
          </Button>
        </Link>
        <Link href="/auth/register">
          <Button variant="ghost" size="sm" className="hidden xl:inline-flex">
            {t("nav.register")}
          </Button>
        </Link>
      </div>
    );
  const accountHref = auth.role === "dealer" ? "/dealer-account" : "/account";
  if (mobile)
    return (
      <div className="grid gap-1 border-t pt-2">
        <p className="px-3 py-1 text-sm font-bold">{auth.user?.displayName}</p>
        <Link
          href={accountHref}
          onClick={onNavigate}
          aria-current={pathname === accountHref ? "page" : undefined}
          className="rounded-lg px-3 py-2 text-sm hover:bg-secondary"
        >
          {t(auth.role === "dealer" ? "auth.dealerAccount" : "auth.account")}
        </Link>
        <Link
          href={`${accountHref}/transactions`}
          onClick={onNavigate}
          aria-current={pathname.startsWith(`${accountHref}/transactions`) ? "page" : undefined}
          className="rounded-lg px-3 py-2 text-sm hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t("transactions.mine")}
        </Link>
        <Link
          href="/messages"
          onClick={onNavigate}
          className="rounded-lg px-3 py-2 text-sm hover:bg-secondary"
        >
          {t("messages.title")}
        </Link>
        <Link
          href={auth.role === "dealer" ? "/dealer-account/offers" : "/account/offers"}
          onClick={onNavigate}
          className="rounded-lg px-3 py-2 text-sm hover:bg-secondary"
        >
          {t("vehicleOffers.mine")}
        </Link>
        <Link
          href={
            auth.role === "dealer" ? "/dealer-account/received-offers" : "/account/received-offers"
          }
          onClick={onNavigate}
          className="rounded-lg px-3 py-2 text-sm hover:bg-secondary"
        >
          {t("vehicleOffers.received")}
        </Link>
        {auth.role === "user" && (
          <>
            <Link
              href="/account/verification"
              onClick={onNavigate}
              className="rounded-lg px-3 py-2 text-sm hover:bg-secondary"
            >
              {t("verification.title")}
            </Link>
            <Link
              href="/account/reports"
              onClick={onNavigate}
              className="rounded-lg px-3 py-2 text-sm hover:bg-secondary"
            >
              {t("safety.reports.mine")}
            </Link>
            <Link
              href="/account/profile"
              onClick={onNavigate}
              className="rounded-lg px-3 py-2 text-sm hover:bg-secondary"
            >
              {t("auth.profile")}
            </Link>
            <Link
              href="/account/import-requests"
              onClick={onNavigate}
              className="rounded-lg px-3 py-2 text-sm hover:bg-secondary"
            >
              {t("import.myRequests")}
            </Link>
          </>
        )}
        {auth.role === "dealer" && (
          <>
            <Link
              href="/dealer-account/verification"
              onClick={onNavigate}
              className="rounded-lg px-3 py-2 text-sm hover:bg-secondary"
            >
              {t("verification.title")}
            </Link>
            <Link
              href="/dealer-account/reports"
              onClick={onNavigate}
              className="rounded-lg px-3 py-2 text-sm hover:bg-secondary"
            >
              {t("safety.reports.mine")}
            </Link>
            <Link
              href="/dealer-account/import-requests"
              onClick={onNavigate}
              className="rounded-lg px-3 py-2 text-sm hover:bg-secondary"
            >
              {t("import.opportunities")}
            </Link>
          </>
        )}
        {auth.user?.dealerId && (
          <Link
            href={`/dealers/${auth.user.dealerId}`}
            onClick={onNavigate}
            className="rounded-lg px-3 py-2 text-sm hover:bg-secondary"
          >
            {t("auth.publicProfile")}
          </Link>
        )}
        <button
          className="rounded-lg px-3 py-2 text-start text-sm text-destructive hover:bg-secondary"
          onClick={() => {
            void logout();
          }}
        >
          {t("auth.logout")}
        </button>
      </div>
    );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="hidden max-w-40 gap-2 md:inline-flex"
          aria-label={t("auth.accountMenu")}
        >
          <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/10">
            <UserRound className="h-4 w-4" />
          </span>
          <span className="hidden max-w-24 truncate xl:inline">{auth.user?.displayName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{auth.user?.displayName}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={accountHref}>
            {t(auth.role === "dealer" ? "auth.dealerAccount" : "auth.account")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            href={`${accountHref}/transactions`}
            aria-current={pathname.startsWith(`${accountHref}/transactions`) ? "page" : undefined}
          >
            {t("transactions.mine")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/messages">{t("messages.title")}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={auth.role === "dealer" ? "/dealer-account/offers" : "/account/offers"}>
            {t("vehicleOffers.mine")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            href={
              auth.role === "dealer"
                ? "/dealer-account/received-offers"
                : "/account/received-offers"
            }
          >
            {t("vehicleOffers.received")}
          </Link>
        </DropdownMenuItem>
        {auth.role === "user" && (
          <>
            <DropdownMenuItem asChild>
              <Link href="/account/verification">{t("verification.title")}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/account/reports">{t("safety.reports.mine")}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/account/profile">{t("auth.profile")}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/account/import-requests">{t("import.myRequests")}</Link>
            </DropdownMenuItem>
          </>
        )}
        {auth.role === "dealer" && (
          <>
            <DropdownMenuItem asChild>
              <Link href="/dealer-account/verification">{t("verification.title")}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dealer-account/reports">{t("safety.reports.mine")}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dealer-account/import-requests">{t("import.opportunities")}</Link>
            </DropdownMenuItem>
          </>
        )}
        {auth.user?.dealerId && (
          <DropdownMenuItem asChild>
            <Link href={`/dealers/${auth.user.dealerId}`}>{t("auth.publicProfile")}</Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className={cn("text-destructive")} onSelect={() => void logout()}>
          <LogOut className="me-2 h-4 w-4" />
          {t("auth.logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
