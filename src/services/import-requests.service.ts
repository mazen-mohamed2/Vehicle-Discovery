import { parseMoney } from "@/lib/money";
import {
  ImportWorkflowError,
  validateImportOffer,
  validateImportRequest,
  type ImportActor,
  type ImportOfferRecord,
  type ImportRequestRecord,
} from "@/lib/import-workflow";
import { notificationsService } from "@/services/notifications.service";

const REQUESTS_KEY = "sd-import-marketplace-requests";
const OFFERS_KEY = "sd-import-marketplace-offers";
const EVENT = "sd-import-workflow-change";
const target = () => (typeof window === "undefined" ? null : window.localStorage);

function parse<T>(key: string): T[] {
  try {
    const raw = target()?.getItem(key);
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) throw new Error("invalid");
    return value as T[];
  } catch {
    throw new ImportWorkflowError("STORAGE_READ_FAILED");
  }
}
function write<T>(key: string, value: T[]) {
  const storage = target();
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    throw new ImportWorkflowError("STORAGE_WRITE_FAILED");
  }
}
const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
const requests = () => {
  const value = parse<unknown>(REQUESTS_KEY);
  if (
    !value.every(
      (item) =>
        isObject(item) &&
        typeof item.id === "string" &&
        typeof item.ownerUserId === "string" &&
        typeof item.make === "string" &&
        typeof item.model === "string" &&
        typeof item.year === "number" &&
        typeof item.budget === "number" &&
        (item.currency === "EGP" || item.currency === "USD") &&
        (item.status === "OPEN" || item.status === "OFFER_ACCEPTED" || item.status === "CANCELLED"),
    )
  )
    throw new ImportWorkflowError("STORAGE_READ_FAILED");
  return value as ImportRequestRecord[];
};
const offers = () => {
  const value = parse<unknown>(OFFERS_KEY);
  if (
    !value.every(
      (item) =>
        isObject(item) &&
        typeof item.id === "string" &&
        typeof item.requestId === "string" &&
        typeof item.dealerUserId === "string" &&
        typeof item.dealerId === "string" &&
        typeof item.price === "number" &&
        (item.currency === "EGP" || item.currency === "USD") &&
        typeof item.estimatedDelivery === "string" &&
        (item.status === "PENDING" ||
          item.status === "ACCEPTED" ||
          item.status === "REJECTED" ||
          item.status === "WITHDRAWN"),
    )
  )
    throw new ImportWorkflowError("STORAGE_READ_FAILED");
  return value as ImportOfferRecord[];
};
const requireRole = (actor: ImportActor, role: ImportActor["role"]) => {
  if (actor.role !== role) throw new ImportWorkflowError("FORBIDDEN");
};
const requestById = (id: string) => {
  const request = requests().find((item) => item.id === id);
  if (!request) throw new ImportWorkflowError("REQUEST_NOT_FOUND");
  return request;
};
const offerById = (id: string) => {
  const offer = offers().find((item) => item.id === id);
  if (!offer) throw new ImportWorkflowError("OFFER_NOT_FOUND");
  return offer;
};

