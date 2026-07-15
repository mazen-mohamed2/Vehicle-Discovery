"use client";

import { useEffect } from "react";
import { reportLovableError } from "@/lib/lovable-error-reporting";
import { useI18n } from "@/lib/i18n";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();
  useEffect(() => {
    reportLovableError(error, { boundary: "nextjs_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">{t("error.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("error.description")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => reset()}
            className="rounded-md gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            {t("error.tryAgain")}
          </button>
          <a
            href="/"
            className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium"
          >
            {t("error.home")}
          </a>
        </div>
      </div>
    </div>
  );
}
