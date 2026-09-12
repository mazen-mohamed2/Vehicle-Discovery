import test from "node:test";
import assert from "node:assert/strict";
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
  const listeners = new Map();
  globalThis.window = {
    localStorage,
    dispatchEvent(event) {
      for (const callback of listeners.get(event.type) ?? []) callback(event);
    },
    addEventListener(type, callback) {
      listeners.set(type, [...(listeners.get(type) ?? []), callback]);
    },
    removeEventListener(type, callback) {
      listeners.set(
        type,
        (listeners.get(type) ?? []).filter((item) => item !== callback),
      );
    },
  };
  globalThis.localStorage = localStorage;
  clearTypeScriptModules();
  const fixtures = loadTypeScript("src/services/auth.service.ts").developmentAuthFixtures;
  const actor = (id) => {
    const user = fixtures.find((item) => item.user.id === id).user;
    return {
      id: user.id,
      role: user.role,
      scope: `${user.role}:${user.id}`,
      dealerId: user.dealerId,
    };
  };
  return {
    localStorage,
    trust: loadTypeScript("src/services/trust-safety.service.ts").trustSafetyService,
    communication: loadTypeScript("src/services/marketplace-communication.service.ts")
      .marketplaceCommunicationService,
    sellers: loadTypeScript("src/services/seller-profiles.service.ts").sellerProfilesService,
    userA: actor("user-demo"),
    userB: actor("user-qa-b"),
    dealerA: actor("dealer-demo"),
    dealerB: actor("dealer-qa-b"),
  };
}

test("public individual profile exposes only safe identity and active public listings", () => {
  const s = setup();
  const profile = s.sellers.byId(s.userA.id);
  assert.equal(profile.displayName, "Mariam Hassan");
  assert.equal(profile.role, "user");
  assert.ok(profile.memberSince);
  for (const privateField of ["email", "phone", "address", "password", "documents"])
    assert.equal(privateField in profile, false);
  assert.deepEqual(
    s.sellers.listings(s.userA.id).map((item) => item.id),
    ["v3"],
  );
  assert.equal(s.sellers.byId(s.dealerA.id), null);
  assert.deepEqual(s.sellers.reputation(s.userA.id), { reviews: [], rating: null });
});

test("individual verification is pending, isolated, and cannot self-approve", () => {
  const s = setup();
  const request = s.trust.submitVerification(s.userA, "INDIVIDUAL", s.userA.id);
  assert.equal(request.status, "PENDING_REVIEW");
  assert.equal(s.trust.verificationForOwner(s.userA, "INDIVIDUAL", s.userA.id).id, request.id);
  assert.throws(
    () => s.trust.verificationForOwner(s.userB, "INDIVIDUAL", s.userA.id),
    (error) => error.code === "FORBIDDEN",
  );
  assert.equal(typeof s.trust.approveVerification, "undefined");
  assert.throws(
    () => s.trust.submitVerification(s.userA, "INDIVIDUAL", s.userA.id),
    (error) => error.code === "INVALID_STATUS_TRANSITION",
  );
  assert.doesNotMatch(s.localStorage.getItem("sd-verification-requests"), /document|base64|blob:/i);
});

test("vehicle and dealer verification enforce canonical ownership and fixture authority", () => {
  const s = setup();
  const request = s.trust.submitVerification(s.userA, "VEHICLE", "v3");
  assert.equal(request.subjectId, "v3");
  assert.throws(
    () => s.trust.submitVerification(s.userB, "VEHICLE", "v3"),
    (error) => error.code === "FORBIDDEN",
  );
  assert.throws(
    () => s.trust.submitVerification(s.dealerA, "DEALER", s.dealerB.dealerId),
    (error) => error.code === "FORBIDDEN",
  );
  assert.equal(s.trust.publicStatus("DEALER", s.dealerA.dealerId), "VERIFIED");
  assert.throws(
    () => s.trust.submitVerification(s.dealerA, "DEALER", s.dealerA.dealerId),
    (error) => error.code === "INVALID_STATUS_TRANSITION",
  );
});

test("only VERIFIED status qualifies for a public trust badge", () => {
  const { isVerified } = loadTypeScript("src/lib/trust-safety.ts");
  assert.equal(isVerified("VERIFIED"), true);
  for (const status of ["NOT_SUBMITTED", "PENDING_REVIEW", "REJECTED"])
    assert.equal(isVerified(status), false);
});

