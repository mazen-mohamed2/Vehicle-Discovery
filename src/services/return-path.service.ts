import { roleAwareReturnPath, type AuthUser } from "@/lib/auth";
import { communicationActor } from "@/lib/communication";
import { importActor } from "@/lib/import-workflow";
import { listingOwner } from "@/services/managed-listings.service";
import { importRequestsService } from "@/services/import-requests.service";
import { managedListingsService } from "@/services/managed-listings.service";
import { marketplaceCommunicationService } from "@/services/marketplace-communication.service";

export function resolveAuthenticatedReturnPath(value: string | null | undefined, user: AuthUser) {
  const resolved = roleAwareReturnPath(value, user.role);
  const pathname = new URL(resolved, "https://local.invalid").pathname;
  const conversation = pathname.match(/^\/messages\/([^/]+)$/);
  if (conversation) {
    try {
      marketplaceCommunicationService.conversation(
        communicationActor(user),
        decodeURIComponent(conversation[1]),
      );
      return resolved;
    } catch {
      return "/messages";
    }
  }
  const ownerImport = pathname.match(/^\/account\/import-requests\/([^/]+)$/);
  if (ownerImport && user.role === "user") {
    try {
      importRequestsService.ownerRequest(importActor(user), decodeURIComponent(ownerImport[1]));
      return resolved;
    } catch {
      return "/account/import-requests";
    }
  }
  const dealerImport = pathname.match(/^\/dealer-account\/import-requests\/([^/]+)$/);
  if (dealerImport && user.role === "dealer") {
    try {
      importRequestsService.dealerRequest(importActor(user), decodeURIComponent(dealerImport[1]));
      return resolved;
    } catch {
      return "/dealer-account/import-requests";
    }
  }
  const listing = pathname.match(/^\/account\/listings\/([^/]+)\/(edit|preview)$/);
  if (listing && user.role === "user") {
    try {
      managedListingsService.getListingById(listingOwner(user), decodeURIComponent(listing[1]));
      return resolved;
    } catch {
      return "/account/listings";
    }
  }
  return resolved;
}
