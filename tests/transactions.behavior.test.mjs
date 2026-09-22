import nodeTest from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { clearTypeScriptModules, loadTypeScript } from "./ts-module-loader.mjs";

const KEY = "sd-marketplace-transactions";
const test = (name, fn) => nodeTest(name, { timeout: 10000 }, fn);
class MemoryStorage {
  values = new Map();
  failRead = false;
  failWrite = false;
  getItem(key) {
    if (this.failRead) throw new Error("read");
    return this.values.get(key) ?? null;
  }
  setItem(key, value) {
    if (this.failWrite) throw new Error("write");
    this.values.set(key, String(value));
  }
  removeItem(key) {
    this.values.delete(key);
  }
}
function setup() {
  const storage = new MemoryStorage();
  const listeners = new Map();
  globalThis.window = {
    localStorage: storage,
    dispatchEvent(event) {
      for (const listener of listeners.get(event.type) ?? []) listener(event);
    },
    addEventListener(name, listener) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(listener);
    },
    removeEventListener(name, listener) {
      listeners.get(name)?.delete(listener);
    },
  };
  globalThis.localStorage = storage;
  clearTypeScriptModules();
  const fixtures = loadTypeScript("src/services/auth.service.ts").developmentAuthFixtures;
  const actors = fixtures.map(({ user }) => ({
    id: user.id,
    role: user.role,
    scope: `${user.role}:${user.id}`,
    dealerId: user.dealerId,
  }));
  const actorFor = (email) =>
    actors.find((actor) => actor.id === fixtures.find(({ user }) => user.email === email).user.id);
  return {
    storage,
    actors,
    buyer: actorFor("customer@sahladaraj.dev"),
    other: actorFor("customer2@sahladaraj.dev"),
    dealer: actorFor("dealer@sahladaraj.dev"),
    otherDealer: actorFor("dealer2@sahladaraj.dev"),
    service: loadTypeScript("src/services/marketplace-transactions.service.ts")
      .marketplaceTransactionsService,
    offers: loadTypeScript("src/services/marketplace-communication.service.ts")
      .marketplaceCommunicationService,
    imports: loadTypeScript("src/services/import-requests.service.ts").importRequestsService,
    catalog: loadTypeScript("src/services/public-catalog.service.ts").publicCatalogService,
    domain: loadTypeScript("src/lib/marketplace-transaction.ts"),
  };
}
const code = (expected) => (error) => error?.code === expected;
function listingOffer(env, listingId = "v1", status = "ACCEPTED") {
  const listing = env.catalog.byId(listingId);
  const seller = env.actors.find((actor) => actor.id === listing.sellerUserId);
  const offer = env.offers.createOffer(env.buyer, listingId, {
    amount: 123456.78,
    currency: "USD",
  });
  if (status === "ACCEPTED") env.offers.acceptOffer(seller, offer.id);
  if (status === "REJECTED") env.offers.rejectOffer(seller, offer.id);
  if (status === "WITHDRAWN") env.offers.withdrawOffer(env.buyer, offer.id);
  return {
    offer,
    listing,
    seller,
    source: { type: "LISTING_OFFER", offerId: offer.id, listingId },
  };
}
const startListing = (env, input, actor = env.buyer) =>
  env.service.createFromListingOffer(actor, input.offer.id, input.listing.id);
function importOffer(env, status = "ACCEPTED") {
  const request = env.imports.createRequest(env.buyer, {
    make: "BMW",
    model: "530i",
    year: 2025,
    budget: 999999,
    currency: "EGP",
  });
  const offer = env.imports.submitOffer(env.dealer, request.id, {
    price: 25000.25,
    currency: "USD",
    estimatedDelivery: "8 weeks",
  });
  if (status === "ACCEPTED") env.imports.acceptOffer(env.buyer, request.id, offer.id);
  if (status === "REJECTED") env.imports.rejectOffer(env.buyer, request.id, offer.id);
  if (status === "WITHDRAWN") env.imports.withdrawOffer(env.dealer, offer.id);
  return {
    request,
    offer,
    source: { type: "IMPORT_OFFER", offerId: offer.id, importRequestId: request.id },
  };
}
const startImport = (env, input, actor = env.buyer) =>
  env.service.createFromImportOffer(actor, input.offer.id, input.request.id);

