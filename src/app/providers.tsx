"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nProvider } from "@/lib/i18n";
import type { Locale, Theme } from "@/lib/i18n";
import { CompareTray } from "@/components/marketplace/CompareTray";
import { Toaster } from "@/components/ui/sonner";
import { AuthLifecycle } from "@/components/auth/AuthLifecycle";

export function Providers({
  children,
  locale,
  theme,
}: {
  children: ReactNode;
  locale: Locale;
  theme: Theme;
}) {
  // Stable per-browser-session QueryClient. Never shared across requests/users.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
          },
          mutations: { retry: 0 },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider initialLocale={locale} initialTheme={theme}>
        <AuthLifecycle />
        {children}
        <CompareTray />
        <Toaster position={locale === "ar" ? "bottom-left" : "bottom-right"} />
      </I18nProvider>
    </QueryClientProvider>
  );
}
