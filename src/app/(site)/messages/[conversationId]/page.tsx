import type { Metadata } from "next";
import { ConversationDetail } from "@/components/communication/ConversationDetail";
export const metadata: Metadata = {
  title: "Conversation — Sahla Daraj",
  robots: { index: false, follow: false },
};
export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  return <ConversationDetail id={conversationId} />;
}
