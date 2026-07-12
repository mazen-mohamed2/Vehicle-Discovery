import type { Metadata } from "next";
import { ImportClient } from "./import-client";

export const metadata: Metadata = {
  title: "الاستيراد الخاص — سهلة درج",
  description: "قدّم طلب استيراد سيارتك واستقبل عروضاً تنافسية من وكلاء موثقين.",
  alternates: { canonical: "/import" },
  openGraph: { url: "/import" },
};

export default function ImportPage() {
  return <ImportClient />;
}
