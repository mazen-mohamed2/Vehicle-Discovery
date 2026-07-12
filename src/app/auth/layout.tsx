import type { ReactNode } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <SiteLayout>{children}</SiteLayout>;
}
