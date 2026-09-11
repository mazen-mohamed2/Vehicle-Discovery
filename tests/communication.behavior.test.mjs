import test from "node:test";
import assert from "node:assert/strict";
import { clearTypeScriptModules, loadTypeScript } from "./ts-module-loader.mjs";

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
  const localStorage = new MemoryStorage();
  globalThis.window = {
    localStorage,
    dispatchEvent() {},
    addEventListener() {},
    removeEventListener() {},
  };
  globalThis.localStorage = localStorage;
  clearTypeScriptModules();
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
  return {
    localStorage,
    service: loadTypeScript("src/services/marketplace-communication.service.ts")
      .marketplaceCommunicationService,
    notifications: loadTypeScript("src/services/notifications.service.ts").notificationsService,
    detailState: loadTypeScript("src/lib/communication.ts").communicationDetailState,
    CommunicationError: loadTypeScript("src/lib/communication.ts").CommunicationError,
    catalog: loadTypeScript("src/services/public-catalog.service.ts").publicCatalogService,
    userA: actor("customer@sahladaraj.dev"),
    userB: actor("customer2@sahladaraj.dev"),
    dealerA: actor("dealer@sahladaraj.dev"),
    dealerB: actor("dealer2@sahladaraj.dev"),
  };
}

function managedListing(status) {
  return {
    id: "listing-lifecycle",
    sellerId: "user-demo",
    sellerRole: "user",
    sellerName: "Mariam Hassan",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    publishedAt: "2026-01-01T00:00:00.000Z",
    status,
    currentStep: "review",
    completionPercentage: 100,
    version: 1,
    make: "Toyota",
    model: "Corolla",
    trim: "",
    bodyType: "Sedan",
    condition: "used",
    year: 2024,
    mileage: 1000,
    transmission: "automatic",
    fuelType: "gasoline",
    drivetrain: "",
    exteriorColor: "White",
    interiorColor: "",
    price: 1000000,
    currency: "EGP",
    negotiable: true,
    financingAvailable: false,
    description: "A complete development listing for lifecycle behavior.",
    location: "Cairo",
    contactPreference: "either",
    accidentHistory: "none",
    importStatus: "local",
    warrantyStatus: "none",
    serviceHistoryAvailable: false,
    vehicleVerificationStatus: "notSubmitted",
    ownershipVerificationStatus: "notSubmitted",
    images: [],
    declarations: {},
  };
}

test("eligible contact creates one canonical conversation and persists messages", () => {
  const s = setup();
  const first = s.service.startConversation(s.userA, "v1");
  assert.equal(s.service.startConversation(s.userA, "v1").id, first.id);
  assert.deepEqual(first.participantUserIds, [s.userA.id, s.dealerA.id]);
  const message = s.service.sendMessage(s.userA, first.id, "  Is this available?  ");
  assert.equal(message.body, "Is this available?");
  assert.equal(s.service.messages(s.dealerA, first.id)[0].id, message.id);
  assert.ok(s.service.conversation(s.userA, first.id).lastMessageAt);
  clearTypeScriptModules();
  const reloaded = loadTypeScript(
    "src/services/marketplace-communication.service.ts",
  ).marketplaceCommunicationService;
  assert.equal(reloaded.messages(s.userA, first.id)[0].body, "Is this available?");
});

test("conversation membership, self-contact, validation, and terminal states are enforced", () => {
  const s = setup();
  const conversation = s.service.startConversation(s.userA, "v1");
  assert.throws(
    () => s.service.conversation(s.userB, conversation.id),
    (error) => error.code === "FORBIDDEN",
  );
  assert.throws(
    () => s.service.sendMessage(s.userB, conversation.id, "hello"),
    (error) => error.code === "FORBIDDEN",
  );
  assert.throws(
    () => s.service.sendMessage(s.userA, conversation.id, "  "),
    (error) => error.code === "VALIDATION_ERROR",
  );
  assert.throws(
    () => s.service.startConversation(s.userA, "v3"),
    (error) => error.code === "SELF_INTERACTION",
  );
  const forbidden = new s.CommunicationError("FORBIDDEN");
  assert.equal(
    s.detailState({ isLoading: false, value: undefined, error: forbidden }),
    "forbidden",
  );
  assert.equal(
    s.detailState({
      isLoading: false,
      value: undefined,
      error: new s.CommunicationError("NOT_FOUND"),
    }),
    "not-found",
  );
});

