import type { Metadata } from "next";
import { Cairo, Tajawal } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-cairo",
  display: "swap",
});

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-tajawal",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "سهلة درج — سوق السيارات الموثوق | Sahla Daraj",
    template: "%s | Sahla Daraj",
  },
  description:
    "سهلة درج — سوق سيارات متكامل في مصر والمنطقة العربية: سيارات الأفراد، وكلاء موثقون، واستيراد خاص محمي بالضمان.",
  authors: [{ name: "Sahla Daraj" }],
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "سهلة درج — Sahla Daraj",
    description: "سوق السيارات المتكامل: أفراد، وكلاء، واستيراد خاص محمي بالضمان.",
    type: "website",
    siteName: "Sahla Daraj",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`dark ${cairo.variable} ${tajawal.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
