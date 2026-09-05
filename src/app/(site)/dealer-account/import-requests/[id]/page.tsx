import type { Metadata } from "next";
import { ImportRequestDetail } from "@/components/import-workflow/ImportRequestDetail";
export const metadata: Metadata = {
  title: "Import opportunity",
  robots: { index: false, follow: false },
};
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ImportRequestDetail id={id} dealer />;
}
