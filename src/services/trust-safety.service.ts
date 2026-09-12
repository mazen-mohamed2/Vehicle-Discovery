import {
  TrustSafetyError,
  type ReportReason,
  type ReportRecord,
  type ReportTargetType,
  type TrustActor,
  type VerificationRequestRecord,
  type VerificationStatus,
  type VerificationSubjectType,
} from "@/lib/trust-safety";
import { agenciesService } from "@/services/agencies.service";
import { developmentAuthFixtures, developmentPublicProfile } from "@/services/auth.service";
import { marketplaceCommunicationService } from "@/services/marketplace-communication.service";
import { publicCatalogService } from "@/services/public-catalog.service";

const VERIFICATION_KEY = "sd-verification-requests";
const REPORT_KEY = "sd-website-reports";
const EVENT = "sd-trust-safety-change";
const storage = () => (typeof window === "undefined" ? null : window.localStorage);
const object = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
const verificationStatuses = ["PENDING_REVIEW", "VERIFIED", "REJECTED"];
const subjectTypes = ["INDIVIDUAL", "DEALER", "VEHICLE"];
const targetTypes = ["LISTING", "USER", "DEALER", "CONVERSATION", "MESSAGE"];
const reportReasons = [
  "SCAM_OR_FRAUD",
  "MISLEADING_INFORMATION",
  "HARASSMENT",
  "SPAM",
  "SUSPICIOUS_IDENTITY",
  "INAPPROPRIATE_CONTENT",
  "OTHER",
] as const;

function parse<T>(key: string, valid: (item: Record<string, unknown>) => boolean): T[] {
  try {
    const raw = storage()?.getItem(key);
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value) || !value.every((item) => object(item) && valid(item)))
      throw new Error("invalid");
    return value as T[];
  } catch {
    throw new TrustSafetyError("STORAGE_READ_FAILED");
  }
}
const verifications = () =>
  parse<VerificationRequestRecord>(
    VERIFICATION_KEY,
    (item) =>
      typeof item.id === "string" &&
      subjectTypes.includes(String(item.subjectType)) &&
      typeof item.subjectId === "string" &&
      typeof item.ownerUserId === "string" &&
      verificationStatuses.includes(String(item.status)) &&
      object(item.declarations) &&
      item.declarations.informationAccurate === true &&
      item.declarations.authorized === true &&
      typeof item.submittedAt === "string" &&
      typeof item.updatedAt === "string",
  );
const reports = () =>
  parse<ReportRecord>(
    REPORT_KEY,
    (item) =>
      typeof item.id === "string" &&
      typeof item.reporterUserId === "string" &&
      targetTypes.includes(String(item.targetType)) &&
      typeof item.targetId === "string" &&
      reportReasons.includes(item.reason as ReportReason) &&
      ["SUBMITTED", "UNDER_REVIEW", "RESOLVED"].includes(String(item.status)) &&
      typeof item.createdAt === "string" &&
      typeof item.updatedAt === "string",
  );
function write<T>(key: string, records: T[]) {
  try {
    storage()?.setItem(key, JSON.stringify(records));
    if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
  } catch {
    throw new TrustSafetyError("STORAGE_WRITE_FAILED");
  }
}

function ownedSubject(actor: TrustActor, type: VerificationSubjectType, id: string) {
  if (type === "INDIVIDUAL") return actor.role === "user" && actor.id === id;
  if (type === "DEALER") return actor.role === "dealer" && actor.dealerId === id;
  const listing = publicCatalogService.byId(id);
  return Boolean(listing && listing.sellerUserId === actor.id);
}

function assertReportTarget(actor: TrustActor, type: ReportTargetType, id: string) {
  if (type === "LISTING") {
    const listing = publicCatalogService.byId(id);
    if (!listing) throw new TrustSafetyError("NOT_FOUND");
    if (listing.sellerUserId === actor.id) throw new TrustSafetyError("SELF_ACTION");
  } else if (type === "USER") {
    const profile = developmentPublicProfile(id);
    if (!profile || profile.role !== "user") throw new TrustSafetyError("NOT_FOUND");
    if (id === actor.id) throw new TrustSafetyError("SELF_ACTION");
  } else if (type === "DEALER") {
    const owner = developmentAuthFixtures.find((item) => item.user.dealerId === id)?.user;
    if (!owner) throw new TrustSafetyError("NOT_FOUND");
    if (owner.id === actor.id) throw new TrustSafetyError("SELF_ACTION");
  } else if (type === "CONVERSATION") {
    marketplaceCommunicationService.conversation(actor, id);
  } else {
    const conversation = marketplaceCommunicationService
      .participantConversations(actor)
      .find((item) =>
        marketplaceCommunicationService.messages(actor, item.id).some((m) => m.id === id),
      );
    if (!conversation) throw new TrustSafetyError("NOT_FOUND");
  }
}

