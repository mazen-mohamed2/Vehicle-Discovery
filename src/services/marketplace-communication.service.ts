import {
  CommunicationError,
  type CommunicationActor,
  type ConversationSummary,
  type ConversationRecord,
  type MessageRecord,
  type VehicleOfferRecord,
} from "@/lib/communication";
import { publicCatalogService } from "@/services/public-catalog.service";
import { notificationsService } from "@/services/notifications.service";
import { developmentPublicProfile } from "@/services/auth.service";
import type { VehicleListing } from "@/lib/types";
import { blocksService } from "@/services/blocks.service";

const CONVERSATIONS_KEY = "sd-marketplace-conversations";
const MESSAGES_KEY = "sd-marketplace-messages";
const OFFERS_KEY = "sd-marketplace-vehicle-offers";
const EVENT = "sd-marketplace-communication-change";
const storage = () => (typeof window === "undefined" ? null : window.localStorage);

function parse<T>(key: string, valid: (item: unknown) => boolean): T[] {
  try {
    const raw = storage()?.getItem(key);
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value) || !value.every(valid)) throw new Error("invalid");
    return value as T[];
  } catch {
    throw new CommunicationError("STORAGE_READ_FAILED");
  }
}
const object = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
const conversations = () =>
  parse<ConversationRecord>(
    CONVERSATIONS_KEY,
    (item) =>
      object(item) &&
      typeof item.id === "string" &&
      Array.isArray(item.participantUserIds) &&
      item.participantUserIds.length === 2 &&
      item.participantUserIds.every((id) => typeof id === "string") &&
      typeof item.buyerUserId === "string" &&
      typeof item.sellerUserId === "string" &&
      typeof item.listingId === "string" &&
      item.contextType === "VEHICLE_LISTING" &&
      typeof item.createdAt === "string" &&
      typeof item.updatedAt === "string",
  );
const messages = () =>
  parse<MessageRecord>(
    MESSAGES_KEY,
    (item) =>
      object(item) &&
      typeof item.id === "string" &&
      typeof item.conversationId === "string" &&
      typeof item.senderUserId === "string" &&
      typeof item.body === "string" &&
      Array.isArray(item.readByUserIds) &&
      typeof item.createdAt === "string",
  );
const offers = () =>
  parse<VehicleOfferRecord>(
    OFFERS_KEY,
    (item) =>
      object(item) &&
      typeof item.id === "string" &&
      typeof item.listingId === "string" &&
      typeof item.buyerUserId === "string" &&
      typeof item.sellerUserId === "string" &&
      typeof item.amount === "number" &&
      (item.currency === "EGP" || item.currency === "USD") &&
      (item.status === "PENDING" ||
        item.status === "ACCEPTED" ||
        item.status === "REJECTED" ||
        item.status === "WITHDRAWN") &&
      typeof item.createdAt === "string" &&
      typeof item.updatedAt === "string",
  );

function write<T>(key: string, value: T[]) {
  const target = storage();
  if (!target) return;
  try {
    target.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    throw new CommunicationError("STORAGE_WRITE_FAILED");
  }
}
function listingForInteraction(listingId: string): VehicleListing & { sellerUserId: string } {
  const listing = publicCatalogService.byId(listingId);
  if (!listing) throw new CommunicationError("LISTING_NOT_ELIGIBLE");
  if (!listing.sellerUserId) throw new CommunicationError("LISTING_NOT_ELIGIBLE");
  return listing as VehicleListing & { sellerUserId: string };
}
function conversationFor(actor: CommunicationActor, id: string) {
  const conversation = conversations().find((item) => item.id === id);
  if (!conversation) throw new CommunicationError("NOT_FOUND");
  if (!conversation.participantUserIds.includes(actor.id))
    throw new CommunicationError("FORBIDDEN");
  return conversation;
}
function offerFor(id: string) {
  const offer = offers().find((item) => item.id === id);
  if (!offer) throw new CommunicationError("NOT_FOUND");
  return offer;
}
const buyerOffersHref = (userId: string) =>
  developmentPublicProfile(userId)?.role === "dealer"
    ? "/dealer-account/offers"
    : "/account/offers";

