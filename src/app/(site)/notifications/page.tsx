import type { Metadata } from "next";
import { NotificationCenter } from "@/components/communication/NotificationCenter";
export const metadata: Metadata = {
  title: "Notifications — Sahla Daraj",
  robots: { index: false, follow: false },
};
export default function NotificationsPage() {
  return <NotificationCenter />;
}
