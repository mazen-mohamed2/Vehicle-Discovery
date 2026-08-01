"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { PASSWORD_POLICY } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { authService } from "@/services/auth.service";
import { PasswordField } from "@/components/auth/PasswordField";
type TokenState = "checking" | "missing" | "invalid" | "expired" | "used" | "valid";
export function ResetPasswordClient() {
  const { t } = useI18n();
  const auth = useAuth();
  const token = useSearchParams().get("token") ?? "";
  const [state, setState] = useState<TokenState>("checking");
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const statusRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let current = true;
    void authService.validateResetToken(token).then((value) => {
      if (current) setState(value);
    });
    return () => {
      current = false;
    };
  }, [token]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const data = new FormData(e.currentTarget);
    const password = String(data.get("password") ?? "");
    const confirmation = String(data.get("confirmation") ?? "");
    if (!PASSWORD_POLICY.validate(password)) {
      setError(t("auth.error.passwordPolicy"));
      queueMicrotask(() => errorRef.current?.focus());
      return;
    }
    if (password !== confirmation) {
      setError(t("auth.error.passwordMatch"));
      queueMicrotask(() => errorRef.current?.focus());
      return;
    }
    setPending(true);
    try {
      await auth.resetPassword({ token, password });
      e.currentTarget.reset();
      setSuccess(true);
      queueMicrotask(() => statusRef.current?.focus());
    } catch {
      setError(t("auth.reset.invalid"));
    } finally {
      setPending(false);
    }
  }
  return (
    <AuthPageShell title={t("auth.reset.title")} description={t("auth.reset.description")}>
      {state === "checking" && (
        <p role="status" className="mt-5">
          {t("auth.pending")}
        </p>
      )}
      {state !== "checking" && state !== "valid" && (
        <div
          role="alert"
          className="mt-5 rounded-lg bg-destructive/10 p-4 text-sm text-destructive"
        >
          {t(`auth.reset.${state}`)}
        </div>
      )}
      {state === "valid" &&
        (success ? (
          <div
            ref={statusRef}
            tabIndex={-1}
            role="status"
            className="mt-5 rounded-lg bg-primary/10 p-4"
          >
            {t("auth.reset.success")}
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 grid gap-4" aria-busy={pending}>
            {error && (
              <div ref={errorRef} tabIndex={-1} role="alert" className="text-sm text-destructive">
                {error}
              </div>
            )}
            <PasswordField
              id="reset-password"
              name="password"
              label={t("auth.password.new")}
              describedBy="reset-policy"
              invalid={Boolean(error)}
            />
            <p id="reset-policy" className="text-xs text-muted-foreground">
              {t("auth.password.policy")}
            </p>
            <PasswordField
              id="reset-confirmation"
              name="confirmation"
              label={t("auth.password.confirm")}
            />
            <Button disabled={pending}>
              {pending ? t("auth.pending") : t("auth.reset.submit")}
            </Button>
          </form>
        ))}
      <Link
        href="/auth/login"
        className="mt-5 inline-block text-sm font-semibold text-primary hover:underline"
      >
        {t("auth.backLogin")}
      </Link>
    </AuthPageShell>
  );
}