for (const [category, listingId] of [
  ["CAR", "v1"],
  ["MOTORCYCLE", "moto1"],
  ["BOAT", "boat1"],
]) {
  test(`${category}: accepted offer creates one immutable initial transaction, not SOLD/payment/escrow`, async () => {
    const env = setup();
    const input = listingOffer(env, listingId);
    assert.equal(env.storage.getItem(KEY), null, "acceptance alone must not create a transaction");
    const beforeOffers = env.storage.getItem("sd-marketplace-vehicle-offers");
    const beforeListing = structuredClone(env.catalog.byId(listingId));
    const record = await startListing(env, input);
    assert.equal(record.snapshot.category, category);
    assert.deepEqual(record.source, input.source);
    assert.equal(record.buyerParticipantId, env.buyer.id);
    assert.equal(record.sellerParticipantId, input.listing.sellerUserId);
    assert.equal(record.agreedAmount, input.offer.amount);
    assert.equal(record.currency, "USD");
    assert.notEqual(record.agreedAmount, input.listing.price);
    assert.equal(record.status, "AWAITING_PAYMENT");
    assert.deepEqual(record.payment, { status: "NOT_STARTED" });
    assert.deepEqual(record.escrow, { status: "NOT_STARTED" });
    assert.equal(record.createdAt, record.updatedAt);
    assert.equal(env.storage.getItem("sd-marketplace-vehicle-offers"), beforeOffers);
    assert.deepEqual(env.catalog.byId(listingId), beforeListing);
    assert.equal(env.offers.buyerOffers(env.buyer)[0].status, "ACCEPTED");
    assert.deepEqual(env.service.getById(input.seller, record.id), record);
    assert.equal(env.service.listForParticipant(input.seller)[0].id, record.id);
  });
}
for (const status of ["PENDING", "REJECTED", "WITHDRAWN"]) {
  test(`${status} listing offer cannot start transaction`, async () => {
    const env = setup();
    await assert.rejects(
      startListing(env, listingOffer(env, "v1", status)),
      code("SOURCE_NOT_ACCEPTED"),
    );
    assert.equal(env.storage.getItem(KEY), null);
  });
  test(`${status} import offer cannot start transaction`, async () => {
    const env = setup();
    await assert.rejects(startImport(env, importOffer(env, status)), code("SOURCE_NOT_ACCEPTED"));
    assert.equal(env.storage.getItem(KEY), null);
  });
}
test("same-tab concurrent starts and later retries return one canonical transaction", async () => {
  const env = setup();
  const input = listingOffer(env);
  const records = await Promise.all(Array.from({ length: 5 }, () => startListing(env, input)));
  assert.equal(new Set(records.map((record) => record.id)).size, 1);
  assert.equal(JSON.parse(env.storage.getItem(KEY)).records.length, 1);
  assert.deepEqual(env.service.getBySource(input.seller, input.source), records[0]);
  await assert.rejects(startListing(env, input, input.seller), code("FORBIDDEN"));
});
test("a rejected start releases its lock so a later accepted offer can start", async () => {
  const env = setup();
  const input = listingOffer(env, "v1", "PENDING");
  await assert.rejects(startListing(env, input), code("SOURCE_NOT_ACCEPTED"));
  env.offers.acceptOffer(input.seller, input.offer.id);
  const record = await startListing(env, input);
  assert.equal(record.status, "AWAITING_PAYMENT");
  assert.equal(env.service.listForParticipant(env.buyer).length, 1);
});
test("guest, seller and unrelated identities cannot initiate; no arbitrary participants", async () => {
  const env = setup();
  const input = listingOffer(env);
  await assert.rejects(startListing(env, input, null), code("UNAUTHENTICATED"));
  await assert.rejects(startListing(env, input, input.seller), code("FORBIDDEN"));
  await assert.rejects(startListing(env, input, env.other), code("SOURCE_NOT_FOUND"));
  await assert.rejects(
    startListing(env, input, { ...env.buyer, scope: env.other.scope }),
    code("FORBIDDEN"),
  );
  assert.equal(env.storage.getItem(KEY), null);
});
test("participants see one stable ID after reload/account switching; unrelated accounts are denied", async () => {
  const env = setup();
  const input = listingOffer(env);
  const record = await startListing(env, input);
  clearTypeScriptModules();
  const fresh = loadTypeScript(
    "src/services/marketplace-transactions.service.ts",
  ).marketplaceTransactionsService;
  for (const actor of [env.buyer, input.seller, env.buyer])
    assert.equal(fresh.listForParticipant(actor)[0].id, record.id);
  for (const actor of [env.other, env.otherDealer]) {
    assert.deepEqual(fresh.listForParticipant(actor), []);
    assert.throws(() => fresh.getById(actor, record.id), code("FORBIDDEN"));
    assert.throws(() => fresh.getBySource(actor, input.source), code("FORBIDDEN"));
  }
  assert.throws(() => fresh.getById(env.buyer, "missing"), code("NOT_FOUND"));
  assert.throws(() => fresh.listForParticipant(null), code("UNAUTHENTICATED"));
  assert.equal(JSON.parse(env.storage.getItem(KEY)).records.length, 1);
});
test("price/media changes and unavailable source never rewrite or delete historical agreement", async () => {
  const env = setup();
  const input = listingOffer(env);
  const record = await startListing(env, input);
  const stored = env.storage.getItem(KEY);
  const original = env.catalog.byId;
  env.catalog.byId = (id) => ({ ...original(id), price: 1, title: "Changed", images: [] });
  assert.deepEqual(env.service.getById(env.buyer, record.id), record);
  assert.deepEqual(await startListing(env, input), record);
  env.catalog.byId = () => undefined;
  assert.deepEqual(env.service.getById(input.seller, record.id), record);
  assert.deepEqual(await startListing(env, input), record);
  env.catalog.byId = () => {
    throw new Error("catalog failure");
  };
  assert.equal(env.service.listForParticipant(env.buyer).length, 1);
  assert.equal(env.storage.getItem(KEY), stored);
  assert.equal("images" in record.snapshot, false);
});
test("mutating a returned record cannot change persisted financial terms", async () => {
  const env = setup();
  const input = listingOffer(env);
  const record = await startListing(env, input);
  const original = structuredClone(record);
  record.agreedAmount = 1;
  record.currency = "EGP";
  record.source.offerId = "other";
  record.payment.status = "SUCCEEDED";
  record.snapshot.title = "changed";
  assert.deepEqual(env.service.getById(env.buyer, original.id), original);
});
test("source mismatches and missing offers are rejected, including mismatched idempotent retries", async () => {
  const env = setup();
  const input = listingOffer(env);
  await assert.rejects(
    env.service.createFromListingOffer(env.buyer, "missing", "v1"),
    code("SOURCE_NOT_FOUND"),
  );
  await assert.rejects(
    env.service.createFromListingOffer(env.buyer, input.offer.id, "boat1"),
    code("INVALID_SOURCE"),
  );
  await startListing(env, input);
  await assert.rejects(
    env.service.createFromListingOffer(env.buyer, input.offer.id, "boat1"),
    code("INVALID_SOURCE"),
  );
  assert.equal(env.service.listForParticipant(env.buyer).length, 1);
});
test("invalid amounts, currencies and missing or self participants cannot be persisted", async () => {
  const env = setup();
  const input = listingOffer(env);
  const original = env.offers.buyerOffers;
  const accepted = original(env.buyer)[0];
  for (const amount of [0, -1, NaN, Infinity]) {
    env.offers.buyerOffers = () => [{ ...accepted, amount }];
    await assert.rejects(startListing(env, input), code("INVALID_AMOUNT"));
  }
  env.offers.buyerOffers = () => [{ ...accepted, currency: "FAKE" }];
  await assert.rejects(startListing(env, input), code("INVALID_CURRENCY"));
  env.offers.buyerOffers = () => [{ ...accepted, sellerUserId: "" }];
  await assert.rejects(startListing(env, input), code("INVALID_PARTICIPANTS"));
  env.offers.buyerOffers = () => [{ ...accepted, sellerUserId: env.buyer.id }];
  env.catalog.byId = () => ({ ...input.listing, sellerUserId: env.buyer.id });
  await assert.rejects(startListing(env, input), code("INVALID_PARTICIPANTS"));
  assert.equal(env.storage.getItem(KEY), null);
});
test("accepted import offer uses owner/dealer canonical IDs and price, not request budget", async () => {
  const env = setup();
  const input = importOffer(env);
  assert.equal(env.storage.getItem(KEY), null);
  const requests = env.storage.getItem("sd-import-marketplace-requests");
  const offers = env.storage.getItem("sd-import-marketplace-offers");
  const record = await startImport(env, input);
  assert.deepEqual(record.source, input.source);
  assert.equal(record.buyerParticipantId, env.buyer.id);
  assert.equal(record.sellerParticipantId, env.dealer.id);
  assert.notEqual(record.sellerParticipantId, env.dealer.dealerId);
  assert.equal(record.agreedAmount, 25000.25);
  assert.equal(record.currency, "USD");
  assert.equal(record.snapshot.category, "CAR");
  assert.equal(record.status, "AWAITING_PAYMENT");
  assert.equal(record.payment.status, "NOT_STARTED");
  assert.equal(record.escrow.status, "NOT_STARTED");
  assert.deepEqual(env.service.getById(env.dealer, record.id), record);
  assert.deepEqual(await startImport(env, input), record);
  assert.equal(env.storage.getItem("sd-import-marketplace-requests"), requests);
  assert.equal(env.storage.getItem("sd-import-marketplace-offers"), offers);
});
test("only import owner may start; nonparticipating dealers/customers cannot read", async () => {
  const env = setup();
  const input = importOffer(env);
  await assert.rejects(startImport(env, input, env.dealer), code("FORBIDDEN"));
  await assert.rejects(startImport(env, input, env.other), code("FORBIDDEN"));
  const record = await startImport(env, input);
  await assert.rejects(startImport(env, input, env.dealer), code("FORBIDDEN"));
  for (const actor of [env.otherDealer, env.other]) {
    assert.throws(() => env.service.getById(actor, record.id), code("FORBIDDEN"));
    assert.deepEqual(env.service.listForParticipant(actor), []);
  }
});
test("import request/accepted offer mismatch cannot create an agreement", async () => {
  const env = setup();
  const input = importOffer(env);
  const original = env.imports.ownerRequest;
  env.imports.ownerRequest = (...args) => ({ ...original(...args), acceptedOfferId: "different" });
  await assert.rejects(startImport(env, input), code("INVALID_SOURCE"));
  assert.equal(env.storage.getItem(KEY), null);
});
test("import transaction history survives request and offer removal", async () => {
  const env = setup();
  const input = importOffer(env);
  const record = await startImport(env, input);
  env.storage.removeItem("sd-import-marketplace-requests");
  env.storage.removeItem("sd-import-marketplace-offers");
  assert.deepEqual(env.service.getById(env.dealer, record.id), record);
  assert.deepEqual(await startImport(env, input), record);
});
test("corrupted and unknown-version storage remains intact and produces typed terminal errors", async () => {
  const env = setup();
  const input = listingOffer(env);
  for (const raw of ["bad json", "null", "[]", '{"schemaVersion":99,"records":[]}']) {
    env.storage.setItem(KEY, raw);
    assert.throws(() => env.service.listForParticipant(env.buyer), code("STORAGE_READ_FAILED"));
    await assert.rejects(startListing(env, input), code("STORAGE_READ_FAILED"));
    assert.equal(env.storage.getItem(KEY), raw);
  }
});
test("persisted financial success, duplicate IDs/sources and invalid fields are rejected", async () => {
  const env = setup();
  const input = listingOffer(env);
  const record = await startListing(env, input);
  const invalid = [
    [{ ...record, status: "COMPLETED" }],
    [{ ...record, payment: { status: "SUCCEEDED" } }],
    ...["HELD", "RELEASED", "REFUNDED"].map((status) => [{ ...record, escrow: { status } }]),
    [{ ...record, payment: { status: "NOT_STARTED", providerReference: "fake" } }],
    [{ ...record, agreedAmount: -1 }],
    [{ ...record, currency: "XYZ" }],
    [{ ...record, sellerParticipantId: record.buyerParticipantId }],
    [{ ...record, buyerParticipantId: "" }],
    [{ ...record, createdAt: "invalid" }],
    [{ ...record, snapshot: { ...record.snapshot, images: [] } }],
    [record, record],
    [record, { ...record, id: "new-id" }],
  ];
  for (const records of invalid) {
    const raw = JSON.stringify({ schemaVersion: 1, records });
    env.storage.setItem(KEY, raw);
    assert.throws(() => env.service.getById(env.buyer, record.id), code("STORAGE_READ_FAILED"));
    assert.equal(env.storage.getItem(KEY), raw);
  }
});
test("failed write creates no partial transaction; retry safely creates exactly one", async () => {
  const env = setup();
  const input = listingOffer(env);
  const before = new Map(env.storage.values);
  env.storage.failWrite = true;
  await assert.rejects(startListing(env, input), code("STORAGE_WRITE_FAILED"));
  assert.deepEqual(env.storage.values, before);
  env.storage.failWrite = false;
  await startListing(env, input);
  await startListing(env, input);
  assert.equal(env.service.listForParticipant(env.buyer).length, 1);
  env.storage.failRead = true;
  assert.throws(() => env.service.listForParticipant(env.buyer), code("STORAGE_READ_FAILED"));
});
test("invalid write schema cannot create a partial financial record", async () => {
  const env = setup();
  const input = listingOffer(env);
  env.catalog.byId = () => ({ ...input.listing, title: "", category: "OTHER" });
  await assert.rejects(startListing(env, input), code("STORAGE_WRITE_FAILED"));
  assert.equal(env.storage.getItem(KEY), null);
});
test("local and cross-tab events notify observers; unrelated storage events do not", async () => {
  const env = setup();
  const input = listingOffer(env);
  let updates = 0;
  const unsubscribe = env.service.subscribe(() => updates++);
  await startListing(env, input);
  assert.equal(updates, 1);
  window.dispatchEvent({ type: "storage", key: "other" });
  assert.equal(updates, 1);
  window.dispatchEvent({ type: "storage", key: KEY });
  assert.equal(updates, 2);
  window.dispatchEvent({ type: "storage", key: null });
  assert.equal(updates, 3);
  unsubscribe();
  window.dispatchEvent({ type: "storage", key: KEY });
  assert.equal(updates, 3);
});
test("transaction queries partition scopes and presentation retains fractional money in EN/AR", () => {
  const env = setup();
  const { queryKeys } = loadTypeScript("src/lib/query-keys.ts");
  assert.notDeepEqual(
    queryKeys.transactions.list(env.buyer.scope),
    queryKeys.transactions.list(env.other.scope),
  );
  assert.notDeepEqual(
    queryKeys.transactions.detail(env.dealer.scope, "id"),
    queryKeys.transactions.detail(env.otherDealer.scope, "id"),
  );
  assert.match(env.domain.formatTransactionAmount(123.45, "USD", "en"), /123\.45/);
  assert.match(env.domain.formatTransactionAmount(123.45, "EGP", "ar"), /١٢٣٫٤٥/);
  const { transactionsEn, transactionsAr } = loadTypeScript("src/lib/transaction-copy.ts");
  assert.deepEqual(Object.keys(transactionsEn), Object.keys(transactionsAr));
  for (const key of Object.keys(transactionsEn))
    assert.ok(transactionsEn[key] && transactionsAr[key]);
});
test("structural guard: financial UI exposes only start/view and private account routes", () => {
  const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const service = read("src/services/marketplace-transactions.service.ts");
  const entry = read("src/components/transactions/TransactionEntry.tsx");
  const pages = read("src/components/transactions/Transactions.tsx");
  assert.doesNotMatch(
    service + entry + pages,
    /status:\s*["'](?:SUCCEEDED|COMPLETED|HELD|RELEASED|REFUNDED)["']/,
  );
  assert.doesNotMatch(pages, /onClick|<input|<form/);
  assert.match(entry, /transactions.waitingBuyer/);
  assert.match(entry, /transactions.waitingCustomer/);
  assert.match(entry, /transactions.view/);
  assert.match(entry, /transactions.start/);
  assert.match(pages, /AuthBoundary role=\{role\}/);
  assert.match(pages, /transactions.listingUnavailable/);
  const hook = read("src/hooks/use-transactions.ts");
  assert.match(hook, /!auth.isHydrating/);
  assert.match(hook, /retry: false/);
  assert.match(hook, /transactions.list\(scope\)/);
  assert.match(hook, /transactions.detail\(scope,/);
  for (const base of ["account", "dealer-account"]) {
    for (const suffix of ["page.tsx", "[transactionId]/page.tsx"]) {
      const route = read(`src/app/(site)/${base}/transactions/${suffix}`);
      assert.match(route, /index: false/);
      assert.match(route, /follow: false/);
      assert.doesNotMatch(route, /agreedAmount|ParticipantId/);
    }
  }
});
