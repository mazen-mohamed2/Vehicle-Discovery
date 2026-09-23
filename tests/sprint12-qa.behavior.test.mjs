import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { clearTypeScriptModules, loadTypeScript } from "./ts-module-loader.mjs";

function setup() {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
  globalThis.window = {
    localStorage: storage,
    dispatchEvent() {},
    addEventListener() {},
    removeEventListener() {},
  };
  globalThis.localStorage = storage;
  clearTypeScriptModules();
  const auth = loadTypeScript("src/services/auth.service.ts");
  const actors = auth.developmentAuthFixtures.map(({ user }) => ({
    ...user,
    scope: `${user.role}:${user.id}`,
  }));
  return {
    storage,
    actors,
    buyer: actors.find((actor) => actor.id === "user-demo"),
    dealer: actors.find((actor) => actor.id === "dealer-demo"),
    other: actors.find((actor) => actor.id === "user-qa-b"),
    auth,
    money: loadTypeScript("src/lib/money.ts"),
    presentation: loadTypeScript("src/lib/offer-presentation.ts"),
    locale: loadTypeScript("src/lib/locale.ts"),
    domain: loadTypeScript("src/lib/marketplace-transaction.ts"),
    offers: loadTypeScript("src/services/marketplace-communication.service.ts")
      .marketplaceCommunicationService,
    transactions: loadTypeScript("src/services/marketplace-transactions.service.ts")
      .marketplaceTransactionsService,
    imports: loadTypeScript("src/services/import-requests.service.ts").importRequestsService,
    catalog: loadTypeScript("src/services/public-catalog.service.ts").publicCatalogService,
    contexts: loadTypeScript("src/services/listing-context.service.ts").listingContextService,
    transactionContext: loadTypeScript("src/services/transaction-context.service.ts")
      .transactionContext,
    dealerIdentity: loadTypeScript("src/services/import-presentation.service.ts")
      .importDealerIdentity,
  };
}
const code = (value) => (error) => error.code === value;
function offer(env, id = "v1", amount = "200.55") {
  return env.offers.createOffer(env.buyer, id, { amount, currency: "EGP" });
}
async function accepted(env, listingId = "v1") {
  const listing = env.catalog.byId(listingId);
  const seller = env.actors.find((actor) => actor.id === listing.sellerUserId);
  const created = offer(env, listingId);
  env.offers.acceptOffer(seller, created.id);
  const record = await env.transactions.createFromListingOffer(env.buyer, created.id, listingId);
  return { record, created, seller, listing };
}
test("money rule accepts supported whole/two-decimal inputs before conversion, including Arabic digits", () => {
  const env = setup();
  for (const currency of ["EGP", "USD"]) {
    for (const value of ["200", "200.5", "200.50", "200.55"])
      assert.equal(env.money.parseMoney(value, currency), Number(value));
    for (const value of ["200.555", 200.555, "200.550", "200.550000000000000001", 1e-7])
      assert.throws(() => env.money.parseMoney(value, currency), code("precision"));
  }
  assert.equal(env.money.parseMoney("٢٠٠٫٥٥", "EGP"), 200.55);
  assert.equal(env.money.parseMoney("۲۰۰.۵۵", "USD"), 200.55);
  for (const value of ["", " ", "-1", "1,25", "1e2", Infinity, NaN, 0])
    assert.throws(() => env.money.parseMoney(value, "EGP"));
  assert.throws(() => env.money.parseMoney("200.55", "toString"), code("currency"));
});
test("raw decimal conversion cannot silently lose cents on large amounts", () => {
  const env = setup();
  assert.throws(() => env.money.parseMoney("90071992547409.91", "EGP"));
  assert.equal(env.money.parseMoney("000200.50", "EGP"), 200.5);
  assert.equal(env.money.parseMoney(".55", "USD"), 0.55);
});
test("duplicate eligibility errors take precedence over re-entered amount errors", () => {
  const env = setup();
  const created = offer(env);
  assert.throws(() => offer(env, "v1", "200.555"), code("DUPLICATE_ACTIVE_OFFER"));
  env.offers.acceptOffer(env.dealer, created.id);
  assert.throws(() => offer(env, "v1", "200.555"), code("ACCEPTED_OFFER_EXISTS"));
});
test("200.55 EGP survives form parsing, both offer displays, acceptance and both transaction displays", async () => {
  const env = setup();
  const parsed = env.money.parseMoney("200.55", "EGP");
  const created = offer(env, "v1", parsed);
  assert.equal(JSON.parse(env.storage.getItem("sd-marketplace-vehicle-offers"))[0].amount, 200.55);
  for (const value of [
    env.offers.buyerOffers(env.buyer)[0],
    env.offers.receivedOffers(env.dealer)[0],
  ]) {
    assert.equal(value.amount, 200.55);
    assert.match(env.locale.formatCurrency(value.amount, value.currency, "en"), /200\.55/);
    assert.match(env.locale.formatCurrency(value.amount, value.currency, "ar"), /٢٠٠٫٥٥/);
  }
  env.offers.acceptOffer(env.dealer, created.id);
  const record = await env.transactions.createFromListingOffer(env.buyer, created.id, "v1");
  for (const actor of [env.buyer, env.dealer]) {
    const detail = env.transactions.getById(actor, record.id);
    const list = env.transactions.listForParticipant(actor)[0];
    for (const value of [detail, list]) {
      assert.equal(value.agreedAmount, 200.55);
      assert.match(
        env.domain.formatTransactionAmount(value.agreedAmount, value.currency, "en"),
        /200\.55/,
      );
    }
  }
});
test("200.555 is rejected by raw-input and numeric service boundaries without persistence or notifications", async () => {
  const env = setup();
  for (const value of ["200.555", 200.555]) {
    assert.throws(
      () => offer(env, "v1", value),
      (error) =>
        error.code === "VALIDATION_ERROR" &&
        error.fields.amount === "precision" &&
        env.presentation.offerErrorKey(error) === "money.precision",
    );
  }
  assert.equal(env.storage.getItem("sd-marketplace-vehicle-offers"), null);
  assert.equal(env.storage.getItem("sd-website-notifications"), null);
  assert.equal(env.storage.getItem("sd-marketplace-transactions"), null);
  await assert.rejects(
    env.transactions.createFromListingOffer(env.buyer, "missing", "v1"),
    code("SOURCE_NOT_FOUND"),
  );
});
test("invalid legacy accepted offer remains visible exactly and cannot start a transaction", async () => {
  const env = setup();
  const created = offer(env);
  env.offers.acceptOffer(env.dealer, created.id);
  const records = JSON.parse(env.storage.getItem("sd-marketplace-vehicle-offers"));
  records[0].amount = 200.555;
  const raw = JSON.stringify(records);
  env.storage.setItem("sd-marketplace-vehicle-offers", raw);
  const legacy = env.offers.receivedOffers(env.dealer)[0];
  assert.match(env.locale.formatCurrency(legacy.amount, legacy.currency, "en"), /200\.555/);
  assert.match(env.locale.formatCurrency(legacy.amount, legacy.currency, "ar"), /٢٠٠٫٥٥٥/);
  await assert.rejects(
    env.transactions.createFromListingOffer(env.buyer, created.id, "v1"),
    code("INVALID_MONEY_PRECISION"),
  );
  assert.equal(env.storage.getItem("sd-marketplace-vehicle-offers"), raw);
  assert.equal(env.storage.getItem("sd-marketplace-transactions"), null);
});
test("legacy transaction precision remains readable and is never rounded or rewritten", async () => {
  const env = setup();
  const { record } = await accepted(env);
  const data = JSON.parse(env.storage.getItem("sd-marketplace-transactions"));
  data.records[0].agreedAmount = 200.555;
  const raw = JSON.stringify(data);
  env.storage.setItem("sd-marketplace-transactions", raw);
  const legacy = env.transactions.getById(env.buyer, record.id);
  assert.match(
    env.domain.formatTransactionAmount(legacy.agreedAmount, legacy.currency, "en"),
    /200\.555/,
  );
  assert.equal(env.storage.getItem("sd-marketplace-transactions"), raw);
});
test("three timestamped offers default newest first in authorized buyer and dealer received datasets without writes", () => {
  const env = setup();
  const listings = env.catalog
    .list()
    .filter((item) => item.sellerUserId === env.dealer.id)
    .slice(0, 3);
  assert.equal(listings.length, 3);
  const created = listings.map((listing) => offer(env, listing.id));
  const data = JSON.parse(env.storage.getItem("sd-marketplace-vehicle-offers"));
  for (let i = 0; i < 3; i++) data[i].createdAt = `2026-01-0${i + 1}T00:00:00.000Z`;
  const raw = JSON.stringify(data);
  env.storage.setItem("sd-marketplace-vehicle-offers", raw);
  const contexts = new Map(
    listings.map((listing) => [listing.id, env.contexts.resolve(listing.id)]),
  );
  for (const authorized of [
    env.offers.buyerOffers(env.buyer),
    env.offers.receivedOffers(env.dealer),
  ]) {
    assert.deepEqual(
      env.presentation
        .presentOffers(authorized, env.presentation.defaultOfferFilters, contexts)
        .map((item) => item.id),
      created.map((item) => item.id).reverse(),
    );
  }
  assert.deepEqual(
    env.presentation.presentOffers(
      env.offers.receivedOffers(env.other),
      env.presentation.defaultOfferFilters,
      contexts,
    ),
    [],
  );
  assert.equal(env.storage.getItem("sd-marketplace-vehicle-offers"), raw);
});
test("offer search, status/category filters, all four sorts and reset only change presentation", () => {
  const env = setup();
  for (const id of ["v1", "moto1", "boat1"]) offer(env, id);
  const data = env.offers.buyerOffers(env.buyer).map((item, i) => ({
    ...item,
    amount: [200, 100, 300][i],
    createdAt: `2026-01-0${i + 1}T00:00:00.000Z`,
    status: ["PENDING", "ACCEPTED", "REJECTED"][i],
  }));
  const original = structuredClone(data);
  const contexts = new Map(
    data.map((item) => [item.listingId, env.contexts.resolve(item.listingId)]),
  );
  const apply = (filters) =>
    env.presentation.presentOffers(
      data,
      { ...env.presentation.defaultOfferFilters, ...filters },
      contexts,
    );
  for (const status of ["PENDING", "ACCEPTED", "REJECTED"])
    assert.ok(apply({ status }).every((item) => item.status === status));
  assert.equal(apply({ status: "WITHDRAWN" }).length, 0);
  assert.deepEqual(
    apply({ category: "BOAT" }).map((item) => item.listingId),
    ["boat1"],
  );
  assert.deepEqual(
    apply({ search: contexts.get("moto1").title.toUpperCase() }).map((item) => item.listingId),
    ["moto1"],
  );
  assert.deepEqual(
    apply({ sort: "newest" }).map((item) => item.listingId),
    ["boat1", "moto1", "v1"],
  );
  assert.deepEqual(
    apply({ sort: "oldest" }).map((item) => item.listingId),
    ["v1", "moto1", "boat1"],
  );
  assert.deepEqual(
    apply({ sort: "amountHigh" }).map((item) => item.amount),
    [300, 200, 100],
  );
  assert.deepEqual(
    apply({ sort: "amountLow" }).map((item) => item.amount),
    [100, 200, 300],
  );
  assert.equal(apply({ search: "missing" }).length, 0);
  assert.equal(apply(env.presentation.defaultOfferFilters).length, 3);
  assert.deepEqual(data, original);
});
test("pending and accepted eligibility share service rules and precise errors; competing accepted offers block truthfully", () => {
  const env = setup();
  const created = offer(env);
  assert.equal(env.offers.offerEligibility(env.buyer, "v1"), "pending");
  assert.throws(
    () => offer(env),
    (error) => env.presentation.offerErrorKey(error) === "offers.pending",
  );
  env.offers.acceptOffer(env.dealer, created.id);
  assert.equal(env.offers.offerEligibility(env.buyer, "v1"), "accepted");
  assert.throws(
    () => offer(env),
    (error) => env.presentation.offerErrorKey(error) === "offers.accepted",
  );
  assert.equal(env.offers.offerEligibility(env.other, "v1"), "acceptedOther");
  assert.throws(
    () => env.offers.createOffer(env.other, "v1", { amount: 500, currency: "EGP" }),
    (error) => env.presentation.offerErrorKey(error) === "offers.acceptedOther",
  );
  assert.equal(env.offers.buyerOffers(env.buyer).length, 1);
});
for (const status of ["REJECTED", "WITHDRAWN"])
  test(`${status} offer permits another offer when no accepted offer exists`, () => {
    const env = setup();
    const created = offer(env);
    if (status === "REJECTED") env.offers.rejectOffer(env.dealer, created.id);
    else env.offers.withdrawOffer(env.buyer, created.id);
    assert.equal(env.offers.offerEligibility(env.buyer, "v1"), "eligible");
    assert.notEqual(offer(env).id, created.id);
  });
