import test from "node:test";
import assert from "node:assert/strict";
import { loadTypeScript, clearTypeScriptModules } from "./ts-module-loader.mjs";

class MemoryStorage {
  values = new Map();
  failRemove = false;
  failWrite = false;
  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }
  setItem(key, value) {
    if (this.failWrite) throw new Error("storage");
    this.values.set(key, String(value));
  }
  removeItem(key) {
    if (this.failRemove) throw new Error("storage");
    this.values.delete(key);
  }
  clear() {
    this.values.clear();
  }
}
function browser() {
  const localStorage = new MemoryStorage();
  const sessionStorage = new MemoryStorage();
  globalThis.window = {
    localStorage,
    sessionStorage,
    dispatchEvent() {},
    addEventListener() {},
    removeEventListener() {},
  };
  globalThis.localStorage = localStorage;
  globalThis.sessionStorage = sessionStorage;
  return { localStorage, sessionStorage };
}
function validSession(overrides = {}) {
  const now = Date.now();
  return {
    user: {
      id: "user-a",
      role: "user",
      displayName: "User A",
      email: "user@example.com",
      createdAt: new Date(now - 1000).toISOString(),
    },
    provider: "password",
    persistence: "local",
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + 3600000).toISOString(),
    ...overrides,
  };
}

test("strict parser reconstructs an allowlisted session", () => {
  browser();
  clearTypeScriptModules();
  const { parseAuthSession } = loadTypeScript("src/services/auth.service.ts");
  const parsed = parseAuthSession({
    ...validSession(),
    unknown: "drop",
    user: { ...validSession().user, secret: "drop" },
  });
  assert.ok(parsed);
  assert.equal("unknown" in parsed, false);
  assert.equal("secret" in parsed.user, false);
});
test("runtime expiry scheduler fires at the session deadline and cleans up", () => {
  const { scheduleSessionExpiry } = loadTypeScript("src/lib/auth-lifecycle.ts");
  let callback;
  let scheduledDelay;
  let cancelled = false;
  let expired = false;
  const cleanup = scheduleSessionExpiry(
    new Date(5000).toISOString(),
    () => {
      expired = true;
    },
    1000,
    (next, delay) => {
      callback = next;
      scheduledDelay = delay;
      return 7;
    },
    (timer) => {
      cancelled = timer === 7;
    },
  );
  assert.equal(scheduledDelay, 4000);
  callback();
  assert.equal(expired, true);
  cleanup();
  assert.equal(cancelled, true);
});
for (const [name, mutate] of [
  [
    "empty user id",
    (v) => {
      v.user.id = "";
    },
  ],
  [
    "invalid role",
    (v) => {
      v.user.role = "admin";
    },
  ],
  [
    "invalid email",
    (v) => {
      v.user.email = "bad email";
    },
  ],
  [
    "dealer without dealer id",
    (v) => {
      v.user.role = "dealer";
    },
  ],
  [
    "invalid createdAt",
    (v) => {
      v.createdAt = "bad";
    },
  ],
  [
    "invalid expiresAt",
    (v) => {
      v.expiresAt = "bad";
    },
  ],
  [
    "expiry before creation",
    (v) => {
      v.expiresAt = new Date(Date.now() - 2000).toISOString();
    },
  ],
  [
    "unreasonable expiry",
    (v) => {
      v.expiresAt = new Date(Date.now() + 20 * 864e5).toISOString();
    },
  ],
])
  test(`strict parser rejects ${name}`, () => {
    browser();
    clearTypeScriptModules();
    const { parseAuthSession } = loadTypeScript("src/services/auth.service.ts");
    const value = validSession();
    mutate(value);
    assert.equal(parseAuthSession(value), null);
  });

