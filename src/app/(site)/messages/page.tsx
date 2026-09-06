import type { Metadata } from "next";
import { ConversationList } from "@/components/communication/ConversationList";
export const metadata: Metadata = {
  title: "Messages — Sahla Daraj",
  robots: { index: false, follow: false },
};
export default function MessagesPage() {
  return <ConversationList />;
}