test("accepted financial progress is independent from offer status for both participants", async () => {
  const env = setup();
  const created = offer(env);
  env.offers.acceptOffer(env.dealer, created.id);
  const source = { type: "LISTING_OFFER", listingId: "v1", offerId: created.id };
  assert.equal(
    env.domain.transactionProgressKey(undefined, true, source),
    "transactions.notStarted",
  );
  assert.equal(
    env.domain.transactionProgressKey(undefined, false, source),
    "transactions.waitingBuyer",
  );
  const record = await env.transactions.createFromListingOffer(env.buyer, created.id, "v1");
  for (const actor of [env.buyer, env.dealer])
    assert.equal(
      env.domain.transactionProgressKey(
        env.transactions.getById(actor, record.id),
        actor.id === env.buyer.id,
        source,
      ),
      "transactions.status.AWAITING_PAYMENT",
    );
  assert.equal(env.offers.buyerOffers(env.buyer)[0].status, "ACCEPTED");
});
for (const id of ["v1", "moto1", "boat1"])
  test(`${id} transaction resolves its own image/title/category/link, with no asking-price mutation`, async () => {
    const env = setup();
    const { record, listing } = await accepted(env, id);
    const context = env.transactionContext(record, env.buyer);
    assert.equal(context.type, "LISTING_OFFER");
    assert.equal(context.listing.thumbnail, listing.images[0]?.url);
    assert.equal(context.listing.title, listing.title);
    assert.equal(context.listing.category, listing.category);
    assert.equal(context.listing.href, `/vehicles/${id}`);
    assert.equal(env.transactions.getById(env.buyer, record.id).agreedAmount, 200.55);
    env.catalog.byId = () => ({ ...listing, images: [] });
    assert.equal(env.transactionContext(record, env.buyer).listing.thumbnail, undefined);
    env.catalog.byId = () => undefined;
    assert.equal(env.transactionContext(record, env.buyer).listing.available, false);
    assert.equal(env.transactions.getById(env.buyer, record.id).snapshot.title, listing.title);
  });
