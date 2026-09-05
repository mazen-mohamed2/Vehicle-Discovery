import type { Metadata } from "next";
import { ImportRequestsList } from "@/components/import-workflow/ImportRequestsList";
export const metadata: Metadata = {
  title: "My import requests",
  robots: { index: false, follow: false },
};
export default function Page() {
  return <ImportRequestsList />;
}
