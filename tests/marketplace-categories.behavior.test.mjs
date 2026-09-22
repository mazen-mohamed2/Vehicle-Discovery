import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { clearTypeScriptModules, loadTypeScript } from "./ts-module-loader.mjs";

class MemoryStorage {
  values = new Map();
  getItem(key) {
    return this.values.get(key) ?? null;
  }
  setItem(key, value) {
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
    ...loadTypeScript("src/services/listings.service.ts"),
    ...loadTypeScript("src/services/compare.service.ts"),
    ...loadTypeScript("src/lib/vehicle-discovery.ts"),
  };
}

const owner = { scope: "user:sprint11", id: "sprint11", role: "user", displayName: "Seller" };
const shared = {
  year: 2024,
  price: 250000,
  location: "Cairo",
  description: "A well maintained listing with all required information available.",
  images: [
    {
      id: "selected-image",
      url: "blob:selected-image",
      previewUrl: "blob:selected-image",
      name: "selected.jpg",
      type: "image/jpeg",
      size: 1024,
      order: 0,
      isCover: true,
      createdAt: "2026-09-19T10:00:00.000Z",
      temporary: true,
    },
  ],
  declarations: {
    informationAccuracyAccepted: true,
    ownershipOrAuthorizationAccepted: true,
    termsAccepted: true,
    externalTransactionRiskAcknowledged: true,
  },
};

test("category registry declares the three supported categories and CAR-only import capability", () => {
  setup();
  const { listingCategories, listingCategoryRegistry } = loadTypeScript(
    "src/lib/marketplace-listing.ts",
  );
  assert.deepEqual([...listingCategories], ["CAR", "MOTORCYCLE", "BOAT"]);
  for (const category of listingCategories) {
    const entry = listingCategoryRegistry[category];
    assert.ok(
      entry.labelKey &&
        entry.searchFields.length &&
        entry.summaryFields.length &&
        entry.filterFields.length,
    );
    assert.deepEqual(
      [
        entry.capabilities.creation,
        entry.capabilities.offers,
        entry.capabilities.messaging,
        entry.capabilities.compare,
        entry.capabilities.verification,
      ],
      [true, true, true, true, true],
    );
    assert.equal(entry.capabilities.customImport, category === "CAR");
  }
});

test("motorcycle and boat drafts publish with category-specific specs and stable IDs", () => {
  const { managedListingsService: service } = setup();
  const motorcycle = service.createDraft(owner, "MOTORCYCLE");
  assert.equal(motorcycle.category, "MOTORCYCLE");
  service.updateDraft(owner, motorcycle.id, {
    ...shared,
    specs: {
      make: "Yamaha",
      model: "MT-07",
      motorcycleType: "naked",
      mileage: 800,
      engineCapacityCc: 689,
      transmission: "manual",
    },
  });
  const publishedMotorcycle = service.publishListing(owner, motorcycle.id);
  assert.equal(publishedMotorcycle.id, motorcycle.id);
  assert.equal(publishedMotorcycle.status, "published");
  const boat = service.createDraft(owner, "BOAT");
  service.updateDraft(owner, boat.id, {
    ...shared,
    specs: {
      make: "Bayliner",
      model: "VR5",
      boatType: "motorboat",
      lengthMeters: 6.2,
      propulsion: "inboard",
      engineCount: 1,
      engineHours: 100,
      hullMaterial: "Fiberglass",
    },
  });
  const publishedBoat = service.publishListing(owner, boat.id);
  assert.equal(publishedBoat.status, "published");
  const publicListings = service.publicListings();
  assert.deepEqual(
    publicListings.map((item) => item.category),
    ["MOTORCYCLE", "BOAT"],
  );
  assert.deepEqual(
    publicListings.map((item) => item.images),
    [
      [{ id: "selected-image", url: "blob:selected-image", alt: "selected.jpg" }],
      [{ id: "selected-image", url: "blob:selected-image", alt: "selected.jpg" }],
    ],
  );
  assert.equal(publicListings[1].specs.lengthMeters, 6.2);
  assert.equal("mileage" in publicListings[1].specs, false);
});

test("category-specific required fields still block publishing", () => {
  const { managedListingsService: service } = setup();
  const draft = service.createDraft(owner, "BOAT");
  service.updateDraft(owner, draft.id, {
    ...shared,
    specs: {
      make: "Bayliner",
      model: "VR5",
      boatType: "",
      propulsion: "",
      hullMaterial: "",
    },
  });
  assert.throws(
    () => service.publishListing(owner, draft.id),
    (error) =>
      error.code === "PUBLISH_REQUIREMENTS_NOT_MET" &&
      error.fields.boatType === "required" &&
      error.fields.lengthMeters === "required" &&
      error.fields.propulsion === "required",
  );
});