test("Import Offer, dealer account and transaction resolve the same canonical dealer name, never unrelated agency name", async () => {
  const env = setup();
  const request = env.imports.createRequest(env.buyer, {
    make: "BMW",
    model: "530i",
    year: 2025,
    budget: 500000,
    currency: "EGP",
  });
  assert.throws(
    () =>
      env.imports.submitOffer(env.dealer, request.id, {
        price: 200.555,
        currency: "EGP",
        estimatedDelivery: "8 weeks",
      }),
    (error) => error.fields.price === "precision",
  );
  const created = env.imports.submitOffer(env.dealer, request.id, {
    price: 200.55,
    currency: "EGP",
    estimatedDelivery: "8 weeks",
  });
  env.imports.acceptOffer(env.buyer, request.id, created.id);
  const record = await env.transactions.createFromImportOffer(env.buyer, created.id, request.id);
  const card = env.dealerIdentity(created.dealerUserId);
  assert.equal(card.displayName, env.dealer.displayName);
  assert.equal(
    card.displayName,
    env.auth.developmentPublicProfile(record.sellerParticipantId).displayName,
  );
  assert.notEqual(card.displayName, env.dealerIdentity("dealer-qa-b").displayName);
  assert.equal(card.id, record.sellerParticipantId);
  assert.equal(card.dealerId, env.dealer.dealerId);
  for (const actor of [env.buyer, env.dealer]) {
    const context = env.transactionContext(record, actor);
    assert.equal(context.type, "IMPORT_OFFER");
    assert.match(context.title, /BMW 530i/);
    assert.equal(context.dealer.displayName, env.dealer.displayName);
    assert.ok(context.href);
    assert.equal("listing" in context, false);
    assert.equal("thumbnail" in context, false);
  }
  assert.equal(
    env.domain.transactionProgressKey(undefined, false, record.source),
    "transactions.waitingCustomer",
  );
});
test("preview copy reflects each existing lifecycle status without changing the record", () => {
  setup();
  const { listingVisibilityKey } = loadTypeScript("src/lib/listing.ts");
  for (const [status, key] of [
    ["draft", "private"],
    ["pending", "private"],
    ["published", "published"],
    ["sold", "nonPublic"],
    ["archived", "nonPublic"],
  ]) {
    const listing = Object.freeze({ status });
    assert.equal(listingVisibilityKey(listing.status), `listing.preview.${key}`);
    assert.equal(listing.status, status);
  }
});
test("QA UI wiring uses labelled responsive controls, service eligibility, precision errors and shared context", () => {
  const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const offers = read("src/components/communication/VehicleOffers.tsx");
  assert.match(offers, /presentOffers\(offers, filters, contexts\)/);
  assert.match(offers, /offers.noMatches/);
  assert.match(offers, /setFilters\(defaultOfferFilters\)/);
  assert.match(offers, /sm:grid-cols-2/);
  assert.match(offers, /<label/);
  const form = read("src/app/(site)/vehicles/[id]/vehicle-detail-client.tsx");
  assert.match(form, /offerEligibility.data/);
  assert.match(form, /offers.viewMine/);
  assert.match(form, /parseMoney\(amount, currency\)/);
  assert.match(form, /inputMode="decimal"/);
  assert.match(form, /aria-describedby=\{error \? "vehicle-offer-error"/);
  assert.match(form, /await onCreate[\s\S]*toast.success/);
  const details = read("src/components/transactions/Transactions.tsx");
  assert.match(details, /<ListingContext/);
  assert.match(details, /showPrice=\{false\}/);
  assert.match(details, /formatTransactionAmount/);
  const importCard = read("src/components/import-workflow/ImportRequestDetail.tsx");
  assert.match(importCard, /importDealerIdentity\(offer.dealerUserId\)/);
  assert.match(importCard, /\{identity.displayName\}/);
  for (const file of ["ListingPreview", "ListingWizard"])
    assert.match(read(`src/components/listings/${file}.tsx`), /listingVisibilityKey\(/);
  const { sprint12QaEn, sprint12QaAr } = loadTypeScript("src/lib/sprint12-qa-copy.ts");
  assert.deepEqual(Object.keys(sprint12QaEn), Object.keys(sprint12QaAr));
  for (const key of Object.keys(sprint12QaEn)) assert.ok(sprint12QaEn[key] && sprint12QaAr[key]);
});
