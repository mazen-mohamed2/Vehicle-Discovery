import test from "node:test";
import assert from "node:assert/strict";
import { clearTypeScriptModules, loadTypeScript } from "./ts-module-loader.mjs";

class MemoryStorage {
  values = new Map();
  failWrite = false;
  getItem(key) {
    return this.values.get(key) ?? null;
  }
  setItem(key, value) {
    if (this.failWrite) throw new Error("storage");
    this.values.set(key, String(value));
  }
  removeItem(key) {
    this.values.delete(key);
  }
}
function setup() {
  const localStorage = new MemoryStorage();
  globalThis.window = {
    localStorage,
    dispatchEvent() {},
    addEventListener() {},
    removeEventListener() {},
  };
  globalThis.localStorage = localStorage;
  globalThis.CustomEvent ??= class CustomEvent {
    constructor(type, init) {
      this.type = type;
      this.detail = init?.detail;
    }
  };
  clearTypeScriptModules();
  return {
    localStorage,
    ...loadTypeScript("src/services/managed-listings.service.ts"),
    ...loadTypeScript("src/lib/listing.ts"),
  };
}
const userA = { scope: "user:a", id: "a", role: "user", displayName: "A" };
const userB = { scope: "user:b", id: "b", role: "user", displayName: "B" };
const dealer = {
  scope: "dealer:d",
  id: "d",
  role: "dealer",
  displayName: "Dealer",
  dealerId: "ag1",
};
function complete(service, owner, id, withImage = true) {
  return service.updateDraft(owner, id, {
    make: "Toyota",
    model: "Corolla",
    year: 2024,
    mileage: 1000,
    transmission: "automatic",
    fuelType: "gasoline",
    price: 900000,
    location: "Cairo",
    description: "A carefully maintained vehicle with complete service history.",
    images: withImage
      ? [
          {
            id: "demo",
            url: "/assets/car-1.jpg",
            name: "Toyota",
            type: "image/jpeg",
            size: 0,
            order: 0,
            isCover: true,
            createdAt: new Date().toISOString(),
          },
        ]
      : [],
    declarations: {
      informationAccuracyAccepted: true,
      ownershipOrAuthorizationAccepted: true,
      termsAccepted: true,
      externalTransactionRiskAcknowledged: true,
    },
  });
}

