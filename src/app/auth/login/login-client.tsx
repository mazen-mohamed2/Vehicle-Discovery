"use client";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { AuthServiceError, roleAwareReturnPath, validateLogin, type AuthField } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export function LoginClient() {
  const { t } = useI18n();
  const auth = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<AuthField, string>>>({});
  const errorRef = useRef<HTMLDivElement>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (auth.isPending) return;
    setError("");
    setFieldErrors({});
    const data = new FormData(event.currentTarget);
    const credentials = {
      identifier: String(data.get("identifier") ?? ""),
      password: String(data.get("password") ?? ""),
      remember,
    };
    try {
      validateLogin(credentials);
    } catch (caught) {
      if (caught instanceof AuthServiceError) {
        const next: Partial<Record<AuthField, string>> = {};
        if (caught.fields.identifier)
          next.identifier = t(
            caught.fields.identifier === "required"
              ? "auth.error.identifierRequired"
              : "auth.error.identifierInvalid",
          );
        if (caught.fields.password) next.password = t("auth.error.passwordRequired");
        setFieldErrors(next);
        queueMicrotask(() =>
          document.getElementById(next.identifier ? "login-identifier" : "login-password")?.focus(),
        );
        return;
      }
    }
    try {
      const result = await auth.login(credentials);
      router.replace(roleAwareReturnPath(params.get("returnTo"), result.user.role));
    } catch (caught) {
      setError(
        caught instanceof AuthServiceError && caught.code === "STORAGE_ERROR"
          ? t("auth.error.logoutFailed")
          : t("auth.error.invalidCredentials"),
      );
      queueMicrotask(() => errorRef.current?.focus());
    }
  }
  const hasErrors = Boolean(error) || Object.keys(fieldErrors).length > 0;
  return (
    <AuthPageShell title={t("auth.login.title")} description={t("auth.login.description")}>
      {hasErrors && (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error || t("auth.error.summary")}
        </div>
      )}
      <form className="mt-6 grid gap-4" onSubmit={submit} noValidate aria-busy={auth.isPending}>
        <div className="grid gap-2">
          <Label htmlFor="login-identifier">{t("auth.identifier")}</Label>
          <Input
            id="login-identifier"
            name="identifier"
            autoComplete="username"
            aria-invalid={Boolean(fieldErrors.identifier)}
            aria-describedby={fieldErrors.identifier ? "login-identifier-error" : undefined}
          />
          {fieldErrors.identifier && (
            <p id="login-identifier-error" className="text-sm text-destructive">
              {fieldErrors.identifier}
            </p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="login-password">{t("form.password")}</Label>
          <div className="relative">
            <Input
              id="login-password"
              name="password"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              className="pe-11"
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? "login-password-error" : undefined}
            />
            <button
              type="button"
              onClick={() => setShow((value) => !value)}
              aria-label={t(show ? "auth.password.hide" : "auth.password.show")}
              className="absolute end-1 top-1 grid h-8 w-8 place-items-center rounded focus-visible:ring-2 focus-visible:ring-ring"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {fieldErrors.password && (
            <p id="login-password-error" className="text-sm text-destructive">
              {fieldErrors.password}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 text-sm">
          <label className="flex items-center gap-2">
            <Checkbox checked={remember} onCheckedChange={(value) => setRemember(value === true)} />
            {t("auth.remember")}
          </label>
          <Link href="/auth/forgot-password" className="font-semibold text-primary hover:underline">
            {t("auth.forgot.link")}
          </Link>
        </div>
        <Button disabled={auth.isPending} className="gradient-primary text-primary-foreground">
          {auth.isPending ? t("auth.pending") : t("auth.login.title")}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={auth.isPending}
          onClick={async () => {
            try {
              const result = await auth.loginWithGoogleMock();
              router.replace(roleAwareReturnPath(params.get("returnTo"), result.user.role));
            } catch {
              setError(t("auth.error.invalidCredentials"));
            }
          }}
        >
          {t("auth.google")}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("auth.noAccount")}{" "}
        <Link href="/auth/register" className="font-semibold text-primary hover:underline">
          {t("nav.register")}
        </Link>
      </p>
    </AuthPageShell>
  );
}
