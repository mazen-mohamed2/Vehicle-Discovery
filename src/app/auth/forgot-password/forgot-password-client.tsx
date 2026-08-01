"use client";
import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { AuthServiceError, validateRecoveryIdentifier } from "@/lib/auth";
export function ForgotPasswordClient() {
  const { t } = useI18n();
  const auth = useAuth();
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const status = useRef<HTMLDivElement>(null);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const identifier = String(new FormData(e.currentTarget).get("identifier") ?? "").trim();
    try {
      validateRecoveryIdentifier(identifier);
    } catch (caught) {
      if (caught instanceof AuthServiceError) {
        setError(
          t(
            caught.fields.identifier === "required"
              ? "auth.error.identifierRequired"
              : "auth.error.identifierInvalid",
          ),
        );
        return;
      }
    }
    setPending(true);
    setError("");
    try {
      await auth.forgotPassword({ identifier });
      setSuccess(true);
      queueMicrotask(() => status.current?.focus());
    } finally {
      setPending(false);
    }
  }
  return (
    <AuthPageShell title={t("auth.forgot.title")} description={t("auth.forgot.description")}>
      {success ? (
        <div
          ref={status}
          tabIndex={-1}
          role="status"
          className="mt-5 rounded-lg bg-primary/10 p-4 text-sm"
        >
          {t("auth.forgot.success")}
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 grid gap-4" aria-busy={pending}>
          <div className="grid gap-2">
            <Label htmlFor="recovery-identifier">{t("auth.identifier")}</Label>
            <Input
              id="recovery-identifier"
              name="identifier"
              autoComplete="username"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "recovery-error" : undefined}
            />
            {error && (
              <p id="recovery-error" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
          <Button disabled={pending}>
            {pending ? t("auth.pending") : t("auth.forgot.submit")}
          </Button>
        </form>
      )}
      <Link
        href="/auth/login"
        className="mt-5 inline-block text-sm font-semibold text-primary hover:underline"
      >
        {t("auth.backLogin")}
      </Link>
    </AuthPageShell>
  );
}