test("persisted category is immutable while same-category specifications remain editable", () => {
  const { managedListingsService: service } = setup();
  for (const category of ["CAR", "MOTORCYCLE", "BOAT"]) {
    const draft = service.createDraft(owner, category);
    assert.throws(
      () => service.updateDraft(owner, draft.id, { category: category === "CAR" ? "BOAT" : "CAR" }),
      (error) => error.code === "VALIDATION_ERROR" && error.fields.category === "immutable",
    );
    const nextSpecs = { ...draft.specs, make: "Edited Make", model: "Edited Model" };
    service.updateDraft(owner, draft.id, { specs: nextSpecs });
    clearTypeScriptModules();
    const reloaded = loadTypeScript(
      "src/services/managed-listings.service.ts",
    ).managedListingsService;
    const persisted = reloaded.getListingById(owner, draft.id);
    assert.equal(persisted.category, category);
    assert.equal(persisted.specs.make, "Edited Make");
    assert.equal(persisted.specs.model, "Edited Model");
  }
});

test("CAR validation reads canonical specs when editing, including VIN and engine limits", () => {
  const { managedListingsService: service } = setup();
  const { validateListing } = loadTypeScript("src/lib/listing-validators.ts");
  const draft = service.createDraft(owner, "CAR");
  const edited = service.updateDraft(owner, draft.id, {
    specs: { ...draft.specs, vin: "BAD", engineSize: 0 },
  });
  assert.equal(validateListing(edited).vin, "invalid");
  assert.equal(validateListing(edited).engineSize, "range");
  const persisted = service.getListingById(owner, draft.id);
  assert.equal(persisted.specs.vin, "BAD");
});

test("legacy flat car records migrate once without changing IDs or linked public references", async () => {
  const { localStorage, managedListingsService: service } = setup();
  const first = service.createDraft(owner);
  service.updateDraft(owner, first.id, {
    ...shared,
    make: "Toyota",
    model: "Corolla",
    mileage: 12345,
    transmission: "automatic",
    fuelType: "gasoline",
    vin: "1HGCM82633A004352",
    images: [
      {
        id: "legacy-photo",
        url: "/assets/car-1.jpg",
        name: "Car",
        type: "image/jpeg",
        size: 10,
        order: 0,
        isCover: true,
        createdAt: first.createdAt,
      },
    ],
  });
  service.publishListing(owner, first.id);
  const buyerUser = loadTypeScript("src/services/auth.service.ts").developmentAuthFixtures.find(
    (item) => item.user.email === "customer@sahladaraj.dev",
  ).user;
  const buyer = {
    id: buyerUser.id,
    role: buyerUser.role,
    scope: `${buyerUser.role}:${buyerUser.id}`,
  };
  const communication = loadTypeScript(
    "src/services/marketplace-communication.service.ts",
  ).marketplaceCommunicationService;
  const notifications = loadTypeScript(
    "src/services/notifications.service.ts",
  ).notificationsService;
  const trust = loadTypeScript("src/services/trust-safety.service.ts").trustSafetyService;
  const conversation = communication.startConversation(buyer, first.id);
  const offer = communication.createOffer(buyer, first.id, { amount: 200000, currency: "EGP" });
  const verification = trust.submitVerification(owner, "VEHICLE", first.id);
  const report = trust.submitReport(buyer, {
    targetType: "LISTING",
    targetId: first.id,
    reason: "MISLEADING_INFORMATION",
  });
  const key = `sd-owned-listings:${owner.scope}`;
  const envelope = JSON.parse(localStorage.getItem(key));
  const legacy = { ...envelope.records[0] };
  delete legacy.category;
  delete legacy.specs;
  localStorage.setItem(key, JSON.stringify([legacy]));
  localStorage.setItem("sd-published-listings", JSON.stringify([legacy]));
  const { favoritesService } = loadTypeScript("src/services/favorites.service.ts");
  const { compareService } = loadTypeScript("src/services/compare.service.ts");
  await favoritesService.add(owner.scope, first.id);
  await compareService.replace(owner.scope, [first.id]);
  const migrated = service.getOwnedListings(owner)[0];
  assert.equal(migrated.id, first.id);
  assert.equal(migrated.category, "CAR");
  assert.equal(migrated.specs.make, "Toyota");
  assert.equal(migrated.specs.mileage, 12345);
  assert.equal(migrated.status, "published");
  assert.equal(migrated.price, 250000);
  assert.equal(migrated.description, shared.description);
  assert.equal(migrated.images[0].id, "legacy-photo");
  assert.equal(migrated.createdAt, first.createdAt);
  assert.equal(service.publicListings()[0].id, first.id);
  assert.equal((await favoritesService.list(owner.scope))[0].listingId, first.id);
  assert.deepEqual(await compareService.list(owner.scope), [first.id]);
  assert.equal(communication.conversation(buyer, conversation.id).listingId, first.id);
  assert.equal(
    communication.buyerOffers(buyer).find((item) => item.id === offer.id)?.listingId,
    first.id,
  );
  assert.ok(notifications.list(owner).some((item) => item.relatedId === offer.id));
  assert.equal(trust.verificationForOwner(owner, "VEHICLE", first.id)?.id, verification.id);
  assert.equal(trust.reports(buyer).find((item) => item.id === report.id)?.targetId, first.id);
  const stored = JSON.parse(localStorage.getItem(key));
  assert.equal(stored.schemaVersion, 2);
  assert.equal(stored.records[0].id, first.id);
  assert.deepEqual(service.getOwnedListings(owner), [JSON.parse(JSON.stringify(migrated))]);
  assert.deepEqual(JSON.parse(localStorage.getItem(key)), stored);
});

