import type { AuthUser } from "@/lib/auth";
import { parseMoney, MoneyValidationError, type MoneyCurrency } from "@/lib/money";
import type { StorageScope } from "@/lib/storage-scope";

export type ImportRequestStatus = "OPEN" | "OFFER_ACCEPTED" | "CANCELLED";
export type ImportOfferStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN";

export interface ImportRequestRecord {
  id: string;
  ownerUserId: string;
  make: string;
  model: string;
  year: number;
  budget: number;
  currency: "EGP" | "USD";
  preferences?: string;
  status: ImportRequestStatus;
  createdAt: string;
  updatedAt: string;
  acceptedOfferId?: string;
}

export interface ImportOfferRecord {
  id: string;
  requestId: string;
  dealerUserId: string;
  dealerId?: string;
  price: number;
  currency: "EGP" | "USD";
  estimatedDelivery: string;
  notes?: string;
  status: ImportOfferStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DealerImportOfferView {
  offer: ImportOfferRecord;
  request: ImportRequestRecord;
}

export interface ImportActor {
  id: string;
  role: "user" | "dealer";
  scope: StorageScope;
  dealerId?: string;
}

export type ImportWorkflowErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "REQUEST_NOT_FOUND"
  | "OFFER_NOT_FOUND"
  | "VALIDATION_ERROR"
  | "INVALID_STATUS_TRANSITION"
  | "DUPLICATE_ACTIVE_OFFER"
  | "STORAGE_READ_FAILED"
  | "STORAGE_WRITE_FAILED";

export class ImportWorkflowError extends Error {
  constructor(
    public readonly code: ImportWorkflowErrorCode,
    public readonly fields: Record<string, string> = {},
  ) {
    super(code);
    this.name = "ImportWorkflowError";
  }
}

export type ImportDetailState = "loading" | "ready" | "forbidden" | "not-found" | "error";

export function resolveImportDetailState({
  isLoading,
  request,
  error,
}: {
  isLoading: boolean;
  request: ImportRequestRecord | undefined;
  error: unknown;
}): ImportDetailState {
  if (isLoading) return "loading";
  if (request) return "ready";
  if (error instanceof ImportWorkflowError) {
    if (error.code === "FORBIDDEN") return "forbidden";
    if (error.code === "REQUEST_NOT_FOUND") return "not-found";
  }
  return "error";
}

export function importActor(user: AuthUser | null | undefined): ImportActor {
  if (!user) throw new ImportWorkflowError("UNAUTHENTICATED");
  return {
    id: user.id,
    role: user.role,
    scope: `${user.role}:${user.id}`,
    dealerId: user.dealerId,
  };
}

export function validateImportRequest(input: {
  make: string;
  model: string;
  year: number;
  budget: number;
  preferences?: string;
}) {
  const fields: Record<string, string> = {};
  const maximumYear = new Date().getFullYear() + 1;
  if (!input.make.trim()) fields.make = "required";
  if (!input.model.trim()) fields.model = "required";
  if (!Number.isInteger(input.year) || input.year < 1900 || input.year > maximumYear)
    fields.year = "range";
  if (!Number.isFinite(input.budget) || input.budget <= 0) fields.budget = "positive";
  if ((input.preferences?.length ?? 0) > 1000) fields.preferences = "length";
  return fields;
}

export function validateImportOffer(input: {
  price: number;
  currency?: MoneyCurrency;
  estimatedDelivery: string;
  notes?: string;
}) {
  const fields: Record<string, string> = {};
  try {
    parseMoney(input.price, input.currency ?? "EGP");
  } catch (error) {
    fields.price = error instanceof MoneyValidationError ? error.code : "positive";
  }
  if (!input.estimatedDelivery.trim()) fields.estimatedDelivery = "required";
  if (input.estimatedDelivery.length > 100) fields.estimatedDelivery = "length";
  if ((input.notes?.length ?? 0) > 1000) fields.notes = "length";
  return fields;
}