test("message read state and recipient notification update coherently", () => {
  const s = setup();
  const conversation = s.service.startConversation(s.userA, "v1");
  s.service.sendMessage(s.userA, conversation.id, "Hello dealer");
  assert.equal(s.notifications.unreadCount(s.dealerA), 1);
  assert.equal(s.notifications.list(s.userB).length, 0);
  assert.equal(
    s.service.messages(s.dealerA, conversation.id)[0].readByUserIds.includes(s.dealerA.id),
    false,
  );
  s.service.markConversationRead(s.dealerA, conversation.id);
  assert.equal(
    s.service.messages(s.dealerA, conversation.id)[0].readByUserIds.includes(s.dealerA.id),
    true,
  );
  const notification = s.notifications.list(s.dealerA)[0];
  assert.ok(notification.readAt);
  assert.equal(s.notifications.unreadCount(s.dealerA), 0);
  assert.throws(
    () => s.notifications.markRead(s.dealerB, notification.id),
    (error) => error.code === "FORBIDDEN",
  );
  assert.match(notification.href, /^\/(?!\/)/);
});

test("opening one conversation reads only its received messages and matching notification", () => {
  const s = setup();
  const conversationA = s.service.startConversation(s.userA, "v1");
  const conversationB = s.service.startConversation(s.userB, "v7");
  s.service.sendMessage(s.userA, conversationA.id, "Conversation A");
  s.service.sendMessage(s.userB, conversationB.id, "Conversation B");
  assert.equal(s.notifications.unreadCount(s.dealerA), 2);

  s.service.markConversationRead(s.dealerA, conversationA.id);

  const notifications = s.notifications.list(s.dealerA);
  assert.ok(notifications.find((item) => item.relatedId === conversationA.id).readAt);
  assert.equal(notifications.find((item) => item.relatedId === conversationB.id).readAt, undefined);
  assert.equal(s.notifications.unreadCount(s.dealerA), 1);
  assert.equal(
    s.service.messages(s.dealerA, conversationB.id)[0].readByUserIds.includes(s.dealerA.id),
    false,
  );
  assert.equal(s.notifications.list(s.userA).length, 0);
});

test("public counterpart profiles expose canonical safe identity only", () => {
  setup();
  const { developmentPublicProfile } = loadTypeScript("src/services/auth.service.ts");
  const dealer = developmentPublicProfile("dealer-demo");
  const individual = developmentPublicProfile("user-demo");
  assert.equal(dealer.displayName, "Cairo Auto");
  assert.equal(dealer.role, "dealer");
  assert.equal(dealer.dealerId, "ag1");
  assert.equal(individual.role, "user");
  for (const profile of [dealer, individual]) {
    assert.equal("email" in profile, false);
    assert.equal("phone" in profile, false);
    assert.equal("password" in profile, false);
  }
});

test("post-login entity return paths require the newly authenticated identity", () => {
  const s = setup();
  const conversation = s.service.startConversation(s.userA, "v1");
  const { resolveAuthenticatedReturnPath } = loadTypeScript("src/services/return-path.service.ts");
  const fixtures = loadTypeScript("src/services/auth.service.ts").developmentAuthFixtures;
  const user = (id) => fixtures.find((item) => item.user.id === id).user;
  const path = `/messages/${conversation.id}`;
  assert.equal(resolveAuthenticatedReturnPath(path, user(s.userA.id)), path);
  assert.equal(resolveAuthenticatedReturnPath(path, user(s.dealerA.id)), path);
  assert.equal(resolveAuthenticatedReturnPath(path, user(s.userB.id)), "/messages");
  assert.equal(resolveAuthenticatedReturnPath("https://evil.test", user(s.userA.id)), "/account");
});