test("discovery filters by category and category-specific fields with stable URL parsing", async () => {
  const { listingsService, parseDiscoveryParams } = setup();
  const moto = parseDiscoveryParams(
    new URLSearchParams("category=MOTORCYCLE&motorcycleType=naked&fuel=diesel&page=3"),
  );
  assert.equal(moto.category, "MOTORCYCLE");
  assert.equal(moto.motorcycleType, "naked");
  assert.equal(moto.fuel, undefined);
  const results = await listingsService.discover(moto);
  assert.ok(
    results.items.every(
      (item) => item.category === "MOTORCYCLE" && item.specs.motorcycleType === "naked",
    ),
  );
  const boats = await listingsService.discover(
    parseDiscoveryParams(new URLSearchParams("category=BOAT&boatType=motorboat&sort=mileage-asc")),
  );
  assert.equal(boats.items.length, 1);
  assert.equal(boats.items[0].category, "BOAT");
  assert.equal(boats.facets.mileageRange[0], 0);
  assert.equal(
    parseDiscoveryParams(new URLSearchParams("category=BOAT&sort=mileage-asc")).sort,
    "newest",
  );
  const boatWithStaleCarFilters = parseDiscoveryParams(
    new URLSearchParams(
      "category=BOAT&fuel=diesel&transmission=automatic&mileageMax=100&q=Bayliner",
    ),
  );
  assert.equal(boatWithStaleCarFilters.fuel, undefined);
  assert.equal(boatWithStaleCarFilters.transmission, undefined);
  assert.equal(boatWithStaleCarFilters.mileageMax, undefined);
  assert.equal((await listingsService.discover(boatWithStaleCarFilters)).items[0].id, "boat1");
  const motorcycleSearch = await listingsService.discover(
    parseDiscoveryParams(new URLSearchParams("q=Yamaha&category=MOTORCYCLE")),
  );
  assert.equal(motorcycleSearch.items[0].id, "moto1");
  const sortedCars = await listingsService.discover(
    parseDiscoveryParams(new URLSearchParams("category=CAR&sort=price-desc&pageSize=4&page=2")),
  );
  assert.equal(sortedCars.page, 2);
  assert.ok(sortedCars.items.every((item) => item.category === "CAR"));
  assert.ok(
    sortedCars.items.every(
      (item, index) => index === 0 || sortedCars.items[index - 1].price >= item.price,
    ),
  );
});