export const trustSafetyService = {
  verificationForOwner(actor: TrustActor, type: VerificationSubjectType, id: string) {
    if (!ownedSubject(actor, type, id)) throw new TrustSafetyError("FORBIDDEN");
    return (
      verifications()
        .filter(
          (item) =>
            item.subjectType === type && item.subjectId === id && item.ownerUserId === actor.id,
        )
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null
    );
  },
  submitVerification(actor: TrustActor, type: VerificationSubjectType, id: string) {
    if (!ownedSubject(actor, type, id)) throw new TrustSafetyError("FORBIDDEN");
    if (this.publicStatus(type, id) === "VERIFIED")
      throw new TrustSafetyError("INVALID_STATUS_TRANSITION");
    const current = this.verificationForOwner(actor, type, id);
    if (current && current.status !== "REJECTED")
      throw new TrustSafetyError("INVALID_STATUS_TRANSITION");
    const now = new Date().toISOString();
    const request: VerificationRequestRecord = {
      id: `verification_${crypto.randomUUID()}`,
      subjectType: type,
      subjectId: id,
      ownerUserId: actor.id,
      status: "PENDING_REVIEW",
      declarations: { informationAccurate: true, authorized: true },
      submittedAt: now,
      updatedAt: now,
    };
    write(VERIFICATION_KEY, [...verifications(), request]);
    return request;
  },
  publicStatus(type: VerificationSubjectType, id: string): VerificationStatus {
    const record = verifications()
      .filter((item) => item.subjectType === type && item.subjectId === id)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    if (record?.status === "VERIFIED") return "VERIFIED";
    if (type === "DEALER") {
      const agency = developmentAuthFixtures.find((item) => item.user.dealerId === id);
      if (agency && id && agenciesService.canonicalVerified(id)) return "VERIFIED";
    }
    if (type === "VEHICLE" && publicCatalogService.byId(id)?.verified) return "VERIFIED";
    return "NOT_SUBMITTED";
  },
  reports(actor: TrustActor) {
    return reports()
      .filter((item) => item.reporterUserId === actor.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  submitReport(
    actor: TrustActor,
    input: {
      targetType: ReportTargetType;
      targetId: string;
      reason: ReportReason;
      description?: string;
    },
  ) {
    assertReportTarget(actor, input.targetType, input.targetId);
    if (!reportReasons.includes(input.reason))
      throw new TrustSafetyError("VALIDATION_ERROR", { reason: "required" });
    const description = input.description?.trim();
    if ((description?.length ?? 0) > 1000)
      throw new TrustSafetyError("VALIDATION_ERROR", { description: "length" });
    if (
      reports().some(
        (item) =>
          item.reporterUserId === actor.id &&
          item.targetType === input.targetType &&
          item.targetId === input.targetId &&
          item.status !== "RESOLVED",
      )
    )
      throw new TrustSafetyError("DUPLICATE_ACTIVE_REPORT");
    const now = new Date().toISOString();
    const report: ReportRecord = {
      id: `report_${crypto.randomUUID()}`,
      reporterUserId: actor.id,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason,
      description: description || undefined,
      status: "SUBMITTED",
      createdAt: now,
      updatedAt: now,
    };
    write(REPORT_KEY, [...reports(), report]);
    return report;
  },
  subscribe(callback: () => void) {
    if (typeof window === "undefined") return () => undefined;
    const storageHandler = (event: StorageEvent) => {
      if ([VERIFICATION_KEY, REPORT_KEY].includes(event.key ?? "")) callback();
    };
    window.addEventListener(EVENT, callback);
    window.addEventListener("storage", storageHandler);
    return () => {
      window.removeEventListener(EVENT, callback);
      window.removeEventListener("storage", storageHandler);
    };
  },
};
