"use client";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { PasswordField } from "@/components/auth/PasswordField";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/hooks/use-auth";
import {
  AuthServiceError,
  validateRegistration,
  type RegistrationPayload,
  type UserRole,
} from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

const fieldId = (name: string) => `register-${name}`;
export function RegisterClient() {
  const { t } = useI18n();
  const auth = useAuth();
  const router = useRouter();
  const [role, setRole] = useState<UserRole>("user");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const summaryRef = useRef<HTMLDivElement>(null);
  const message = (field: string, code?: string) => {
    if (field === "email") return t("auth.error.emailInvalid");
    if (field === "phone") return t("auth.error.phoneInvalid");
    if (field === "password") return t("auth.error.passwordPolicy");
    if (field === "terms") return t("auth.error.terms");
    return t(code === "required" ? "auth.error.fieldRequired" : "auth.error.nameInvalid");
  };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (auth.isPending) return;
    setErrors({});
    const form = event.currentTarget;
    const data = new FormData(form);
    const password = String(data.get("password") ?? "");
    const confirmation = String(data.get("confirmation") ?? "");
    const terms = data.get("terms") === "on";
    const payload: RegistrationPayload =
      role === "user"
        ? {
            role,
            displayName: String(data.get("displayName") ?? ""),
            email: String(data.get("email") ?? ""),
            phone: String(data.get("phone") ?? ""),
            password,
            terms,
          }
        : {
            role,
            businessName: String(data.get("businessName") ?? ""),
            contactName: String(data.get("contactName") ?? ""),
            email: String(data.get("email") ?? ""),
            phone: String(data.get("phone") ?? ""),
            city: String(data.get("city") ?? ""),
            password,
            terms,
          };
    const next: Record<string, string> = {};
    try {
      validateRegistration(payload);
    } catch (caught) {
      if (caught instanceof AuthServiceError)
        for (const [field, code] of Object.entries(caught.fields))
          next[field] = message(field, code);
    }
    if (password !== confirmation) next.confirmation = t("auth.error.passwordMatch");
    if (Object.keys(next).length) {
      setErrors(next);
      queueMicrotask(() => {
        summaryRef.current?.focus();
        document.getElementById(fieldId(Object.keys(next)[0]))?.focus();
      });
      return;
    }
    try {
      if (role === "user") await auth.registerIndividual(payload);
      else await auth.registerDealer(payload);
      form.reset();
      router.replace(role === "dealer" ? "/dealer-account" : "/account");
    } catch {
      setErrors({ form: t("auth.error.required") });
      queueMicrotask(() => summaryRef.current?.focus());
    }
  }
  const field = (name: string, label: string, autocomplete: string, type = "text") => (
    <div className="grid gap-2">
      <Label htmlFor={fieldId(name)}>{label}</Label>
      <Input
        id={fieldId(name)}
        name={name}
        type={type}
        autoComplete={autocomplete}
        aria-invalid={Boolean(errors[name])}
        aria-describedby={errors[name] ? `${fieldId(name)}-error` : undefined}
      />
      {errors[name] && (
        <p id={`${fieldId(name)}-error`} className="text-sm text-destructive">
          {errors[name]}
        </p>
      )}
    </div>
  );
  return (
    <AuthPageShell title={t("auth.register.title")} description={t("auth.register.description")}>
      <p className="mt-4 rounded-lg bg-secondary p-3 text-sm text-muted-foreground">
        {t("auth.register.temporary")}
      </p>
      <RadioGroup
        value={role}
        onValueChange={(value) => setRole(value as UserRole)}
        aria-label={t("auth.accountType")}
        className="mt-5 grid grid-cols-2 gap-2"
      >
        {(["user", "dealer"] as const).map((value) => (
          <Label
            key={value}
            htmlFor={`role-${value}`}
            className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 focus-within:ring-2 focus-within:ring-ring"
          >
            <RadioGroupItem id={`role-${value}`} value={value} />
            {t(`auth.role.${value}`)}
          </Label>
        ))}
      </RadioGroup>
      {Object.keys(errors).length > 0 && (
        <div
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
        >
          {t("auth.error.summary")}
        </div>
      )}
      <form onSubmit={submit} noValidate aria-busy={auth.isPending} className="mt-5 grid gap-4">
        {role === "user" ? (
          field("displayName", t("form.name"), "name")
        ) : (
          <>
            {field("businessName", t("auth.businessName"), "organization")}
            {field("contactName", t("auth.contactName"), "name")}
          </>
        )}
        {field("email", t("form.email"), "email", "email")}
        {field("phone", t("auth.phone"), "tel", "tel")}
        {role === "dealer" && field("city", t("auth.city"), "address-level2")}
        <PasswordField
          id={fieldId("password")}
          name="password"
          label={t("form.password")}
          describedBy={
            errors.password ? `${fieldId("password")}-error password-policy` : "password-policy"
          }
          invalid={Boolean(errors.password)}
        />
        <p id="password-policy" className="text-xs text-muted-foreground">
          {t("auth.password.policy")}
        </p>
        {errors.password && (
          <p id={`${fieldId("password")}-error`} className="text-sm text-destructive">
            {errors.password}
          </p>
        )}
        <PasswordField
          id={fieldId("confirmation")}
          name="confirmation"
          label={t("auth.password.confirm")}
          describedBy={errors.confirmation ? `${fieldId("confirmation")}-error` : undefined}
          invalid={Boolean(errors.confirmation)}
        />
        {errors.confirmation && (
          <p id={`${fieldId("confirmation")}-error`} className="text-sm text-destructive">
            {errors.confirmation}
          </p>
        )}
        <div>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              id={fieldId("terms")}
              name="terms"
              aria-invalid={Boolean(errors.terms)}
              aria-describedby={errors.terms ? `${fieldId("terms")}-error` : undefined}
            />
            <span>{t("auth.terms")}</span>
          </label>
          {errors.terms && (
            <p id={`${fieldId("terms")}-error`} className="mt-1 text-sm text-destructive">
              {errors.terms}
            </p>
          )}
        </div>
        <Button disabled={auth.isPending} className="gradient-primary text-primary-foreground">
          {auth.isPending ? t("auth.pending") : t("auth.register.submit")}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm">
        <Link href="/auth/login" className="font-semibold text-primary hover:underline">
          {t("nav.login")}
        </Link>
      </p>
    </AuthPageShell>
  );
}
