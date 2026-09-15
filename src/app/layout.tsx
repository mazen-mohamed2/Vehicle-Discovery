import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { cookies } from "next/headers";
import type { Locale, Theme } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/server-locale";
import { rootDocumentAttributes, rootDocumentBootstrapScript } from "@/lib/root-document";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const title =
    locale === "ar"
      ? "سهلة درج — سوق السيارات الموثوق"
      : "Sahla Daraj — The trusted automotive marketplace";
  const description =
    locale === "ar"
      ? "سوق سيارات متكامل للأفراد والوكلاء والاستيراد الخاص."
      : "A complete marketplace for individual vehicles, verified dealers, and custom import.";
  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: title,
      template: "%s | Sahla Daraj",
    },
    description,
    authors: [{ name: "Sahla Daraj" }],
    icons: {
      icon: "/favicon.ico",
    },
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "Sahla Daraj",
      url: siteUrl,
    },
    twitter: {
      card: "summary_large_image",
    },
  };
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const locale: Locale = cookieStore.get("sd-locale")?.value === "en" ? "en" : "ar";
  const theme: Theme = cookieStore.get("sd-theme")?.value === "light" ? "light" : "dark";
  const root = rootDocumentAttributes(locale, theme);
  const rootBootstrap = rootDocumentBootstrapScript(root);
  return (
    <html {...root}>
      <head>
        <script id="root-document-bootstrap" dangerouslySetInnerHTML={{ __html: rootBootstrap }} />
      </head>
      <body>
        <Providers locale={locale} theme={theme}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