test("compare additions survive post-write reconciliation for every category", async () => {
  const {
    localStorage,
    managedListingsService: service,
    compareService,
    canCompareListing,
    normalizeCompareIds,
    reconcileCompareIds,
    sameCategoryCompareIds,
  } = setup();
  const secondMotorcycle = service.createDraft(owner, "MOTORCYCLE");
  service.updateDraft(owner, secondMotorcycle.id, {
    ...shared,
    specs: {
      make: "Honda",
      model: "CB500",
      motorcycleType: "naked",
      mileage: 500,
      engineCapacityCc: 500,
      transmission: "manual",
    },
  });
  service.publishListing(owner, secondMotorcycle.id);
  const secondBoat = service.createDraft(owner, "BOAT");
  service.updateDraft(owner, secondBoat.id, {
    ...shared,
    specs: {
      make: "Sea Ray",
      model: "SPX",
      boatType: "speedboat",
      lengthMeters: 6,
      propulsion: "inboard",
      hullMaterial: "Fiberglass",
    },
  });
  service.publishListing(owner, secondBoat.id);

  const addAndReconcile = async (scope, selected, listingId) => {
    if (!canCompareListing(selected, listingId)) return { added: false, ids: selected };
    const optimistic = normalizeCompareIds([...selected, listingId]);
    await compareService.replace(scope, optimistic);
    return { added: true, ids: await compareService.list(scope) };
  };
  for (const [scope, ids] of [
    ["guest", ["v1", "v2"]],
    ["user:motorcycles", ["moto1", secondMotorcycle.id]],
    ["user:boats", ["boat1", secondBoat.id]],
  ]) {
    let selected = [];
    for (const id of ids) {
      const result = await addAndReconcile(scope, selected, id);
      assert.equal(result.added, true);
      selected = result.ids;
      assert.deepEqual(selected, ids.slice(0, selected.length));
    }
    assert.deepEqual(await compareService.list(scope), ids);
  }

  for (const [scope, selected, rejected] of [
    ["guest", ["v1", "v2"], "boat1"],
    ["guest", ["v1", "v2"], "moto1"],
    ["user:motorcycles", ["moto1", secondMotorcycle.id], "boat1"],
    ["user:boats", ["boat1", secondBoat.id], "v1"],
  ]) {
    const before = await compareService.list(scope);
    assert.deepEqual(before, selected);
    const result = await addAndReconcile(scope, before, rejected);
    assert.equal(result.added, false);
    assert.deepEqual(result.ids, selected);
    assert.deepEqual(await compareService.list(scope), selected);
  }

  localStorage.setItem("sd-compare:user:temporarily-unresolved", JSON.stringify(["pending-id"]));
  assert.deepEqual(await compareService.list("user:temporarily-unresolved"), ["pending-id"]);
  assert.deepEqual(JSON.parse(localStorage.getItem("sd-compare:user:temporarily-unresolved")), [
    "pending-id",
  ]);
  assert.deepEqual(await compareService.replace("user:mixed-corruption", ["v1", "boat1", "v2"]), [
    "v1",
    "v2",
  ]);

  const catalog = loadTypeScript("src/services/public-catalog.service.ts").publicCatalogService;
  assert.deepEqual(reconcileCompareIds(["v1", "boat1", "v2", "missing"], catalog.list()), [
    "v1",
    "v2",
  ]);
  assert.deepEqual(sameCategoryCompareIds(["boat1", "v1", "moto1"]), ["boat1"]);
});

test("compare persistence retains max, remove, clear, scope, reload, and share behavior", async () => {
  const { localStorage, compareService } = setup();
  const scope = "user:compare-regression";
  assert.deepEqual(await compareService.replace(scope, ["v1", "v2", "v3", "v4", "v5"]), [
    "v1",
    "v2",
    "v3",
    "v4",
  ]);
  await compareService.replace(scope, ["v1", "v3", "v4"]);
  assert.deepEqual(await compareService.list(scope), ["v1", "v3", "v4"]);
  assert.deepEqual(await compareService.list("user:another-account"), []);

  clearTypeScriptModules();
  const reloaded = loadTypeScript("src/services/compare.service.ts").compareService;
  assert.deepEqual(await reloaded.list(scope), ["v1", "v3", "v4"]);
  const { createCompareQuery, parseCompareUrlIds } = loadTypeScript("src/lib/compare-url.ts");
  const query = createCompareQuery(await reloaded.list(scope));
  assert.equal(query, "?vehicles=v1%2Cv3%2Cv4");
  assert.deepEqual(
    parseCompareUrlIds(new URLSearchParams(query).get("vehicles"), new Set(["v1", "v3", "v4"])),
    ["v1", "v3", "v4"],
  );
  await reloaded.replace(scope, []);
  assert.deepEqual(await reloaded.list(scope), []);
  assert.equal(localStorage.getItem(`sd-compare:${scope}`), null);
});