export const marketplaceCommunicationService = {
  startConversation(actor: CommunicationActor, listingId: string) {
    const listing = listingForInteraction(listingId);
    if (listing.sellerUserId === actor.id) throw new CommunicationError("SELF_INTERACTION");
    if (blocksService.areBlocked(actor.id, listing.sellerUserId))
      throw new CommunicationError("BLOCKED");
    const existing = conversations().find(
      (item) =>
        item.listingId === listingId &&
        item.buyerUserId === actor.id &&
        item.sellerUserId === listing.sellerUserId,
    );
    if (existing) return existing;
    const now = new Date().toISOString();
    const conversation: ConversationRecord = {
      id: `conversation_${crypto.randomUUID()}`,
      participantUserIds: [actor.id, listing.sellerUserId],
      buyerUserId: actor.id,
      sellerUserId: listing.sellerUserId,
      listingId,
      contextType: "VEHICLE_LISTING",
      createdAt: now,
      updatedAt: now,
    };
    write(CONVERSATIONS_KEY, [...conversations(), conversation]);
    return conversation;
  },
  participantConversations(actor: CommunicationActor) {
    return conversations()
      .filter((item) => item.participantUserIds.includes(actor.id))
      .sort((a, b) =>
        (b.lastMessageAt ?? b.createdAt).localeCompare(a.lastMessageAt ?? a.createdAt),
      );
  },
  conversationSummaries(actor: CommunicationActor): ConversationSummary[] {
    const allMessages = messages();
    return this.participantConversations(actor).map((conversation) => {
      const related = allMessages
        .filter((message) => message.conversationId === conversation.id)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      return {
        conversation,
        lastMessage: related.at(-1),
        unreadCount: related.filter(
          (message) =>
            message.senderUserId !== actor.id && !message.readByUserIds.includes(actor.id),
        ).length,
      };
    });
  },
  conversation(actor: CommunicationActor, id: string) {
    return conversationFor(actor, id);
  },
  messages(actor: CommunicationActor, conversationId: string) {
    conversationFor(actor, conversationId);
    return messages()
      .filter((item) => item.conversationId === conversationId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },
  sendMessage(actor: CommunicationActor, conversationId: string, body: string) {
    const conversation = conversationFor(actor, conversationId);
    const recipient = conversation.participantUserIds.find((id) => id !== actor.id)!;
    if (blocksService.areBlocked(actor.id, recipient)) throw new CommunicationError("BLOCKED");
    const clean = body.trim();
    if (!clean || clean.length > 2000)
      throw new CommunicationError("VALIDATION_ERROR", { body: clean ? "length" : "required" });
    const now = new Date().toISOString();
    const message: MessageRecord = {
      id: `message_${crypto.randomUUID()}`,
      conversationId,
      senderUserId: actor.id,
      body: clean,
      readByUserIds: [actor.id],
      createdAt: now,
    };
    write(MESSAGES_KEY, [...messages(), message]);
    write(
      CONVERSATIONS_KEY,
      conversations().map((item) =>
        item.id === conversationId ? { ...item, updatedAt: now, lastMessageAt: now } : item,
      ),
    );
    notificationsService.create(
      recipient,
      "NEW_MESSAGE",
      conversationId,
      `/messages/${conversationId}`,
    );
    return message;
  },
  markConversationRead(actor: CommunicationActor, conversationId: string) {
    conversationFor(actor, conversationId);
    write(
      MESSAGES_KEY,
      messages().map((item) =>
        item.conversationId === conversationId && !item.readByUserIds.includes(actor.id)
          ? { ...item, readByUserIds: [...item.readByUserIds, actor.id] }
          : item,
      ),
    );
    notificationsService.markConversationRead(actor, conversationId);
  },
  blockState(actor: CommunicationActor, conversationId: string) {
    const conversation = conversationFor(actor, conversationId);
    const otherId = conversation.participantUserIds.find((id) => id !== actor.id)!;
    const mine = blocksService.list(actor.id).some((item) => item.blockedUserId === otherId);
    return { blocked: blocksService.areBlocked(actor.id, otherId), blockedByMe: mine, otherId };
  },
  blockParticipant(actor: CommunicationActor, conversationId: string) {
    const conversation = conversationFor(actor, conversationId);
    const otherId = conversation.participantUserIds.find((id) => id !== actor.id)!;
    return blocksService.block(actor.id, otherId, conversation.participantUserIds);
  },
  unblockParticipant(actor: CommunicationActor, conversationId: string) {
    const conversation = conversationFor(actor, conversationId);
    const otherId = conversation.participantUserIds.find((id) => id !== actor.id)!;
    return blocksService.unblock(actor.id, otherId, conversation.participantUserIds);
  },
  createOffer(
    actor: CommunicationActor,
    listingId: string,
    input: { amount: number; currency: "EGP" | "USD"; note?: string },
  ) {
    const listing = listingForInteraction(listingId);
    if (listing.sellerUserId === actor.id) throw new CommunicationError("SELF_INTERACTION");
    if (!Number.isFinite(input.amount) || input.amount <= 0)
      throw new CommunicationError("VALIDATION_ERROR", { amount: "positive" });
    if ((input.note?.length ?? 0) > 1000)
      throw new CommunicationError("VALIDATION_ERROR", { note: "length" });
    if (offers().some((item) => item.listingId === listingId && item.status === "ACCEPTED"))
      throw new CommunicationError("ACCEPTED_OFFER_EXISTS");
    if (
      offers().some(
        (item) =>
          item.listingId === listingId &&
          item.buyerUserId === actor.id &&
          item.status === "PENDING",
      )
    )
      throw new CommunicationError("DUPLICATE_ACTIVE_OFFER");
    const now = new Date().toISOString();
    const offer: VehicleOfferRecord = {
      id: `vehicle_offer_${crypto.randomUUID()}`,
      listingId,
      buyerUserId: actor.id,
      sellerUserId: listing.sellerUserId,
      amount: input.amount,
      currency: input.currency,
      note: input.note?.trim() || undefined,
      status: "PENDING",
      createdAt: now,
      updatedAt: now,
    };
    write(OFFERS_KEY, [...offers(), offer]);
    notificationsService.create(
      offer.sellerUserId,
      "NEW_VEHICLE_OFFER",
      offer.id,
      listing.sellerType === "agency"
        ? "/dealer-account/received-offers"
        : "/account/received-offers",
    );
    return offer;
  },
  buyerOffers(actor: CommunicationActor) {
    return offers().filter((item) => item.buyerUserId === actor.id);
  },
  receivedOffers(actor: CommunicationActor) {
    return offers().filter((item) => item.sellerUserId === actor.id);
  },
  listingOffers(actor: CommunicationActor, listingId: string) {
    const values = offers().filter((item) => item.listingId === listingId);
    if (values.length && !values.some((item) => item.sellerUserId === actor.id))
      throw new CommunicationError("FORBIDDEN");
    return values.filter((item) => item.sellerUserId === actor.id);
  },
  withdrawOffer(actor: CommunicationActor, id: string) {
    const offer = offerFor(id);
    if (offer.buyerUserId !== actor.id) throw new CommunicationError("FORBIDDEN");
    if (offer.status !== "PENDING") throw new CommunicationError("INVALID_STATUS_TRANSITION");
    const now = new Date().toISOString();
    const updated = { ...offer, status: "WITHDRAWN" as const, updatedAt: now, withdrawnAt: now };
    write(
      OFFERS_KEY,
      offers().map((item) => (item.id === id ? updated : item)),
    );
    notificationsService.create(offer.sellerUserId, "VEHICLE_OFFER_WITHDRAWN", id, "/messages");
    return updated;
  },
  rejectOffer(actor: CommunicationActor, id: string) {
    const offer = offerFor(id);
    if (offer.sellerUserId !== actor.id) throw new CommunicationError("FORBIDDEN");
    if (offer.status !== "PENDING") throw new CommunicationError("INVALID_STATUS_TRANSITION");
    const now = new Date().toISOString();
    const updated = { ...offer, status: "REJECTED" as const, updatedAt: now, rejectedAt: now };
    write(
      OFFERS_KEY,
      offers().map((item) => (item.id === id ? updated : item)),
    );
    notificationsService.create(
      offer.buyerUserId,
      "VEHICLE_OFFER_REJECTED",
      id,
      buyerOffersHref(offer.buyerUserId),
    );
    return updated;
  },
  acceptOffer(actor: CommunicationActor, id: string) {
    const selected = offerFor(id);
    if (selected.sellerUserId !== actor.id) throw new CommunicationError("FORBIDDEN");
    if (selected.status !== "PENDING") throw new CommunicationError("INVALID_STATUS_TRANSITION");
    if (
      offers().some((item) => item.listingId === selected.listingId && item.status === "ACCEPTED")
    )
      throw new CommunicationError("ACCEPTED_OFFER_EXISTS");
    const now = new Date().toISOString();
    const next = offers().map((offer) =>
      offer.listingId !== selected.listingId || offer.status !== "PENDING"
        ? offer
        : offer.id === id
          ? { ...offer, status: "ACCEPTED" as const, updatedAt: now, acceptedAt: now }
          : { ...offer, status: "REJECTED" as const, updatedAt: now, rejectedAt: now },
    );
    write(OFFERS_KEY, next);
    next
      .filter((offer) => offer.listingId === selected.listingId && offer.updatedAt === now)
      .forEach((offer) =>
        notificationsService.create(
          offer.buyerUserId,
          offer.status === "ACCEPTED" ? "VEHICLE_OFFER_ACCEPTED" : "VEHICLE_OFFER_REJECTED",
          offer.id,
          buyerOffersHref(offer.buyerUserId),
        ),
      );
    return next.filter((offer) => offer.listingId === selected.listingId);
  },
  subscribe(callback: () => void) {
    if (typeof window === "undefined") return () => undefined;
    const storageHandler = (event: StorageEvent) => {
      if ([CONVERSATIONS_KEY, MESSAGES_KEY, OFFERS_KEY].includes(event.key ?? "")) callback();
    };
    window.addEventListener(EVENT, callback);
    window.addEventListener("storage", storageHandler);
    const unsubscribeBlocks = blocksService.subscribe(callback);
    return () => {
      window.removeEventListener(EVENT, callback);
      window.removeEventListener("storage", storageHandler);
      unsubscribeBlocks();
    };
  },
};
