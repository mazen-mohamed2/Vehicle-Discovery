import test from "node:test";
import assert from "node:assert/strict";
import { clearTypeScriptModules, loadTypeScript } from "./ts-module-loader.mjs";

class MemoryStorage {
  values = new Map();
  failKey = null;
  getItem(key) {
    return this.values.get(key) ?? null;
  }
  setItem(key, value) {
    if (key === this.failKey) throw new Error("storage");
    this.values.set(key, String(value));
  }
  removeItem(key) {
    this.values.delete(key);
  }
}
function environment() {
  const localStorage = new MemoryStorage();
  globalThis.window = {
    localStorage,
    dispatchEvent() {},
    addEventListener() {},
    removeEventListener() {},
  };
  globalThis.localStorage = localStorage;
  clearTypeScriptModules();
  return {
    localStorage,
    ...loadTypeScript("src/services/import-requests.service.ts"),
    ...loadTypeScript("src/lib/import-workflow.ts"),
  };
}
const authFixtures = loadTypeScript("src/services/auth.service.ts").developmentAuthFixtures;
const actorFor = (email) => {
  const user = authFixtures.find((fixture) => fixture.user.email === email).user;
  return {
    id: user.id,
    role: user.role,
    scope: `${user.role}:${user.id}`,
    dealerId: user.dealerId,
  };
};
const userA = actorFor("customer@sahladaraj.dev");
const userB = actorFor("customer2@sahladaraj.dev");
const dealerA = actorFor("dealer@sahladaraj.dev");
const dealerB = actorFor("dealer2@sahladaraj.dev");
const requestInput = {
  make: "BMW",
  model: "530i",
  year: 2025,
  budget: 2500000,
  currency: "EGP",
  preferences: "Blue",
};
const offerInput = {
  price: 2400000,
  currency: "EGP",
  estimatedDelivery: "8 to 10 weeks",
  notes: "Subject to customs",
};