test("reports validate self-action, duplicates, participant access, and account isolation", () => {
  const s = setup();
  const listingReport = s.trust.submitReport(s.userA, {
    targetType: "LISTING",
    targetId: "v1",
    reason: "MISLEADING_INFORMATION",
  });
  assert.equal(listingReport.status, "SUBMITTED");
  assert.throws(
    () => s.trust.submitReport(s.userA, { targetType: "LISTING", targetId: "v1", reason: "SPAM" }),
    (error) => error.code === "DUPLICATE_ACTIVE_REPORT",
  );
  assert.throws(
    () => s.trust.submitReport(s.userA, { targetType: "LISTING", targetId: "v3", reason: "OTHER" }),
    (error) => error.code === "SELF_ACTION",
  );
  const conversation = s.communication.startConversation(s.userA, "v1");
  const message = s.communication.sendMessage(s.userA, conversation.id, "Question");
  assert.equal(
    s.trust.submitReport(s.dealerA, { targetType: "MESSAGE", targetId: message.id, reason: "SPAM" })
      .targetId,
    message.id,
  );
  assert.throws(
    () =>
      s.trust.submitReport(s.userB, {
        targetType: "CONVERSATION",
        targetId: conversation.id,
        reason: "HARASSMENT",
      }),
    (error) => error.code === "FORBIDDEN",
  );
  assert.deepEqual(s.trust.reports(s.userB), []);
  assert.equal(s.trust.reports(s.userA).length, 1);
  assert.equal(typeof s.trust.resolveReport, "undefined");
});

test("participant blocking preserves history, prevents communication, and only blocker unblocks", () => {
  const s = setup();
  const conversation = s.communication.startConversation(s.userA, "v1");
  s.communication.sendMessage(s.userA, conversation.id, "Before block");
  s.communication.blockParticipant(s.userA, conversation.id);
  assert.equal(s.communication.messages(s.userA, conversation.id).length, 1);
  assert.throws(
    () => s.communication.sendMessage(s.userA, conversation.id, "Blocked"),
    (error) => error.code === "BLOCKED",
  );
  assert.throws(
    () => s.communication.sendMessage(s.dealerA, conversation.id, "Also blocked"),
    (error) => error.code === "BLOCKED",
  );
  assert.throws(
    () => s.communication.unblockParticipant(s.dealerA, conversation.id),
    (error) => error.code === "FORBIDDEN",
  );
  clearTypeScriptModules();
  const reloaded = loadTypeScript(
    "src/services/marketplace-communication.service.ts",
  ).marketplaceCommunicationService;
  assert.equal(reloaded.blockState(s.userA, conversation.id).blocked, true);
  reloaded.unblockParticipant(s.userA, conversation.id);
  assert.equal(
    reloaded.sendMessage(s.userA, conversation.id, "After unblock").body,
    "After unblock",
  );
});

test("blocking self is invalid and blocked new conversations create no notifications", () => {
  const s = setup();
  const conversation = s.communication.startConversation(s.userA, "v1");
  const blocks = loadTypeScript("src/services/blocks.service.ts").blocksService;
  let blockUpdates = 0;
  const unsubscribe = blocks.subscribe(() => blockUpdates++);
  assert.throws(
    () => blocks.block(s.userA.id, s.userA.id, [s.userA.id]),
    (error) => error.code === "SELF_ACTION",
  );
  s.communication.blockParticipant(s.dealerA, conversation.id);
  assert.equal(blockUpdates, 1);
  const before = s.localStorage.getItem("sd-website-notifications");
  assert.throws(
    () => s.communication.sendMessage(s.userA, conversation.id, "No notification"),
    (error) => error.code === "BLOCKED",
  );
  assert.equal(s.localStorage.getItem("sd-website-notifications"), before);
  unsubscribe();
});

test("review foundation requires a completed transaction and exposes no write service", () => {
  const { isReviewEligible } = loadTypeScript("src/lib/trust-safety.ts");
  assert.equal(isReviewEligible("COMPLETED"), true);
  assert.equal(isReviewEligible("PENDING"), false);
  assert.equal(isReviewEligible(undefined), false);
});

test("corrupted trust persistence fails safely and repository events synchronize", () => {
  const s = setup();
  let updates = 0;
  const unsubscribe = s.trust.subscribe(() => updates++);
  s.trust.submitReport(s.userA, { targetType: "LISTING", targetId: "v1", reason: "SPAM" });
  assert.equal(updates, 1);
  unsubscribe();
  s.localStorage.setItem("sd-verification-requests", '[{"bad":true}]');
  assert.throws(
    () => s.trust.verificationForOwner(s.userA, "INDIVIDUAL", s.userA.id),
    (error) => error.code === "STORAGE_READ_FAILED",
  );
});