export const importRequestsService = {
  createRequest(
    actor: ImportActor,
    input: Omit<ImportRequestRecord, "id" | "ownerUserId" | "status" | "createdAt" | "updatedAt">,
  ) {
    requireRole(actor, "user");
    const fields = validateImportRequest(input);
    if (Object.keys(fields).length) throw new ImportWorkflowError("VALIDATION_ERROR", fields);
    const now = new Date().toISOString();
    const request: ImportRequestRecord = {
      ...input,
      make: input.make.trim(),
      model: input.model.trim(),
      preferences: input.preferences?.trim() || undefined,
      id: `import_${crypto.randomUUID()}`,
      ownerUserId: actor.id,
      status: "OPEN",
      createdAt: now,
      updatedAt: now,
    };
    write(REQUESTS_KEY, [...requests(), request]);
    return request;
  },
  ownedRequests(actor: ImportActor) {
    requireRole(actor, "user");
    return requests().filter((item) => item.ownerUserId === actor.id);
  },
  ownerRequest(actor: ImportActor, id: string) {
    requireRole(actor, "user");
    const request = requestById(id);
    if (request.ownerUserId !== actor.id) throw new ImportWorkflowError("FORBIDDEN");
    return request;
  },
  openRequests(actor: ImportActor) {
    requireRole(actor, "dealer");
    return requests().filter((item) => item.status === "OPEN");
  },
  dealerRequest(actor: ImportActor, id: string) {
    requireRole(actor, "dealer");
    const request = requestById(id);
    if (request.status !== "OPEN") throw new ImportWorkflowError("REQUEST_NOT_FOUND");
    return request;
  },
  cancelRequest(actor: ImportActor, id: string) {
    const request = this.ownerRequest(actor, id);
    if (request.status !== "OPEN") throw new ImportWorkflowError("INVALID_STATUS_TRANSITION");
    const updated = {
      ...request,
      status: "CANCELLED" as const,
      updatedAt: new Date().toISOString(),
    };
    write(
      REQUESTS_KEY,
      requests().map((item) => (item.id === id ? updated : item)),
    );
    return updated;
  },
  offersForOwner(actor: ImportActor, requestId: string) {
    this.ownerRequest(actor, requestId);
    return offers().filter((item) => item.requestId === requestId);
  },
  offersForOwnedRequests(actor: ImportActor) {
    requireRole(actor, "user");
    const ownedIds = new Set(
      requests()
        .filter((item) => item.ownerUserId === actor.id)
        .map((item) => item.id),
    );
    return offers().filter((item) => ownedIds.has(item.requestId));
  },
  offersForDealer(actor: ImportActor) {
    requireRole(actor, "dealer");
    if (!actor.dealerId) throw new ImportWorkflowError("FORBIDDEN");
    return offers().filter((item) => item.dealerUserId === actor.id);
  },
  dealerOfferHistory(actor: ImportActor) {
    const ownOffers = this.offersForDealer(actor);
    const requestMap = new Map(requests().map((request) => [request.id, request]));
    return ownOffers.map((offer) => {
      const request = requestMap.get(offer.requestId);
      if (!request) throw new ImportWorkflowError("STORAGE_READ_FAILED");
      return { offer, request };
    });
  },
  submitOffer(
    actor: ImportActor,
    requestId: string,
    input: Pick<ImportOfferRecord, "price" | "currency" | "estimatedDelivery" | "notes">,
  ) {
    requireRole(actor, "dealer");
    if (!actor.dealerId) throw new ImportWorkflowError("FORBIDDEN");
    const request = requestById(requestId);
    if (request.status !== "OPEN") throw new ImportWorkflowError("INVALID_STATUS_TRANSITION");
    const fields = validateImportOffer(input);
    if (Object.keys(fields).length) throw new ImportWorkflowError("VALIDATION_ERROR", fields);
    if (
      offers().some(
        (item) =>
          item.requestId === requestId &&
          item.dealerUserId === actor.id &&
          item.status === "PENDING",
      )
    )
      throw new ImportWorkflowError("DUPLICATE_ACTIVE_OFFER");
    const now = new Date().toISOString();
    const offer: ImportOfferRecord = {
      ...input,
      price: parseMoney(input.price, input.currency),
      estimatedDelivery: input.estimatedDelivery.trim(),
      notes: input.notes?.trim() || undefined,
      id: `offer_${crypto.randomUUID()}`,
      requestId,
      dealerUserId: actor.id,
      dealerId: actor.dealerId,
      status: "PENDING",
      createdAt: now,
      updatedAt: now,
    };
    write(OFFERS_KEY, [...offers(), offer]);
    notificationsService.create(
      request.ownerUserId,
      "NEW_IMPORT_OFFER",
      requestId,
      `/account/import-requests/${requestId}`,
    );
    return offer;
  },
  rejectOffer(actor: ImportActor, requestId: string, offerId: string) {
    this.ownerRequest(actor, requestId);
    const offer = offerById(offerId);
    if (offer.requestId !== requestId || offer.status !== "PENDING")
      throw new ImportWorkflowError("INVALID_STATUS_TRANSITION");
    const updated = { ...offer, status: "REJECTED" as const, updatedAt: new Date().toISOString() };
    write(
      OFFERS_KEY,
      offers().map((item) => (item.id === offerId ? updated : item)),
    );
    notificationsService.create(
      offer.dealerUserId,
      "IMPORT_OFFER_REJECTED",
      offer.id,
      "/dealer-account/import-requests",
    );
    return updated;
  },
  withdrawOffer(actor: ImportActor, offerId: string) {
    requireRole(actor, "dealer");
    const offer = offerById(offerId);
    if (offer.dealerUserId !== actor.id) throw new ImportWorkflowError("FORBIDDEN");
    if (offer.status !== "PENDING") throw new ImportWorkflowError("INVALID_STATUS_TRANSITION");
    const updated = { ...offer, status: "WITHDRAWN" as const, updatedAt: new Date().toISOString() };
    write(
      OFFERS_KEY,
      offers().map((item) => (item.id === offerId ? updated : item)),
    );
    return updated;
  },
  acceptOffer(actor: ImportActor, requestId: string, offerId: string) {
    const request = this.ownerRequest(actor, requestId);
    if (request.status !== "OPEN") throw new ImportWorkflowError("INVALID_STATUS_TRANSITION");
    const selected = offerById(offerId);
    if (selected.requestId !== requestId || selected.status !== "PENDING")
      throw new ImportWorkflowError("INVALID_STATUS_TRANSITION");
    const now = new Date().toISOString();
    const nextRequest = {
      ...request,
      status: "OFFER_ACCEPTED" as const,
      acceptedOfferId: offerId,
      updatedAt: now,
    };
    const nextOffers = offers().map((offer) =>
      offer.requestId !== requestId || offer.status !== "PENDING"
        ? offer
        : {
            ...offer,
            status: offer.id === offerId ? ("ACCEPTED" as const) : ("REJECTED" as const),
            updatedAt: now,
          },
    );
    // One synchronous repository operation: roll back the request if the second write fails.
    const before = requests();
    write(
      REQUESTS_KEY,
      before.map((item) => (item.id === requestId ? nextRequest : item)),
    );
    try {
      write(OFFERS_KEY, nextOffers);
    } catch (error) {
      write(REQUESTS_KEY, before);
      throw error;
    }
    nextOffers
      .filter(
        (offer) =>
          offer.requestId === requestId &&
          (offer.status === "ACCEPTED" || (offer.status === "REJECTED" && offer.updatedAt === now)),
      )
      .forEach((offer) =>
        notificationsService.create(
          offer.dealerUserId,
          offer.status === "ACCEPTED" ? "IMPORT_OFFER_ACCEPTED" : "IMPORT_OFFER_REJECTED",
          offer.id,
          "/dealer-account/import-requests",
        ),
      );
    return {
      request: nextRequest,
      offers: nextOffers.filter((item) => item.requestId === requestId),
    };
  },
  subscribe(callback: () => void) {
    if (typeof window === "undefined") return () => undefined;
    const changed = (event: StorageEvent) => {
      if (event.key === REQUESTS_KEY || event.key === OFFERS_KEY) callback();
    };
    window.addEventListener(EVENT, callback);
    window.addEventListener("storage", changed);
    return () => {
      window.removeEventListener(EVENT, callback);
      window.removeEventListener("storage", changed);
    };
  },
};
