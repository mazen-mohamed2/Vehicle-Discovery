import type { AuthUser } from "@/lib/auth";
import type { StorageScope } from "@/lib/storage-scope";

export type VerificationSubjectType = "INDIVIDUAL" | "DEALER" | "VEHICLE";
export type VerificationStatus = "NOT_SUBMITTED" | "PENDING_REVIEW" | "VERIFIED" | "REJECTED";

export interface VerificationRequestRecord {
  id: string;
  subjectType: VerificationSubjectType;
  subjectId: string;
  ownerUserId: string;
  status: Exclude<VerificationStatus, "NOT_SUBMITTED">;
  declarations: { informationAccurate: true; authorized: true };
  submittedAt: string;
  updatedAt: string;
  reviewedAt?: string;
}

export type ReportTargetType = "LISTING" | "USER" | "DEALER" | "CONVERSATION" | "MESSAGE";
export type ReportReason =
  | "SCAM_OR_FRAUD"
  | "MISLEADING_INFORMATION"
  | "HARASSMENT"
  | "SPAM"
  | "SUSPICIOUS_IDENTITY"
  | "INAPPROPRIATE_CONTENT"
  | "OTHER";
export type ReportStatus = "SUBMITTED" | "UNDER_REVIEW" | "RESOLVED";

export interface ReportRecord {
  id: string;
  reporterUserId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  description?: string;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
}

export interface BlockRelationship {
  blockerUserId: string;
  blockedUserId: string;
  createdAt: string;
}

export interface ReviewRecord {
  id: string;
  transactionId: string;
  reviewerUserId: string;
  subjectType: "INDIVIDUAL_SELLER" | "DEALER";
  subjectId: string;
  rating: number;
  comment?: string;
  moderationStatus: "PENDING" | "PUBLISHED" | "REMOVED";
  createdAt: string;
  updatedAt: string;
}

export interface TrustActor {
  id: string;
  role: "user" | "dealer";
  scope: StorageScope;
  dealerId?: string;
}

export type TrustSafetyErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "SELF_ACTION"
  | "DUPLICATE_ACTIVE_REPORT"
  | "INVALID_STATUS_TRANSITION"
  | "VALIDATION_ERROR"
  | "STORAGE_READ_FAILED"
  | "STORAGE_WRITE_FAILED";

export class TrustSafetyError extends Error {
  constructor(
    public readonly code: TrustSafetyErrorCode,
    public readonly fields: Record<string, string> = {},
  ) {
    super(code);
    this.name = "TrustSafetyError";
  }
}

export function trustActor(user: AuthUser | null | undefined): TrustActor {
  if (!user) throw new TrustSafetyError("UNAUTHENTICATED");
  return {
    id: user.id,
    role: user.role,
    scope: `${user.role}:${user.id}`,
    dealerId: user.dealerId,
  };
}

export function isVerified(status: VerificationStatus) {
  return status === "VERIFIED";
}

/** Reviews are intentionally read-only until a qualifying completed Transaction exists. */
export function isReviewEligible(transactionStatus: string | undefined) {
  return transactionStatus === "COMPLETED";
}