test("vehicle offers enforce buyer and seller isolation with historical withdrawal", () => {
  const s = setup();
  const offer = s.service.createOffer(s.userA, "v1", {
    amount: 2200000,
    currency: "EGP",
    note: "Cash",
  });
  assert.equal(offer.status, "PENDING");
  assert.equal(s.service.buyerOffers(s.userA)[0].id, offer.id);
  assert.equal(s.service.receivedOffers(s.dealerA)[0].id, offer.id);
  assert.deepEqual(s.service.receivedOffers(s.dealerB), []);
  assert.throws(
    () => s.service.createOffer(s.userA, "v1", { amount: 1, currency: "EGP" }),
    (error) => error.code === "DUPLICATE_ACTIVE_OFFER",
  );
  assert.throws(
    () => s.service.withdrawOffer(s.userB, offer.id),
    (error) => error.code === "FORBIDDEN",
  );
  assert.throws(
    () => s.service.rejectOffer(s.dealerB, offer.id),
    (error) => error.code === "FORBIDDEN",
  );
  assert.equal(s.service.withdrawOffer(s.userA, offer.id).status, "WITHDRAWN");
  assert.equal(s.service.receivedOffers(s.dealerA)[0].status, "WITHDRAWN");
});

test("acceptance selects exactly one offer, rejects competitors, blocks new offers, and does not sell listing", () => {
  const s = setup();
  const first = s.service.createOffer(s.userA, "v1", { amount: 2200000, currency: "EGP" });
  const second = s.service.createOffer(s.userB, "v1", { amount: 2250000, currency: "EGP" });
  const result = s.service.acceptOffer(s.dealerA, second.id);
  assert.equal(result.find((item) => item.id === second.id).status, "ACCEPTED");
  assert.equal(result.find((item) => item.id === first.id).status, "REJECTED");
  assert.equal(result.filter((item) => item.status === "ACCEPTED").length, 1);
  assert.throws(
    () => s.service.createOffer(s.dealerB, "v1", { amount: 2300000, currency: "EGP" }),
    (error) => error.code === "ACCEPTED_OFFER_EXISTS",
  );
  assert.ok(s.catalog.byId("v1"));
  assert.equal(s.notifications.list(s.userA)[0].type, "VEHICLE_OFFER_REJECTED");
  assert.equal(s.notifications.list(s.userB)[0].type, "VEHICLE_OFFER_ACCEPTED");
});

test("rejection leaves listing eligible and creates an isolated buyer notification", () => {
  const s = setup();
  const offer = s.service.createOffer(s.userA, "v1", { amount: 2200000, currency: "EGP" });
  assert.equal(s.service.rejectOffer(s.dealerA, offer.id).status, "REJECTED");
  assert.equal(
    s.service.createOffer(s.userB, "v1", { amount: 2250000, currency: "EGP" }).status,
    "PENDING",
  );
  assert.equal(
    s.notifications.list(s.userA).some((item) => item.type === "VEHICLE_OFFER_REJECTED"),
    true,
  );
  assert.equal(s.notifications.list(s.dealerB).length, 0);
});

test("listing lifecycle blocks new activity while preserving published history", () => {
  const s = setup();
  for (const status of ["draft", "pending", "sold", "archived"]) {
    s.localStorage.setItem("sd-published-listings", JSON.stringify([managedListing(status)]));
    assert.throws(
      () =>
        s.service.createOffer(s.userB, "listing-lifecycle", {
          amount: 900000,
          currency: "EGP",
        }),
      (error) => error.code === "LISTING_NOT_ELIGIBLE",
      status,
    );
  }
  s.localStorage.setItem("sd-published-listings", JSON.stringify([managedListing("published")]));
  const conversation = s.service.startConversation(s.userB, "listing-lifecycle");
  const offer = s.service.createOffer(s.userB, "listing-lifecycle", {
    amount: 900000,
    currency: "EGP",
  });
  s.localStorage.setItem("sd-published-listings", JSON.stringify([managedListing("sold")]));
  assert.equal(s.service.conversation(s.userB, conversation.id).id, conversation.id);
  assert.equal(s.service.buyerOffers(s.userB)[0].id, offer.id);
  assert.throws(
    () => s.service.startConversation(s.dealerB, "listing-lifecycle"),
    (error) => error.code === "LISTING_NOT_ELIGIBLE",
  );
});

test("corrupted communication persistence fails with a typed error", () => {
  const s = setup();
  s.localStorage.values.set("sd-marketplace-conversations", '[{"bad":true}]');
  assert.throws(
    () => s.service.participantConversations(s.userA),
    (error) => error.code === "STORAGE_READ_FAILED",
  );
});
