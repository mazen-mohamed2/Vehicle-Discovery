import { z } from "zod";
import { parseMoney, MoneyValidationError } from "@/lib/money";
import { CommunicationError } from "@/lib/communication";
import { ImportWorkflowError } from "@/lib/import-workflow";
import {
  TransactionError,
  transactionSchema,
  transactionSourceSchema,
  transactionSourceKey,
  type MarketplaceTransaction,
  type MarketplaceTransactionSource,
  type TransactionActor,
} from "@/lib/marketplace-transaction";
import { marketplaceCommunicationService } from "@/services/marketplace-communication.service";
import { importRequestsService } from "@/services/import-requests.service";
import { publicCatalogService } from "@/services/public-catalog.service";

const KEY = "sd-marketplace-transactions";
const EVENT = "sd-marketplace-transactions-change";
const envelope = z
  .object({ schemaVersion: z.literal(1), records: z.array(transactionSchema) })
  .strict()
  .refine(({ records }) => new Set(records.map((record) => record.id)).size === records.length)
  .refine(
    ({ records }) =>
      new Set(records.map((record) => transactionSourceKey(record.source))).size === records.length,
  );

function requireActor(actor: TransactionActor | null): asserts actor is TransactionActor {
  if (!actor) throw new TransactionError("UNAUTHENTICATED");
  if (
    !actor.id?.trim() ||
    !["user", "dealer"].includes(actor.role) ||
    actor.scope !== `${actor.role}:${actor.id}`
  )
    throw new TransactionError("FORBIDDEN");
}
function participant(actor: TransactionActor, record: MarketplaceTransaction) {
  if (actor.id !== record.buyerParticipantId && actor.id !== record.sellerParticipantId)
    throw new TransactionError("FORBIDDEN");
}
function read(): MarketplaceTransaction[] {
  try {
    if (typeof window === "undefined") throw new Error("Browser storage unavailable");
    const raw = window.localStorage.getItem(KEY);
    return raw === null ? [] : envelope.parse(JSON.parse(raw)).records;
  } catch {
    throw new TransactionError("STORAGE_READ_FAILED");
  }
}
function write(records: MarketplaceTransaction[]) {
  try {
    const data = envelope.parse({ schemaVersion: 1, records });
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    throw new TransactionError("STORAGE_WRITE_FAILED");
  }
  window.dispatchEvent(new Event(EVENT));
}
function normalizeSource(source: MarketplaceTransactionSource) {
  const parsed = transactionSourceSchema.safeParse(source);
  if (!parsed.success) throw new TransactionError("INVALID_SOURCE");
  return parsed.data;
}
function sameParent(a: MarketplaceTransactionSource, b: MarketplaceTransactionSource) {
  return a.type === "LISTING_OFFER" && b.type === "LISTING_OFFER"
    ? a.listingId === b.listingId
    : a.type === "IMPORT_OFFER" &&
        b.type === "IMPORT_OFFER" &&
        a.importRequestId === b.importRequestId;
}
function sourceTerms(actor: TransactionActor, source: MarketplaceTransactionSource) {
  try {
    if (source.type === "LISTING_OFFER") {
      const offers = [
        ...marketplaceCommunicationService.buyerOffers(actor),
        ...marketplaceCommunicationService.receivedOffers(actor),
      ];
      const offer = offers.find((item) => item.id === source.offerId);
      if (!offer) throw new TransactionError("SOURCE_NOT_FOUND");
      if (offer.buyerUserId !== actor.id) throw new TransactionError("FORBIDDEN");
      if (offer.status !== "ACCEPTED") throw new TransactionError("SOURCE_NOT_ACCEPTED");
      if (offer.listingId !== source.listingId) throw new TransactionError("INVALID_SOURCE");
      const listing = publicCatalogService.byId(offer.listingId);
      if (!listing) throw new TransactionError("SOURCE_NOT_FOUND");
      if (!listing.sellerUserId || listing.sellerUserId !== offer.sellerUserId)
        throw new TransactionError("INVALID_PARTICIPANTS");
      return {
        buyerParticipantId: offer.buyerUserId,
        sellerParticipantId: listing.sellerUserId,
        agreedAmount: offer.amount,
        currency: offer.currency,
        snapshot: { title: listing.title.slice(0, 240), category: listing.category },
      };
    }
    if (actor.role !== "user") throw new TransactionError("FORBIDDEN");
    const request = importRequestsService.ownerRequest(actor, source.importRequestId);
    const offer = importRequestsService
      .offersForOwner(actor, request.id)
      .find((item) => item.id === source.offerId);
    if (!offer) throw new TransactionError("SOURCE_NOT_FOUND");
    if (offer.status !== "ACCEPTED" || request.status !== "OFFER_ACCEPTED")
      throw new TransactionError("SOURCE_NOT_ACCEPTED");
    if (request.acceptedOfferId !== offer.id || offer.requestId !== request.id)
      throw new TransactionError("INVALID_SOURCE");
    return {
      buyerParticipantId: request.ownerUserId,
      sellerParticipantId: offer.dealerUserId,
      agreedAmount: offer.price,
      currency: offer.currency,
      snapshot: {
        title: `${request.make} ${request.model} ${request.year}`.slice(0, 240),
        category: "CAR" as const,
      },
    };
  } catch (error) {
    if (error instanceof TransactionError) throw error;
    if (error instanceof CommunicationError || error instanceof ImportWorkflowError) {
      if (error.code === "FORBIDDEN") throw new TransactionError("FORBIDDEN");
      if (error.code === "STORAGE_READ_FAILED") throw new TransactionError("STORAGE_READ_FAILED");
      throw new TransactionError("SOURCE_NOT_FOUND");
    }
    throw new TransactionError("STORAGE_READ_FAILED");
  }
}
function create(actor: TransactionActor, input: MarketplaceTransactionSource) {
  requireActor(actor);
  const source = normalizeSource(input);
  const records = read();
  const existing = records.find(
    (record) => transactionSourceKey(record.source) === transactionSourceKey(source),
  );
  if (existing) {
    if (existing.buyerParticipantId !== actor.id) throw new TransactionError("FORBIDDEN");
    if (!sameParent(existing.source, source)) throw new TransactionError("INVALID_SOURCE");
    return existing; // No live-catalog dependency for persisted financial history.
  }
  const terms = sourceTerms(actor, source);
  if (
    !terms.buyerParticipantId?.trim() ||
    !terms.sellerParticipantId?.trim() ||
    terms.buyerParticipantId === terms.sellerParticipantId
  )
    throw new TransactionError("INVALID_PARTICIPANTS");
  if (!Number.isFinite(terms.agreedAmount) || terms.agreedAmount <= 0)
    throw new TransactionError("INVALID_AMOUNT");
  if (terms.currency !== "EGP" && terms.currency !== "USD")
    throw new TransactionError("INVALID_CURRENCY");
  try {
    parseMoney(terms.agreedAmount, terms.currency);
  } catch (error) {
    throw new TransactionError(
      error instanceof MoneyValidationError && error.code === "precision"
        ? "INVALID_MONEY_PRECISION"
        : "INVALID_AMOUNT",
    );
  }
  const now = new Date().toISOString();
  const record: MarketplaceTransaction = {
    id: `transaction_${crypto.randomUUID()}`,
    source,
    ...terms,
    status: "AWAITING_PAYMENT",
    payment: { status: "NOT_STARTED" },
    escrow: { status: "NOT_STARTED" },
    createdAt: now,
    updatedAt: now,
  };
  write([...records, record]);
  return record;
}
async function lockedCreate(actor: TransactionActor, source: MarketplaceTransactionSource) {
  // Same-tab fallback is synchronous/atomic. Web Locks also serialize cooperating tabs.
  // The backend must replace this with a DB unique constraint + atomic idempotency.
  // Normalize synchronous validation errors to promise rejection so lock release is reliable.
  if (typeof navigator !== "undefined" && navigator.locks)
    return navigator.locks.request(KEY, async () => create(actor, source));
  return create(actor, source);
}
export const marketplaceTransactionsService = {
  createFromListingOffer(actor: TransactionActor, offerId: string, listingId: string) {
    return lockedCreate(actor, { type: "LISTING_OFFER", offerId, listingId });
  },
  createFromImportOffer(actor: TransactionActor, offerId: string, importRequestId: string) {
    return lockedCreate(actor, { type: "IMPORT_OFFER", offerId, importRequestId });
  },
  listForParticipant(actor: TransactionActor) {
    requireActor(actor);
    return read()
      .filter(
        (record) =>
          record.buyerParticipantId === actor.id || record.sellerParticipantId === actor.id,
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  getById(actor: TransactionActor, id: string) {
    requireActor(actor);
    const record = read().find((item) => item.id === id);
    if (!record) throw new TransactionError("NOT_FOUND");
    participant(actor, record);
    return record;
  },
  getBySource(actor: TransactionActor, input: MarketplaceTransactionSource) {
    requireActor(actor);
    const source = normalizeSource(input);
    const record = read().find(
      (item) => transactionSourceKey(item.source) === transactionSourceKey(source),
    );
    if (!record) return null;
    participant(actor, record);
    if (!sameParent(record.source, source)) throw new TransactionError("INVALID_SOURCE");
    return record;
  },
  subscribe(listener: () => void) {
    if (typeof window === "undefined") return () => {};
    const storage = (event: StorageEvent) => {
      if (event.key === KEY || event.key === null) listener();
    };
    window.addEventListener(EVENT, listener);
    window.addEventListener("storage", storage);
    return () => {
      window.removeEventListener(EVENT, listener);
      window.removeEventListener("storage", storage);
    };
  },
};
