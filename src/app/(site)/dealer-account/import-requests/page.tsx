import type { Metadata } from "next";
import { ImportRequestsList } from "@/components/import-workflow/ImportRequestsList";
export const metadata: Metadata = {
  title: "Import opportunities",
  robots: { index: false, follow: false },
};
export default function Page() {
  return <ImportRequestsList dealer />;
}