test("runtime category boundary rejects swapped specs and malformed persisted records", () => {
  const { localStorage, managedListingsService: service } = setup();
  const { isMarketplaceListing } = loadTypeScript("src/lib/marketplace-listing.ts");
  const { mockListings } = loadTypeScript("src/services/mock-data.ts");
  assert.ok(mockListings.every(isMarketplaceListing));
  const car = mockListings.find((item) => item.category === "CAR");
  const motorcycle = mockListings.find((item) => item.category === "MOTORCYCLE");
  const boat = mockListings.find((item) => item.category === "BOAT");
  assert.ok(car && motorcycle && boat);
  assert.equal(isMarketplaceListing({ ...boat, specs: car.specs }), false);
  assert.equal(isMarketplaceListing({ ...car, specs: boat.specs }), false);
  assert.equal(isMarketplaceListing({ ...motorcycle, specs: boat.specs }), false);
  assert.equal(isMarketplaceListing({ ...car, specs: motorcycle.specs }), false);
  assert.equal(isMarketplaceListing({ ...car, category: "AIRCRAFT" }), false);
  assert.throws(
    () => service.createDraft(owner, "AIRCRAFT"),
    (error) => error.code === "VALIDATION_ERROR",
  );
  const draft = service.createDraft(owner);
  const key = `sd-owned-listings:${owner.scope}`;
  const envelope = JSON.parse(localStorage.getItem(key));
  envelope.records[0].category = "BOAT";
  localStorage.setItem(key, JSON.stringify(envelope));
  assert.throws(
    () => service.getOwnedListings(owner),
    (error) => error.code === "STORAGE_READ_FAILED",
  );
  assert.equal(draft.id, envelope.records[0].id);
});

test("favorites retain canonical IDs across categories and account scopes", async () => {
  setup();
  const { favoritesService } = loadTypeScript("src/services/favorites.service.ts");
  await favoritesService.add("guest", "moto1");
  await favoritesService.add("guest", "boat1");
  await favoritesService.add("user:sprint11", "v1");
  assert.deepEqual(
    (await favoritesService.list("guest")).map((item) => item.listingId),
    ["moto1", "boat1"],
  );
  assert.deepEqual(
    (await favoritesService.list("user:sprint11")).map((item) => item.listingId),
    ["v1"],
  );
});

test("dealer inventory and related listings preserve category identity", async () => {
  const { listingsService } = setup();
  const { filterDealerInventory } = loadTypeScript("src/lib/dealer-inventory.ts");
  const inventory = await listingsService.byAgency("ag1");
  const boats = filterDealerInventory(inventory, {
    search: "",
    category: "BOAT",
    make: "",
    bodyType: "",
    fuel: "",
    transmission: "",
    sort: "newest",
  });
  assert.deepEqual(
    boats.map((item) => item.id),
    ["boat1"],
  );
  const boatFilters = {
    search: "",
    category: "BOAT",
    make: "",
    bodyType: "",
    fuel: "",
    transmission: "",
    sort: "newest",
  };
  assert.deepEqual(
    filterDealerInventory(inventory, {
      ...boatFilters,
      boatType: "motorboat",
      propulsion: "inboard",
    }).map((item) => item.id),
    ["boat1"],
  );
  assert.deepEqual(
    filterDealerInventory(inventory, {
      ...boatFilters,
      boatType: "sailboat",
      propulsion: "",
    }),
    [],
  );
  const relatedCars = await listingsService.related("v1", 4);
  assert.ok(relatedCars.every((item) => item.category === "CAR"));
  assert.deepEqual(await listingsService.related("boat1", 4), []);
});

test("legacy CAR engine labels and body-type ranking survive the category refactor", async () => {
  const { listingsService } = setup();
  const { carEngineDisplay } = loadTypeScript("src/lib/marketplace-listing.ts");
  const cars = (await listingsService.list()).filter((item) => item.category === "CAR");
  const electric = {
    ...cars[0],
    specs: { ...cars[0].specs, fuelType: "electric", engineDisplay: "Electric motor" },
  };
  assert.equal(carEngineDisplay(electric), "Electric motor");
  assert.equal(carEngineDisplay(cars[0]), "2.0 L");
  const source = cars.find((item) => item.id === "v1");
  const related = await listingsService.related("v1", 4);
  assert.ok(related.every((item) => item.category === "CAR"));
  assert.ok(source && related.length);
  assert.ok(related.some((item) => item.specs.bodyType === source.specs.bodyType));
});

test("category summaries expose appropriate facts without cross-category fields", () => {
  setup();
  const { mockListings } = loadTypeScript("src/services/mock-data.ts");
  const { listingSummary } = loadTypeScript("src/lib/marketplace-listing.ts");
  const t = (key) => key;
  const car = listingSummary(
    mockListings.find((item) => item.category === "CAR"),
    t,
    "en",
  );
  const motorcycle = listingSummary(
    mockListings.find((item) => item.category === "MOTORCYCLE"),
    t,
    "en",
  );
  const boat = listingSummary(
    mockListings.find((item) => item.category === "BOAT"),
    t,
    "en",
  );
  assert.equal(car.length, 3);
  assert.ok(car[0].includes("card.km") && car[2].startsWith("fuel."));
  assert.equal(motorcycle.length, 3);
  assert.ok(motorcycle[1].includes("category.cc") && motorcycle[2].startsWith("motorcycleType."));
  assert.equal(boat.length, 3);
  assert.ok(
    boat[0].includes("category.meters") &&
      (boat[2].startsWith("propulsion.") || boat[2].includes("category.horsepower")),
  );
  assert.ok(boat.every((fact) => !fact.includes("card.km")));
});

