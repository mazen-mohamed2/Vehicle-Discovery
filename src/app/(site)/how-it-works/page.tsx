import type { Metadata } from "next";
import { HowItWorksClient } from "./how-it-works-client";

export const metadata: Metadata = {
  title: "كيف يعمل سهلة درج",
  description: "كيف يعمل سوق السيارات سهلة درج: البحث، الحماية بالضمان، إتمام الصفقة، والتوصيل.",
  alternates: { canonical: "/how-it-works" },
  openGraph: { url: "/how-it-works" },
};

export default function HowItWorksPage() {
  return <HowItWorksClient />;
}