test("guest actor creation is rejected", () => {
  const { importActor, ImportWorkflowError } = environment();
  assert.throws(
    () => importActor(null),
    (error) => error instanceof ImportWorkflowError && error.code === "UNAUTHENTICATED",
  );
});
test("individual creates a canonical owned request that survives service reload", () => {
  const state = environment();
  const request = state.importRequestsService.createRequest(userA, requestInput);
  assert.match(request.id, /^import_/);
  assert.equal(request.ownerUserId, userA.id);
  assert.equal(request.status, "OPEN");
  clearTypeScriptModules();
  const reloaded = loadTypeScript("src/services/import-requests.service.ts").importRequestsService;
  assert.deepEqual(
    reloaded.ownedRequests(userA).map((item) => item.id),
    [request.id],
  );
});
test("request validation rejects invalid vehicle data", () => {
  const { importRequestsService: service } = environment();
  assert.throws(
    () => service.createRequest(userA, { ...requestInput, make: "", budget: 0 }),
    (error) =>
      error.code === "VALIDATION_ERROR" &&
      error.fields.make === "required" &&
      error.fields.budget === "positive",
  );
});
test("owner scopes and roles are enforced", () => {
  const { importRequestsService: service } = environment();
  const request = service.createRequest(userA, requestInput);
  assert.throws(
    () => service.ownerRequest(userB, request.id),
    (error) => error.code === "FORBIDDEN",
  );
  assert.deepEqual(service.ownedRequests(userB), []);
  assert.throws(
    () => service.cancelRequest(userB, request.id),
    (error) => error.code === "FORBIDDEN",
  );
  assert.throws(
    () => service.cancelRequest(dealerA, request.id),
    (error) => error.code === "FORBIDDEN",
  );
  assert.throws(
    () => service.submitOffer(userA, request.id, offerInput),
    (error) => error.code === "FORBIDDEN",
  );
});
test("unauthorized and missing owner details resolve to terminal non-loading states", () => {
  const state = environment();
  const request = state.importRequestsService.createRequest(userA, requestInput);
  for (const [actor, id, expectedCode, expectedState] of [
    [userB, request.id, "FORBIDDEN", "forbidden"],
    [userA, "missing", "REQUEST_NOT_FOUND", "not-found"],
  ]) {
    let error;
    try {
      state.importRequestsService.ownerRequest(actor, id);
    } catch (caught) {
      error = caught;
    }
    assert.equal(error.code, expectedCode);
    const resolved = state.resolveImportDetailState({
      isLoading: false,
      request: undefined,
      error,
    });
    assert.equal(resolved, expectedState);
    assert.notEqual(resolved, "loading");
  }
  assert.throws(() => state.importRequestsService.ownerRequest(userB, request.id));
});
test("dealers see open opportunities and submit isolated offers", () => {
  const { importRequestsService: service } = environment();
  const request = service.createRequest(userA, requestInput);
  assert.equal(service.openRequests(dealerA)[0].id, request.id);
  const offer = service.submitOffer(dealerA, request.id, offerInput);
  assert.equal(service.offersForDealer(dealerA)[0].id, offer.id);
  assert.deepEqual(service.offersForDealer(dealerB), []);
  assert.equal(service.dealerOfferHistory(dealerA)[0].offer.status, "PENDING");
  assert.deepEqual(service.dealerOfferHistory(dealerB), []);
  assert.equal(service.offersForOwner(userA, request.id)[0].dealerId, "ag1");
});
test("duplicate active dealer offers are rejected", () => {
  const { importRequestsService: service } = environment();
  const request = service.createRequest(userA, requestInput);
  service.submitOffer(dealerA, request.id, offerInput);
  assert.throws(
    () => service.submitOffer(dealerA, request.id, offerInput),
    (error) => error.code === "DUPLICATE_ACTIVE_OFFER",
  );
});
test("dealer can withdraw only their own pending offer", () => {
  const { importRequestsService: service } = environment();
  const request = service.createRequest(userA, requestInput);
  const offer = service.submitOffer(dealerA, request.id, offerInput);
  assert.throws(
    () => service.withdrawOffer(dealerB, offer.id),
    (error) => error.code === "FORBIDDEN",
  );
  assert.equal(service.withdrawOffer(dealerA, offer.id).status, "WITHDRAWN");
  assert.equal(service.dealerOfferHistory(dealerA)[0].offer.status, "WITHDRAWN");
});
test("two canonical dealers cannot mutate each other's offers", () => {
  const { importRequestsService: service } = environment();
  const request = service.createRequest(userA, requestInput);
  const first = service.submitOffer(dealerA, request.id, offerInput);
  const second = service.submitOffer(dealerB, request.id, { ...offerInput, price: 2300000 });
  assert.throws(
    () => service.withdrawOffer(dealerA, second.id),
    (error) => error.code === "FORBIDDEN",
  );
  assert.throws(
    () => service.withdrawOffer(dealerB, first.id),
    (error) => error.code === "FORBIDDEN",
  );
});
test("owner rejects a pending offer and dealer cannot reject it", () => {
  const { importRequestsService: service } = environment();
  const request = service.createRequest(userA, requestInput);
  const offer = service.submitOffer(dealerA, request.id, offerInput);
  assert.throws(
    () => service.rejectOffer(dealerA, request.id, offer.id),
    (error) => error.code === "FORBIDDEN",
  );
  assert.equal(service.rejectOffer(userA, request.id, offer.id).status, "REJECTED");
  assert.equal(service.dealerOfferHistory(dealerA)[0].offer.status, "REJECTED");
});
test("accepting one offer atomically accepts it and rejects competitors", () => {
  const { importRequestsService: service } = environment();
  const request = service.createRequest(userA, requestInput);
  const first = service.submitOffer(dealerA, request.id, offerInput);
  const second = service.submitOffer(dealerB, request.id, { ...offerInput, price: 2300000 });
  const result = service.acceptOffer(userA, request.id, second.id);
  assert.equal(result.request.status, "OFFER_ACCEPTED");
  assert.equal(result.request.acceptedOfferId, second.id);
  assert.equal(result.offers.find((item) => item.id === second.id).status, "ACCEPTED");
  assert.equal(result.offers.find((item) => item.id === first.id).status, "REJECTED");
  assert.equal(service.dealerOfferHistory(dealerA)[0].offer.status, "REJECTED");
  assert.equal(service.dealerOfferHistory(dealerB)[0].offer.status, "ACCEPTED");
  assert.deepEqual(service.openRequests(dealerA), []);
  assert.deepEqual(service.openRequests(dealerB), []);
  assert.throws(
    () => service.dealerRequest(dealerA, request.id),
    (error) => error.code === "REQUEST_NOT_FOUND",
  );
  assert.throws(
    () => service.submitOffer(dealerA, request.id, offerInput),
    (error) => error.code === "INVALID_STATUS_TRANSITION",
  );
});
test("cancelled requests remain historical and reject new offers", () => {
  const { importRequestsService: service } = environment();
  const request = service.createRequest(userA, requestInput);
  assert.equal(service.cancelRequest(userA, request.id).status, "CANCELLED");
  assert.equal(service.ownedRequests(userA).length, 1);
  assert.deepEqual(service.openRequests(dealerA), []);
  assert.throws(
    () => service.dealerRequest(dealerB, request.id),
    (error) => error.code === "REQUEST_NOT_FOUND",
  );
  assert.throws(
    () => service.submitOffer(dealerA, request.id, offerInput),
    (error) => error.code === "INVALID_STATUS_TRANSITION",
  );
});
test("canonical dealer profiles resolve to records and never undefined", async () => {
  const { agenciesService } = loadTypeScript("src/services/agencies.service.ts");
  for (const dealer of [dealerA, dealerB]) {
    const agency = await agenciesService.byId(dealer.dealerId);
    assert.notEqual(agency, undefined);
    assert.equal(agency.id, dealer.dealerId);
  }
  assert.equal(await agenciesService.byId("missing-agency"), null);
});

test("request and offer retain canonical make, model, and explicit currency", () => {
  const { importRequestsService: service } = environment();
  const request = service.createRequest(userA, requestInput);
  const offer = service.submitOffer(dealerA, request.id, offerInput);
  assert.equal(request.make, "BMW");
  assert.equal(request.model, "530i");
  assert.equal(request.currency, "EGP");
  assert.equal(offer.currency, "EGP");
  assert.equal(offer.dealerId, dealerA.dealerId);
});
test("invalid IDs and corrupted persistence fail with typed errors", () => {
  const { importRequestsService: service, localStorage } = environment();
  assert.throws(
    () => service.ownerRequest(userA, "missing"),
    (error) => error.code === "REQUEST_NOT_FOUND",
  );
  localStorage.values.set("sd-import-marketplace-requests", '[{"bad":true}]');
  assert.throws(
    () => service.ownedRequests(userA),
    (error) => error.code === "STORAGE_READ_FAILED",
  );
});
test("failed persistence is surfaced and acceptance rolls the request back", () => {
  const { importRequestsService: service, localStorage } = environment();
  const request = service.createRequest(userA, requestInput);
  const offer = service.submitOffer(dealerA, request.id, offerInput);
  localStorage.failKey = "sd-import-marketplace-offers";
  assert.throws(
    () => service.acceptOffer(userA, request.id, offer.id),
    (error) => error.code === "STORAGE_WRITE_FAILED",
  );
  localStorage.failKey = null;
  assert.equal(service.ownerRequest(userA, request.id).status, "OPEN");
});