test("offers, conversations, and notifications use canonical listing IDs for every category", () => {
  setup();
  const fixtures = loadTypeScript("src/services/auth.service.ts").developmentAuthFixtures;
  const actor = (email) => {
    const user = fixtures.find((item) => item.user.email === email).user;
    return {
      id: user.id,
      role: user.role,
      scope: `${user.role}:${user.id}`,
      dealerId: user.dealerId,
    };
  };
  const buyer = actor("customer@sahladaraj.dev");
  const motorcycleSeller = actor("customer2@sahladaraj.dev");
  const dealerSeller = actor("dealer@sahladaraj.dev");
  const service = loadTypeScript(
    "src/services/marketplace-communication.service.ts",
  ).marketplaceCommunicationService;
  const notifications = loadTypeScript(
    "src/services/notifications.service.ts",
  ).notificationsService;
  for (const [listingId, seller] of [
    ["v1", dealerSeller],
    ["moto1", motorcycleSeller],
    ["boat1", dealerSeller],
  ]) {
    const conversation = service.startConversation(buyer, listingId);
    assert.equal(conversation.listingId, listingId);
    assert.equal(service.startConversation(buyer, listingId).id, conversation.id);
    const message = service.sendMessage(buyer, conversation.id, `Question about ${listingId}`);
    assert.equal(service.messages(seller, conversation.id)[0].id, message.id);
    const offer = service.createOffer(buyer, listingId, { amount: 100000, currency: "EGP" });
    assert.equal(offer.status, "PENDING");
    assert.equal(offer.listingId, listingId);
    assert.ok(notifications.list(seller).some((item) => item.relatedId === offer.id));
  }
});

test("category listings retain listing verification and report authorization", () => {
  setup();
  const fixtures = loadTypeScript("src/services/auth.service.ts").developmentAuthFixtures;
  const actor = (email) => {
    const user = fixtures.find((item) => item.user.email === email).user;
    return {
      id: user.id,
      role: user.role,
      scope: `${user.role}:${user.id}`,
      dealerId: user.dealerId,
    };
  };
  const buyer = actor("customer@sahladaraj.dev");
  const motorcycleSeller = actor("customer2@sahladaraj.dev");
  const dealerSeller = actor("dealer@sahladaraj.dev");
  const trust = loadTypeScript("src/services/trust-safety.service.ts").trustSafetyService;
  const catalog = loadTypeScript("src/services/public-catalog.service.ts").publicCatalogService;
  for (const [id, seller] of [
    ["moto1", motorcycleSeller],
    ["boat1", dealerSeller],
  ]) {
    const request = trust.submitVerification(seller, "VEHICLE", id);
    assert.equal(request.status, "PENDING_REVIEW");
    assert.equal(trust.publicStatus("VEHICLE", id), "NOT_SUBMITTED");
    assert.ok(catalog.byId(id));
    assert.throws(
      () => trust.submitVerification(buyer, "VEHICLE", id),
      (error) => error.code === "FORBIDDEN",
    );
    const report = trust.submitReport(buyer, {
      targetType: "LISTING",
      targetId: id,
      reason: "MISLEADING_INFORMATION",
    });
    assert.equal(report.targetId, id);
    assert.throws(
      () => trust.submitReport(buyer, { targetType: "LISTING", targetId: id, reason: "SPAM" }),
      (error) => error.code === "DUPLICATE_ACTIVE_REPORT",
    );
  }
});

