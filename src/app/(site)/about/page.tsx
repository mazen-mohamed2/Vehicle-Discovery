import type { Metadata } from "next";
import { AboutClient } from "./about-client";

export const metadata: Metadata = {
  title: "من نحن — سهلة درج",
  description: "سهلة درج منصة موثوقة تجمع مشتري السيارات، البائعين، والوكلاء في تجربة واحدة آمنة.",
  alternates: { canonical: "/about" },
  openGraph: { url: "/about" },
};

export default function AboutPage() {
  return <AboutClient />;
}
