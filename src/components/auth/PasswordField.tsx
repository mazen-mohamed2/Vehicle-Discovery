"use client";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
export function PasswordField({
  id,
  name,
  label,
  describedBy,
  invalid = false,
  autoComplete = "new-password",
}: {
  id: string;
  name: string;
  label: string;
  describedBy?: string;
  invalid?: boolean;
  autoComplete?: "new-password" | "current-password";
}) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          className="pe-11"
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={t(visible ? "auth.password.hide" : "auth.password.show")}
          className="absolute end-1 top-1 grid h-8 w-8 place-items-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