test("wizard step validation requires and validates CAR VIN before History can advance", () => {
  const { managedListingsService: service } = setup();
  const { firstInvalidListingStep, validateListing, validateListingStep } = loadTypeScript(
    "src/lib/listing-validators.ts",
  );
  const draft = service.createDraft(owner, "CAR");
  assert.deepEqual(validateListingStep(draft, "basics"), {
    make: "required",
    model: "required",
    year: "required",
  });
  const basics = service.updateDraft(owner, draft.id, {
    year: 2024,
    specs: { ...draft.specs, make: "Toyota", model: "Corolla" },
  });
  assert.deepEqual(validateListingStep(basics, "basics"), {});
  assert.equal(validateListingStep(basics, "specifications").mileage, "required");
  const mileage = service.updateDraft(owner, draft.id, {
    specs: {
      ...basics.specs,
      mileage: 12345,
      transmission: "automatic",
      fuelType: "gasoline",
    },
  });
  assert.deepEqual(validateListingStep(mileage, "specifications"), {});
  assert.equal(validateListingStep(mileage, "history").vin, "required");
  const explicitEmptyVin = service.updateDraft(owner, draft.id, {
    specs: { ...mileage.specs, vin: "" },
  });
  assert.equal(validateListingStep(explicitEmptyVin, "history").vin, "required");
  assert.equal(
    firstInvalidListingStep(explicitEmptyVin, ["history", "commercial"]).step,
    "history",
  );
  const badVin = service.updateDraft(owner, draft.id, {
    specs: { ...mileage.specs, vin: "INVALID" },
  });
  assert.equal(validateListingStep(badVin, "history").vin, "invalid");
  const forbiddenCharacters = service.updateDraft(owner, draft.id, {
    specs: { ...mileage.specs, vin: "1HGCM82633A00IOQ2" },
  });
  assert.equal(validateListingStep(forbiddenCharacters, "history").vin, "invalid");
  const goodVin = service.updateDraft(owner, draft.id, {
    specs: { ...badVin.specs, vin: "1HGCM82633A004352" },
  });
  assert.deepEqual(validateListingStep(goodVin, "history"), {});
  assert.equal(validateListingStep(goodVin, "declarations").description, "minimum");
  assert.equal(validateListing(goodVin, true).description, "minimum");
  const corrected = service.updateDraft(owner, draft.id, {
    price: shared.price,
    location: shared.location,
    description: shared.description,
    images: shared.images,
    declarations: shared.declarations,
  });
  assert.deepEqual(validateListingStep(corrected, "commercial"), {});
  assert.deepEqual(validateListingStep(corrected, "declarations"), {});
  assert.equal(service.publishListing(owner, draft.id).status, "published");
});

test("wizard step validation is category-specific for motorcycle and recreational boat", () => {
  const { managedListingsService: service } = setup();
  const { validateListingStep } = loadTypeScript("src/lib/listing-validators.ts");
  const motorcycle = service.createDraft(owner, "MOTORCYCLE");
  const motorcycleBasics = service.updateDraft(owner, motorcycle.id, {
    year: 2024,
    specs: {
      make: "Yamaha",
      model: "MT-07",
      motorcycleType: "naked",
      transmission: "manual",
    },
  });
  assert.deepEqual(validateListingStep(motorcycleBasics, "basics"), {});
  assert.deepEqual(validateListingStep(motorcycleBasics, "specifications"), {
    mileage: "required",
    engineCapacityCc: "required",
  });
  const motorcycleValid = service.updateDraft(owner, motorcycle.id, {
    specs: { ...motorcycleBasics.specs, mileage: 800, engineCapacityCc: 689 },
  });
  assert.deepEqual(validateListingStep(motorcycleValid, "specifications"), {});

  const boat = service.createDraft(owner, "BOAT");
  const boatBasics = service.updateDraft(owner, boat.id, {
    year: 2023,
    specs: {
      make: "Bayliner",
      model: "VR5",
      boatType: "motorboat",
      propulsion: "",
      fuelType: "gasoline",
      hullMaterial: "Fiberglass",
    },
  });
  assert.deepEqual(validateListingStep(boatBasics, "basics"), {});
  assert.deepEqual(validateListingStep(boatBasics, "specifications"), {
    lengthMeters: "required",
    propulsion: "required",
  });
  const boatValid = service.updateDraft(owner, boat.id, {
    specs: {
      ...boatBasics.specs,
      lengthMeters: 6.23,
      propulsion: "inboard",
      enginePowerHp: 250,
      passengerCapacity: 8,
    },
  });
  assert.deepEqual(validateListingStep(boatValid, "specifications"), {});
  assert.equal("mileage" in boatValid.specs, false);
  for (const listing of [motorcycleValid, boatValid]) {
    assert.equal(validateListingStep({ ...listing, images: [] }, "photos").images, "photoRequired");
    assert.deepEqual(validateListingStep({ ...listing, images: shared.images }, "photos"), {});
  }
});

test("photo operations keep exactly one visible cover and promote a replacement on removal", () => {
  setup();
  const { appendListingImages, removeListingImage, setListingCover } =
    loadTypeScript("src/lib/listing.ts");
  const first = { ...shared.images[0], id: "first", isCover: true };
  const second = { ...shared.images[0], id: "second", isCover: true };
  const appended = appendListingImages([first], [second], 12);
  assert.equal(appended.filter((image) => image.isCover).length, 1);
  assert.equal(appended.find((image) => image.isCover).id, "first");
  const changed = setListingCover(appended, "second");
  assert.equal(changed.find((image) => image.isCover).id, "second");
  assert.deepEqual(
    changed.map((image) => image.order),
    [0, 1],
  );
  const removed = removeListingImage(changed, "second");
  assert.equal(removed.length, 1);
  assert.equal(removed[0].id, "first");
  assert.equal(removed[0].isCover, true);
});