test("guest cannot create a listing owner", () => {
  const { listingOwner, ListingServiceError } = setup();
  assert.throws(
    () => listingOwner(null),
    (error) => error instanceof ListingServiceError && error.code === "UNAUTHENTICATED",
  );
});
test("individual and dealer drafts use stable canonical IDs", () => {
  const { managedListingsService: service } = setup();
  const individual = service.createDraft(userA);
  const dealerDraft = service.createDraft(dealer);
  assert.match(individual.id, /^listing_/);
  assert.match(dealerDraft.id, /^listing_/);
  assert.notEqual(individual.id, dealerDraft.id);
  const updated = service.updateDraft(userA, individual.id, { make: "BMW" });
  assert.equal(updated.id, individual.id);
  assert.equal(updated.make, "BMW");
  assert.equal(dealerDraft.dealerId, "ag1");
});
test("incomplete drafts save but cannot publish", () => {
  const { managedListingsService: service, ListingServiceError } = setup();
  const draft = service.createDraft(userA);
  service.updateDraft(userA, draft.id, { make: "Kia" });
  assert.throws(
    () => service.publishListing(userA, draft.id),
    (error) =>
      error instanceof ListingServiceError && error.code === "PUBLISH_REQUIREMENTS_NOT_MET",
  );
});
test("publishing still requires declarations but does not require an image", () => {
  const { managedListingsService: service } = setup();
  const draft = service.createDraft(userA);
  service.updateDraft(userA, draft.id, {
    make: "Toyota",
    model: "Corolla",
    year: 2024,
    mileage: 0,
    transmission: "automatic",
    fuelType: "gasoline",
    price: 1,
    location: "Cairo",
    description: "A complete description long enough for publication.",
  });
  assert.throws(
    () => service.publishListing(userA, draft.id),
    (error) => error.fields.images === undefined && error.fields.declarations === "required",
  );
});
test("a complete zero-photo draft reaches full completion and publishes with empty media", () => {
  const { managedListingsService: service } = setup();
  const draft = service.createDraft(userA);
  const completed = complete(service, userA, draft.id, false);
  assert.equal(completed.completionPercentage, 100);
  assert.deepEqual(completed.images, []);
  const published = service.publishListing(userA, draft.id);
  assert.equal(published.status, "published");
  assert.deepEqual(published.images, []);
  const publicListing = service.publicListings().find((item) => item.id === draft.id);
  assert.ok(publicListing);
  assert.deepEqual(publicListing.images, []);
});
test("the optional demo image remains supported but is never assigned automatically", () => {
  const { managedListingsService: service } = setup();
  const empty = service.createDraft(userA);
  assert.deepEqual(empty.images, []);
  const demo = service.demoImage();
  assert.equal(demo.url, "/assets/car-1.jpg");
  assert.equal(demo.temporary, undefined);
  const completed = complete(service, userA, empty.id);
  assert.equal(completed.images.length, 1);
  assert.equal(service.publishListing(userA, empty.id).images.length, 1);
});
test("missing non-photo vehicle requirements continue to block publishing", () => {
  const { managedListingsService: service } = setup();
  const draft = service.createDraft(userA);
  service.updateDraft(userA, draft.id, {
    declarations: {
      informationAccuracyAccepted: true,
      ownershipOrAuthorizationAccepted: true,
      termsAccepted: true,
      externalTransactionRiskAcknowledged: true,
    },
  });
  assert.throws(
    () => service.publishListing(userA, draft.id),
    (error) => error.fields.make === "required" && error.fields.model === "required",
  );
});
test("publish timestamps the record and composes it into the public catalog", () => {
  const { managedListingsService: service } = setup();
  const draft = service.createDraft(userA);
  complete(service, userA, draft.id);
  const published = service.publishListing(userA, draft.id);
  assert.equal(published.status, "published");
  assert.ok(published.publishedAt);
  assert.equal(published.declarations.acceptedAt, published.publishedAt);
  assert.equal(
    service.publicListings().some((item) => item.id === draft.id),
    true,
  );
});
test("account scopes cannot read or edit each other's records", () => {
  const { managedListingsService: service, ListingServiceError } = setup();
  const draft = service.createDraft(userA);
  assert.throws(
    () => service.getListingById(userB, draft.id),
    (error) => error instanceof ListingServiceError && error.code === "LISTING_NOT_FOUND",
  );
  assert.throws(
    () => service.updateDraft(userB, draft.id, { make: "Stolen" }),
    (error) => error.code === "LISTING_NOT_FOUND",
  );
});
test("duplicate receives a new ID and resets workflow, verification, and declarations", () => {
  const { managedListingsService: service } = setup();
  const draft = service.createDraft(userA);
  complete(service, userA, draft.id);
  service.publishListing(userA, draft.id);
  const copy = service.duplicateListing(userA, draft.id);
  assert.notEqual(copy.id, draft.id);
  assert.equal(copy.make, "Toyota");
  assert.equal(copy.status, "draft");
  assert.equal(copy.publishedAt, undefined);
  assert.equal(copy.vehicleVerificationStatus, "notSubmitted");
  assert.equal(copy.ownershipVerificationStatus, "notSubmitted");
  assert.equal(copy.declarations.termsAccepted, false);
});
test("sold and archive transitions enforce policy and remove active public records", () => {
  const { managedListingsService: service } = setup();
  const draft = service.createDraft(userA);
  assert.throws(
    () => service.markAsSold(userA, draft.id),
    (error) => error.code === "INVALID_STATUS_TRANSITION",
  );
  complete(service, userA, draft.id);
  service.publishListing(userA, draft.id);
  const sold = service.markAsSold(userA, draft.id);
  assert.equal(sold.status, "sold");
  assert.ok(sold.soldAt);
  assert.equal(
    service.publicListings().some((item) => item.id === draft.id),
    false,
  );
  const archived = service.archiveListing(userA, draft.id);
  assert.equal(archived.status, "archived");
  assert.ok(archived.archivedAt);
});
test("publishing one account does not erase another account's public listing", () => {
  const { managedListingsService: service } = setup();
  const a = service.createDraft(userA);
  const b = service.createDraft(userB);
  complete(service, userA, a.id);
  complete(service, userB, b.id);
  service.publishListing(userA, a.id);
  service.publishListing(userB, b.id);
  assert.deepEqual(new Set(service.publicListings().map((item) => item.id)), new Set([a.id, b.id]));
});
test("storage failures surface a typed write error", () => {
  const { managedListingsService: service, localStorage, ListingServiceError } = setup();
  localStorage.failWrite = true;
  assert.throws(
    () => service.createDraft(userA),
    (error) => error instanceof ListingServiceError && error.code === "STORAGE_WRITE_FAILED",
  );
});
test("temporary image object URLs are revoked and never persisted", () => {
  const { managedListingsService: service, localStorage } = setup();
  let revoked = "";
  const original = globalThis.URL;
  globalThis.URL = {
    createObjectURL: () => "blob:temporary",
    revokeObjectURL: (value) => {
      revoked = value;
    },
  };
  const draft = service.createDraft(userA);
  const image = {
    id: "temp",
    url: "blob:temporary",
    previewUrl: "blob:temporary",
    name: "x.jpg",
    type: "image/jpeg",
    size: 10,
    order: 0,
    isCover: true,
    createdAt: new Date().toISOString(),
    temporary: true,
  };
  service.updateDraft(userA, draft.id, { images: [image] });
  service.revokeImage(image);
  assert.equal(revoked, "blob:temporary");
  assert.equal(localStorage.getItem("sd-owned-listings:user:a").includes("blob:temporary"), false);
  globalThis.URL = original;
});

