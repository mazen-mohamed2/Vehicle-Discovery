import { TrustSafetyError, type BlockRelationship } from "@/lib/trust-safety";

const KEY = "sd-marketplace-blocks";
const EVENT = "sd-marketplace-blocks-change";
const storage = () => (typeof window === "undefined" ? null : window.localStorage);
const object = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

function read(): BlockRelationship[] {
  try {
    const raw = storage()?.getItem(KEY);
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    if (
      !Array.isArray(value) ||
      !value.every(
        (item) =>
          object(item) &&
          typeof item.blockerUserId === "string" &&
          typeof item.blockedUserId === "string" &&
          typeof item.createdAt === "string",
      )
    )
      throw new Error("invalid");
    return value as BlockRelationship[];
  } catch {
    throw new TrustSafetyError("STORAGE_READ_FAILED");
  }
}

function write(value: BlockRelationship[]) {
  try {
    storage()?.setItem(KEY, JSON.stringify(value));
    if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
  } catch {
    throw new TrustSafetyError("STORAGE_WRITE_FAILED");
  }
}

function assertContext(actorId: string, otherId: string, participants: readonly string[]) {
  if (actorId === otherId) throw new TrustSafetyError("SELF_ACTION");
  if (!participants.includes(actorId) || !participants.includes(otherId))
    throw new TrustSafetyError("FORBIDDEN");
}

export const blocksService = {
  list(actorId: string) {
    return read().filter((item) => item.blockerUserId === actorId);
  },
  areBlocked(firstId: string, secondId: string) {
    return read().some(
      (item) =>
        (item.blockerUserId === firstId && item.blockedUserId === secondId) ||
        (item.blockerUserId === secondId && item.blockedUserId === firstId),
    );
  },
  block(actorId: string, otherId: string, participants: readonly string[]) {
    assertContext(actorId, otherId, participants);
    const existing = read().find(
      (item) => item.blockerUserId === actorId && item.blockedUserId === otherId,
    );
    if (existing) return existing;
    const relationship = {
      blockerUserId: actorId,
      blockedUserId: otherId,
      createdAt: new Date().toISOString(),
    };
    write([...read(), relationship]);
    return relationship;
  },
  unblock(actorId: string, otherId: string, participants: readonly string[]) {
    assertContext(actorId, otherId, participants);
    const existing = read().find(
      (item) => item.blockerUserId === actorId && item.blockedUserId === otherId,
    );
    if (
      !existing &&
      read().some((item) => item.blockerUserId === otherId && item.blockedUserId === actorId)
    )
      throw new TrustSafetyError("FORBIDDEN");
    write(
      read().filter((item) => !(item.blockerUserId === actorId && item.blockedUserId === otherId)),
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