test("representative category fixtures and shared listing context resolve usable presentation", async () => {
  setup();
  const { mockListings } = loadTypeScript("src/services/mock-data.ts");
  const { listingContextService } = loadTypeScript("src/services/listing-context.service.ts");
  for (const id of ["v1", "moto1", "boat1"]) {
    const fixture = mockListings.find((listing) => listing.id === id);
    assert.ok(fixture?.images[0]?.url.startsWith("/assets/"));
    const context = listingContextService.resolve(id);
    assert.equal(context.available, true);
    assert.equal(context.category, fixture.category);
    assert.equal(context.thumbnail, fixture.images[0].url);
    assert.equal(context.href, `/vehicles/${id}`);
    assert.equal(context.price, fixture.price);
  }
  assert.deepEqual(listingContextService.resolve("removed-listing"), {
    listingId: "removed-listing",
    available: false,
  });
  for (const file of ["motorcycle-1.png", "boat-1.png"]) {
    const bytes = await readFile(new URL(`../public/assets/${file}`, import.meta.url));
    assert.ok(bytes.length > 1000, file);
  }
});

test("notifications resolve listing context through conversation and offer IDs without snapshots", () => {
  setup();
  const fixtures = loadTypeScript("src/services/auth.service.ts").developmentAuthFixtures;
  const actor = (email) => {
    const user = fixtures.find((item) => item.user.email === email).user;
    return {
      id: user.id,
      role: user.role,
      scope: `${user.role}:${user.id}`,
      dealerId: user.dealerId,
    };
  };
  const buyer = actor("customer@sahladaraj.dev");
  const seller = actor("customer2@sahladaraj.dev");
  const dealer = actor("dealer@sahladaraj.dev");
  const communication = loadTypeScript(
    "src/services/marketplace-communication.service.ts",
  ).marketplaceCommunicationService;
  const notifications = loadTypeScript(
    "src/services/notifications.service.ts",
  ).notificationsService;
  const conversation = communication.startConversation(buyer, "moto1");
  communication.sendMessage(buyer, conversation.id, "Is it available?");
  const messageNotification = notifications.list(seller)[0];
  assert.equal(communication.listingIdForNotification(seller, messageNotification), "moto1");
  assert.equal(
    communication.destinationForNotification(seller, messageNotification),
    `/messages/${conversation.id}`,
  );
  assert.notEqual(
    communication.destinationForNotification(seller, messageNotification),
    "/vehicles/moto1",
  );
  const offer = communication.createOffer(buyer, "moto1", { amount: 400000, currency: "EGP" });
  const offerNotification = notifications.list(seller).find((item) => item.relatedId === offer.id);
  assert.ok(offerNotification);
  assert.equal(communication.listingIdForNotification(seller, offerNotification), "moto1");
  assert.equal(
    communication.destinationForNotification(seller, offerNotification),
    "/account/received-offers",
  );
  assert.equal("listing" in offerNotification, false);
  assert.equal("image" in offerNotification, false);

  communication.acceptOffer(seller, offer.id);
  const accepted = notifications.list(buyer).find((item) => item.relatedId === offer.id);
  assert.ok(accepted);
  assert.equal(communication.listingIdForNotification(buyer, accepted), "moto1");
  assert.equal(communication.destinationForNotification(buyer, accepted), "/account/offers");

  const rejectedOffer = communication.createOffer(buyer, "boat1", {
    amount: 1700000,
    currency: "EGP",
  });
  communication.rejectOffer(dealer, rejectedOffer.id);
  const rejected = notifications.list(buyer).find((item) => item.relatedId === rejectedOffer.id);
  assert.ok(rejected);
  assert.equal(communication.listingIdForNotification(buyer, rejected), "boat1");
  assert.equal(communication.destinationForNotification(buyer, rejected), "/account/offers");

  const withdrawnOffer = communication.createOffer(buyer, "v1", {
    amount: 2000000,
    currency: "EGP",
  });
  communication.withdrawOffer(buyer, withdrawnOffer.id);
  const withdrawn = notifications
    .list(dealer)
    .find(
      (item) => item.relatedId === withdrawnOffer.id && item.type === "VEHICLE_OFFER_WITHDRAWN",
    );
  assert.ok(withdrawn);
  assert.equal(communication.listingIdForNotification(dealer, withdrawn), "v1");
  assert.equal(
    communication.destinationForNotification(dealer, withdrawn),
    "/dealer-account/received-offers",
  );
});
