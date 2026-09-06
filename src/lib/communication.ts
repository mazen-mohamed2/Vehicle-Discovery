import type { AuthUser } from "@/lib/auth";
import type { StorageScope } from "@/lib/storage-scope";

export type VehicleOfferStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN";
export type WebsiteNotificationType =
  | "NEW_MESSAGE"
  | "NEW_VEHICLE_OFFER"
  | "VEHICLE_OFFER_ACCEPTED"
  | "VEHICLE_OFFER_REJECTED"
  | "VEHICLE_OFFER_WITHDRAWN"
  | "NEW_IMPORT_OFFER"
  | "IMPORT_OFFER_ACCEPTED"
  | "IMPORT_OFFER_REJECTED";

export interface ConversationRecord {
  id: string;
  participantUserIds: [string, string];
  buyerUserId: string;
  sellerUserId: string;
  listingId: string;
  contextType: "VEHICLE_LISTING";
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
}

export interface MessageRecord {
  id: string;
  conversationId: string;
  senderUserId: string;
  body: string;
  readByUserIds: string[];
  createdAt: string;
}

export interface ConversationSummary {
  conversation: ConversationRecord;
  lastMessage?: MessageRecord;
  unreadCount: number;
}

export interface VehicleOfferRecord {
  id: string;
  listingId: string;
  buyerUserId: string;
  sellerUserId: string;
  amount: number;
  currency: "EGP" | "USD";
  status: VehicleOfferStatus;
  note?: string;
  createdAt: string;
  updatedAt: string;
  acceptedAt?: string;
  rejectedAt?: string;
  withdrawnAt?: string;
}

export interface WebsiteNotificationRecord {
  id: string;
  recipientUserId: string;
  type: WebsiteNotificationType;
  relatedId: string;
  href: string;
  readAt?: string;
  createdAt: string;
}

export interface CommunicationActor {
  id: string;
  role: "user" | "dealer";
  scope: StorageScope;
  dealerId?: string;
}

export type CommunicationErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "LISTING_NOT_ELIGIBLE"
  | "SELF_INTERACTION"
  | "VALIDATION_ERROR"
  | "DUPLICATE_ACTIVE_OFFER"
  | "ACCEPTED_OFFER_EXISTS"
  | "INVALID_STATUS_TRANSITION"
  | "STORAGE_READ_FAILED"
  | "STORAGE_WRITE_FAILED";

export class CommunicationError extends Error {
  constructor(
    public readonly code: CommunicationErrorCode,
    public readonly fields: Record<string, string> = {},
  ) {
    super(code);
    this.name = "CommunicationError";
  }
}

export function communicationActor(user: AuthUser | null | undefined): CommunicationActor {
  if (!user) throw new CommunicationError("UNAUTHENTICATED");
  return {
    id: user.id,
    role: user.role,
    scope: `${user.role}:${user.id}`,
    dealerId: user.dealerId,
  };
}

export function communicationDetailState(input: {
  isLoading: boolean;
  value: unknown;
  error: unknown;
}): "loading" | "ready" | "forbidden" | "not-found" | "error" {
  if (input.isLoading) return "loading";
  if (input.value) return "ready";
  if (input.error instanceof CommunicationError) {
    if (input.error.code === "FORBIDDEN") return "forbidden";
    if (input.error.code === "NOT_FOUND") return "not-found";
  }
  return "error";
}
