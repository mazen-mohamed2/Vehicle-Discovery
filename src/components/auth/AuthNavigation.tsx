"use client";
import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";
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
  const logout = async () => {
    try {
      await auth.logout();
      onNavigate?.();
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
        {auth.role === "user" && (
          <>
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
          <Link
            href="/dealer-account/import-requests"
            onClick={onNavigate}
            className="rounded-lg px-3 py-2 text-sm hover:bg-secondary"
          >
            {t("import.opportunities")}
          </Link>
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
        {auth.role === "user" && (
          <>
            <DropdownMenuItem asChild>
              <Link href="/account/profile">{t("auth.profile")}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/account/import-requests">{t("import.myRequests")}</Link>
            </DropdownMenuItem>
          </>
        )}
        {auth.role === "dealer" && (
          <DropdownMenuItem asChild>
            <Link href="/dealer-account/import-requests">{t("import.opportunities")}</Link>
          </DropdownMenuItem>
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
