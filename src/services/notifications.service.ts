import {
  CommunicationError,
  type CommunicationActor,
  type WebsiteNotificationRecord,
  type WebsiteNotificationType,
} from "@/lib/communication";

const KEY = "sd-website-notifications";
const EVENT = "sd-website-notifications-change";
const storage = () => (typeof window === "undefined" ? null : window.localStorage);

function read(): WebsiteNotificationRecord[] {
  try {
    const raw = storage()?.getItem(KEY);
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    if (
      !Array.isArray(value) ||
      !value.every(
        (item) =>
          item &&
          typeof item === "object" &&
          typeof item.id === "string" &&
          typeof item.recipientUserId === "string" &&
          typeof item.type === "string" &&
          typeof item.relatedId === "string" &&
          typeof item.href === "string" &&
          item.href.startsWith("/") &&
          !item.href.startsWith("//") &&
          typeof item.createdAt === "string",
      )
    )
      throw new Error("invalid");
    return value as WebsiteNotificationRecord[];
  } catch {
    throw new CommunicationError("STORAGE_READ_FAILED");
  }
}

function write(value: WebsiteNotificationRecord[]) {
  const target = storage();
  if (!target) return;
  try {
    target.setItem(KEY, JSON.stringify(value));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    throw new CommunicationError("STORAGE_WRITE_FAILED");
  }
}

export const notificationsService = {
  create(recipientUserId: string, type: WebsiteNotificationType, relatedId: string, href: string) {
    if (!href.startsWith("/") || href.startsWith("//"))
      throw new CommunicationError("VALIDATION_ERROR", { href: "invalid" });
    const notification: WebsiteNotificationRecord = {
      id: `notification_${crypto.randomUUID()}`,
      recipientUserId,
      type,
      relatedId,
      href,
      createdAt: new Date().toISOString(),
    };
    write([...read(), notification]);
    return notification;
  },
  list(actor: CommunicationActor) {
    return read()
      .filter((item) => item.recipientUserId === actor.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  unreadCount(actor: CommunicationActor) {
    return this.list(actor).filter((item) => !item.readAt).length;
  },
  markRead(actor: CommunicationActor, id: string) {
    const current = read().find((item) => item.id === id);
    if (!current) throw new CommunicationError("NOT_FOUND");
    if (current.recipientUserId !== actor.id) throw new CommunicationError("FORBIDDEN");
    if (current.readAt) return current;
    const updated = { ...current, readAt: new Date().toISOString() };
    write(read().map((item) => (item.id === id ? updated : item)));
    return updated;
  },
  markAllRead(actor: CommunicationActor) {
    const now = new Date().toISOString();
    write(
      read().map((item) =>
        item.recipientUserId === actor.id && !item.readAt ? { ...item, readAt: now } : item,
      ),
    );
  },
  markConversationRead(actor: CommunicationActor, conversationId: string) {
    const now = new Date().toISOString();
    write(
      read().map((item) =>
        item.recipientUserId === actor.id &&
        item.type === "NEW_MESSAGE" &&
        item.relatedId === conversationId &&
        !item.readAt
          ? { ...item, readAt: now }
          : item,
      ),
    );
  },
  subscribe(callback: () => void) {
    if (typeof window === "undefined") return () => undefined;
    const storageHandler = (event: StorageEvent) => {
      if (event.key === KEY) callback();
    };
    window.addEventListener(EVENT, callback);
    window.addEventListener("storage", storageHandler);
    return () => {
      window.removeEventListener(EVENT, callback);
      window.removeEventListener("storage", storageHandler);
    };
  },
};