function discoveryParams(q) {
  return { q, sort: "newest", page: 1, pageSize: 24 };
}

test("the public catalog keeps seed records, excludes drafts, and resolves published IDs", async () => {
  const { managedListingsService: service } = setup();
  const { listingsService } = loadTypeScript("src/services/listings.service.ts");
  const draft = service.createDraft(userA);
  assert.equal(
    (await listingsService.list()).some((item) => item.id === "v1"),
    true,
  );
  assert.equal(
    (await listingsService.list()).some((item) => item.id === draft.id),
    false,
  );
  complete(service, userA, draft.id);
  service.publishListing(userA, draft.id);
  assert.equal(
    (await listingsService.list()).some((item) => item.id === draft.id),
    true,
  );
  assert.equal((await listingsService.byId(draft.id))?.id, draft.id);
});

test("published created records participate in public search and related ranking", async () => {
  const { managedListingsService: service } = setup();
  const { listingsService } = loadTypeScript("src/services/listings.service.ts");
  const draft = service.createDraft(userA);
  complete(service, userA, draft.id);
  service.updateDraft(userA, draft.id, { model: "UniqueSearchModel" });
  service.publishListing(userA, draft.id);
  const result = await listingsService.discover(discoveryParams("UniqueSearchModel"));
  assert.deepEqual(
    result.items.map((item) => item.id),
    [draft.id],
  );
  assert.ok((await listingsService.related(draft.id, 4)).length > 0);
});

test("sold and archived records disappear while restore returns a previously published record", async () => {
  const { managedListingsService: service } = setup();
  const { listingsService } = loadTypeScript("src/services/listings.service.ts");
  const soldDraft = service.createDraft(userA);
  complete(service, userA, soldDraft.id);
  service.publishListing(userA, soldDraft.id);
  service.markAsSold(userA, soldDraft.id);
  assert.equal(await listingsService.byId(soldDraft.id), undefined);
  const archivedDraft = service.createDraft(userA);
  complete(service, userA, archivedDraft.id);
  service.publishListing(userA, archivedDraft.id);
  service.archiveListing(userA, archivedDraft.id);
  assert.equal(await listingsService.byId(archivedDraft.id), undefined);
  const restored = service.restoreListing(userA, archivedDraft.id);
  assert.equal(restored.status, "published");
  assert.equal((await listingsService.byId(archivedDraft.id))?.id, archivedDraft.id);
});

test("dealer publications appear only in their associated dealer inventory", async () => {
  const { managedListingsService: service } = setup();
  const { listingsService } = loadTypeScript("src/services/listings.service.ts");
  const draft = service.createDraft(dealer);
  complete(service, dealer, draft.id);
  service.publishListing(dealer, draft.id);
  assert.equal(
    (await listingsService.byAgency("ag1")).some((item) => item.id === draft.id),
    true,
  );
  assert.equal(
    (await listingsService.byAgency("ag2")).some((item) => item.id === draft.id),
    false,
  );
  assert.equal((await listingsService.byId(draft.id))?.sellerType, "agency");
});

test("published canonical IDs work with existing favorites and compare persistence", async () => {
  const { managedListingsService: service } = setup();
  const { favoritesService } = loadTypeScript("src/services/favorites.service.ts");
  const { compareService } = loadTypeScript("src/services/compare.service.ts");
  const draft = service.createDraft(userA);
  complete(service, userA, draft.id);
  service.publishListing(userA, draft.id);
  await favoritesService.add("user:a", draft.id);
  await compareService.replace("user:a", [draft.id]);
  assert.equal((await favoritesService.list("user:a"))[0].listingId, draft.id);
  assert.deepEqual(await compareService.list("user:a"), [draft.id]);
});