test("email normalization accepts boundary whitespace and case but rejects internal whitespace", () => {
  const { validateLogin } = loadTypeScript("src/lib/auth.ts");
  assert.equal(
    validateLogin({ identifier: "  CUSTOMER@SAHLADARAJ.DEV  ", password: "x", remember: true })
      .identifier,
    "customer@sahladaraj.dev",
  );
  assert.throws(() =>
    validateLogin({ identifier: "cust omer@sahladaraj.dev", password: "x", remember: true }),
  );
});
test("Egyptian phone normalization is executable", () => {
  const { validateLogin } = loadTypeScript("src/lib/auth.ts");
  assert.equal(
    validateLogin({ identifier: "010 0111 2233", password: "x", remember: false }).identifier,
    "+201001112233",
  );
});
test("safe return paths reject external, encoded, malformed, backslash, and auth routes", () => {
  const { safeReturnPath } = loadTypeScript("src/lib/auth.ts");
  assert.equal(safeReturnPath("/vehicles?page=2"), "/vehicles?page=2");
  for (const value of [
    "https://evil.test",
    "//evil.test",
    "/%2f%2fevil.test",
    "/\\evil",
    "/%E0%A4%A",
    "/auth/login",
    "/auth/register",
    "/auth/forgot-password",
    "/auth/reset-password?token=x",
  ])
    assert.equal(safeReturnPath(value), null, value);
});
test("remember true uses localStorage and remember false uses sessionStorage", async () => {
  const stores = browser();
  clearTypeScriptModules();
  const { authService } = loadTypeScript("src/services/auth.service.ts");
  await authService.login({
    identifier: "customer@sahladaraj.dev",
    password: "Customer#123",
    remember: true,
  });
  assert.ok(stores.localStorage.getItem(authService.storageKey));
  assert.equal(stores.sessionStorage.getItem(authService.storageKey), null);
  await authService.login({
    identifier: "customer@sahladaraj.dev",
    password: "Customer#123",
    remember: false,
  });
  assert.ok(stores.sessionStorage.getItem(authService.storageKey));
  assert.equal(stores.localStorage.getItem(authService.storageKey), null);
});
test("invalid JSON is removed and resolves to guest", async () => {
  const stores = browser();
  clearTypeScriptModules();
  const { authService } = loadTypeScript("src/services/auth.service.ts");
  stores.localStorage.setItem(authService.storageKey, "{");
  assert.equal(await authService.session(), null);
  assert.equal(stores.localStorage.getItem(authService.storageKey), null);
});
test("expired persisted sessions are removed", async () => {
  const stores = browser();
  clearTypeScriptModules();
  const { authService } = loadTypeScript("src/services/auth.service.ts");
  const value = validSession({
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    expiresAt: new Date(Date.now() - 3600000).toISOString(),
  });
  stores.localStorage.setItem(authService.storageKey, JSON.stringify(value));
  assert.equal(await authService.session(), null);
  assert.equal(stores.localStorage.getItem(authService.storageKey), null);
});
test("individual and dealer login return canonical roles", async () => {
  browser();
  clearTypeScriptModules();
  const { authService } = loadTypeScript("src/services/auth.service.ts");
  assert.equal(
    (
      await authService.login({
        identifier: "customer@sahladaraj.dev",
        password: "Customer#123",
        remember: true,
      })
    ).user.role,
    "user",
  );
  assert.equal(
    (
      await authService.login({
        identifier: "dealer@sahladaraj.dev",
        password: "Dealer#1234",
        remember: true,
      })
    ).user.role,
    "dealer",
  );
});
test("invalid credentials and malformed login are rejected", async () => {
  browser();
  clearTypeScriptModules();
  const { authService } = loadTypeScript("src/services/auth.service.ts");
  await assert.rejects(authService.login({ identifier: "bad", password: "x", remember: true }));
  await assert.rejects(
    authService.login({ identifier: "customer@sahladaraj.dev", password: "wrong", remember: true }),
  );
});
test("logout failure preserves durable session and retry clears both stores", async () => {
  const stores = browser();
  clearTypeScriptModules();
  const { authService } = loadTypeScript("src/services/auth.service.ts");
  await authService.login({
    identifier: "customer@sahladaraj.dev",
    password: "Customer#123",
    remember: true,
  });
  stores.localStorage.failRemove = true;
  await assert.rejects(authService.logout(), (error) => error.code === "STORAGE_ERROR");
  assert.ok(stores.localStorage.getItem(authService.storageKey));
  stores.localStorage.failRemove = false;
  await authService.logout();
  assert.equal(stores.localStorage.getItem(authService.storageKey), null);
  assert.equal(stores.sessionStorage.getItem(authService.storageKey), null);
});
test("reset token becomes used and password is never persisted", async () => {
  const stores = browser();
  clearTypeScriptModules();
  const { authService, resetMockResetTokens } = loadTypeScript("src/services/auth.service.ts");
  resetMockResetTokens();
  await authService.resetPassword({ token: "valid-demo-token", password: "Strong#Pass1" });
  await assert.rejects(
    authService.resetPassword({ token: "valid-demo-token", password: "Strong#Pass2" }),
    (error) => error.code === "USED_RESET_TOKEN",
  );
  assert.equal(
    [...stores.localStorage.values.values(), ...stores.sessionStorage.values.values()]
      .join(" ")
      .includes("Strong#"),
    false,
  );
});
test("reset token reports missing invalid expired and used states", async () => {
  browser();
  clearTypeScriptModules();
  const { authService, resetMockResetTokens } = loadTypeScript("src/services/auth.service.ts");
  resetMockResetTokens();
  assert.equal(await authService.validateResetToken(""), "missing");
  assert.equal(await authService.validateResetToken("unknown"), "invalid");
  assert.equal(await authService.validateResetToken("expired-demo-token"), "expired");
  assert.equal(await authService.validateResetToken("used-demo-token"), "used");
});
test("registration validates fields and creates a temporary sanitized session", async () => {
  const stores = browser();
  clearTypeScriptModules();
  const { authService } = loadTypeScript("src/services/auth.service.ts");
  await assert.rejects(
    authService.register({
      role: "user",
      displayName: "A",
      email: "bad",
      phone: "x",
      password: "weak",
      terms: false,
    }),
  );
  const result = await authService.register({
    role: "user",
    displayName: "Valid User",
    email: "USER@EXAMPLE.COM",
    phone: "01001112233",
    password: "Strong#Pass1",
    terms: true,
  });
  assert.equal(result.session.persistence, "session");
  assert.equal(result.user.email, "user@example.com");
  const persisted = stores.sessionStorage.getItem(authService.storageKey);
  assert.ok(persisted);
  assert.equal(persisted.includes("Strong#Pass1"), false);
});
test("dealer registration produces a parser-valid canonical dealer identity", async () => {
  browser();
  clearTypeScriptModules();
  const { authService } = loadTypeScript("src/services/auth.service.ts");
  const result = await authService.register({
    role: "dealer",
    businessName: "Dealer Co",
    contactName: "Owner Name",
    email: "dealer2@example.com",
    phone: "01111112222",
    city: "Cairo",
    password: "Strong#Pass1",
    terms: true,
  });
  assert.ok(result.user.dealerId);
  assert.equal((await authService.session()).user.id, result.user.id);
});
test("forgot password returns the same accepted result for valid unknown identities", async () => {
  browser();
  clearTypeScriptModules();
  const { authService } = loadTypeScript("src/services/auth.service.ts");
  assert.deepEqual(await authService.forgotPassword({ identifier: "unknown@example.com" }), {
    accepted: true,
  });
  assert.deepEqual(await authService.forgotPassword({ identifier: "customer@sahladaraj.dev" }), {
    accepted: true,
  });
});
test("scoped favorites and compare are isolated and preserve maximum compare size", async () => {
  browser();
  clearTypeScriptModules();
  const { favoritesService } = loadTypeScript("src/services/favorites.service.ts");
  const { compareService } = loadTypeScript("src/services/compare.service.ts");
  await favoritesService.add("guest", "v1");
  await favoritesService.add("user:user-a", "v2");
  assert.deepEqual(
    (await favoritesService.list("guest")).map((v) => v.listingId),
    ["v1"],
  );
  assert.deepEqual(
    (await favoritesService.list("user:user-a")).map((v) => v.listingId),
    ["v2"],
  );
  await compareService.replace("dealer:dealer-a", ["1", "2", "3", "4", "5"]);
  assert.deepEqual(await compareService.list("dealer:dealer-a"), ["1", "2", "3", "4"]);
  assert.deepEqual(await compareService.list("guest"), []);
});
test("scoped storage failures reject instead of claiming persistence", () => {
  const stores = browser();
  clearTypeScriptModules();
  const { favoritesService } = loadTypeScript("src/services/favorites.service.ts");
  stores.localStorage.failWrite = true;
  assert.throws(
    () => favoritesService.add("guest", "v1"),
    (error) => error.code === "STORAGE_ERROR",
  );
});
