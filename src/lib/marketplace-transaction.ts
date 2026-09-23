import { z } from "zod";
import { formatMoney } from "@/lib/money";
import type { CommunicationActor } from "@/lib/communication";

// Future lifecycle contracts. Only the initial states are writable in this frontend.
export type TransactionStatus =
  "AWAITING_PAYMENT" | "PAYMENT_PROCESSING" | "IN_ESCROW" | "COMPLETED" | "CANCELLED" | "FAILED";
export type PaymentStatus =
  "NOT_STARTED" | "PENDING" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "REFUNDED" | "CANCELLED";
export type EscrowStatus = "NOT_STARTED" | "HELD" | "RELEASED" | "REFUNDED" | "DISPUTED";
// References can only be supplied by a future authoritative backend adapter.
export interface TransactionPayment {
  status: PaymentStatus;
  providerReference?: string;
}
export interface TransactionEscrow {
  status: EscrowStatus;
  providerReference?: string;
}
export type TransactionActor = CommunicationActor;

const id = z
  .string()
  .min(1)
  .max(200)
  .refine((value) => value.trim() === value && !/\s/.test(value));
export const transactionSourceSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("LISTING_OFFER"), offerId: id, listingId: id }).strict(),
  z.object({ type: z.literal("IMPORT_OFFER"), offerId: id, importRequestId: id }).strict(),
]);
export type MarketplaceTransactionSource = Readonly<z.infer<typeof transactionSourceSchema>>;

// Reject future/fabricated financial success in local persistence. Backend integration
// must introduce an authoritative reader/migration, not loosen this frontend writer.
export const transactionSchema = z
  .object({
    id,
    source: transactionSourceSchema,
    buyerParticipantId: id,
    sellerParticipantId: id,
    agreedAmount: z.number().finite().positive(),
    currency: z.enum(["EGP", "USD"]),
    status: z.literal("AWAITING_PAYMENT"),
    payment: z.object({ status: z.literal("NOT_STARTED") }).strict(),
    escrow: z.object({ status: z.literal("NOT_STARTED") }).strict(),
    snapshot: z
      .object({
        title: z.string().min(1).max(240),
        category: z.enum(["CAR", "MOTORCYCLE", "BOAT"]),
      })
      .strict(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict()
  .refine((value) => value.buyerParticipantId !== value.sellerParticipantId)
  .refine((value) => value.source.type !== "IMPORT_OFFER" || value.snapshot.category === "CAR")
  .refine((value) => value.createdAt === value.updatedAt);

type RecordShape = z.infer<typeof transactionSchema>;
export type MarketplaceTransaction = Readonly<
  Omit<RecordShape, "source" | "snapshot" | "payment" | "escrow">
> & {
  readonly source: MarketplaceTransactionSource;
  readonly snapshot: Readonly<RecordShape["snapshot"]>;
  readonly payment: Readonly<RecordShape["payment"]>;
  readonly escrow: Readonly<RecordShape["escrow"]>;
};
export type TransactionErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "SOURCE_NOT_FOUND"
  | "SOURCE_NOT_ACCEPTED"
  | "INVALID_SOURCE"
  | "INVALID_AMOUNT"
  | "INVALID_MONEY_PRECISION"
  | "INVALID_CURRENCY"
  | "INVALID_PARTICIPANTS"
  | "STORAGE_READ_FAILED"
  | "STORAGE_WRITE_FAILED";
export class TransactionError extends Error {
  constructor(public readonly code: TransactionErrorCode) {
    super(code);
    this.name = "TransactionError";
  }
}
export function transactionSourceKey(source: MarketplaceTransactionSource) {
  // Uniqueness is by offer, not by a caller-provided parent ID.
  return `${source.type}:${source.offerId}`;
}
export function transactionBase(role: "user" | "dealer") {
  return role === "dealer" ? "/dealer-account/transactions" : "/account/transactions";
}
export function transactionErrorKey(error: unknown) {
  return `transactions.error.${error instanceof TransactionError ? error.code : "STORAGE_READ_FAILED"}`;
}
export function transactionProgressKey(
  record: MarketplaceTransaction | undefined,
  canStart: boolean,
  source: MarketplaceTransactionSource,
) {
  return record
    ? `transactions.status.${record.status}`
    : canStart
      ? "transactions.notStarted"
      : source.type === "IMPORT_OFFER"
        ? "transactions.waitingCustomer"
        : "transactions.waitingBuyer";
}
export function formatTransactionAmount(
  amount: number,
  currency: "EGP" | "USD",
  locale: "en" | "ar",
) {
  return formatMoney(amount, currency, locale, 2);
}
