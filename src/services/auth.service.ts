import {
  AuthServiceError,
  isValidEmail,
  isValidEgyptPhone,
  normalizeEmail,
  validateLogin,
  validateRegistration,
  validateReset,
  validateRecoveryIdentifier,
  type AuthResult,
  type AuthSession,
  type AuthUser,
  type ForgotPasswordPayload,
  type LoginCredentials,
  type RegistrationPayload,
  type ResetPasswordPayload,
} from "@/lib/auth";

const SESSION_KEY = "sd-auth-session";
const LONG_SESSION_MS = 7 * 864e5;
const SHORT_SESSION_MS = 8 * 36e5;
const MAX_SESSION_MS = 8 * 864e5;
const delay = () => new Promise((resolve) => setTimeout(resolve, 250));

const fixtures = [
  {
    password: "Customer#123",
    user: {
      id: "user-demo",
      role: "user",
      displayName: "Mariam Hassan",
      email: "customer@sahladaraj.dev",
      phone: "+201001112233",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  },
  {
    password: "Dealer#1234",
    user: {
      id: "dealer-demo",
      role: "dealer",
      displayName: "Cairo Auto",
      email: "dealer@sahladaraj.dev",
      phone: "+201009998877",
      dealerId: "agency-1",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  },
] satisfies Array<{ password: string; user: AuthUser }>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
const finiteDate = (value: unknown) => (typeof value === "string" ? Date.parse(value) : Number.NaN);
const cleanText = (value: unknown, max = 100) =>
  typeof value === "string" && value.trim().length > 0 && value.length <= max ? value.trim() : null;

export function parseAuthSession(value: unknown, now = Date.now()): AuthSession | null {
  if (!isRecord(value) || !isRecord(value.user)) return null;
  const raw = value.user;
  const id = cleanText(raw.id, 128);
  const displayName = cleanText(raw.displayName);
  const email = typeof raw.email === "string" ? normalizeEmail(raw.email) : "";
  const role = raw.role === "user" || raw.role === "dealer" ? raw.role : null;
  const phone = raw.phone === undefined ? undefined : cleanText(raw.phone, 20);
  const avatarUrl = raw.avatarUrl === undefined ? undefined : cleanText(raw.avatarUrl, 2048);
  const dealerId = raw.dealerId === undefined ? undefined : cleanText(raw.dealerId, 128);
  const userCreated = finiteDate(raw.createdAt);
  const createdAt = finiteDate(value.createdAt);
  const expiresAt = finiteDate(value.expiresAt);
  const provider =
    value.provider === "password" || value.provider === "google" ? value.provider : null;
  const persistence =
    value.persistence === "local" || value.persistence === "session" ? value.persistence : null;
  if (
    !id ||
    !displayName ||
    !role ||
    !isValidEmail(email) ||
    !provider ||
    !persistence ||
    !Number.isFinite(userCreated) ||
    !Number.isFinite(createdAt) ||
    !Number.isFinite(expiresAt) ||
    createdAt > now + 60_000 ||
    userCreated > createdAt ||
    expiresAt <= createdAt ||
    expiresAt - createdAt > MAX_SESSION_MS ||
    expiresAt <= now ||
    (phone != null && !isValidEgyptPhone(phone)) ||
    (raw.phone !== undefined && phone === null) ||
    (raw.avatarUrl !== undefined &&
      (typeof avatarUrl !== "string" || !/^(https?:\/\/|\/)/.test(avatarUrl))) ||
    (raw.dealerId !== undefined && dealerId === null) ||
    (role === "dealer" && !dealerId)
  )
    return null;
  const user: AuthUser = {
    id,
    role,
    displayName,
    email,
    createdAt: new Date(userCreated).toISOString(),
    ...(phone ? { phone } : {}),
    ...(avatarUrl ? { avatarUrl } : {}),
    ...(dealerId ? { dealerId } : {}),
  };
  return {
    user,
    provider,
    persistence,
    createdAt: new Date(createdAt).toISOString(),
    expiresAt: new Date(expiresAt).toISOString(),
  };
}

function storage(kind: AuthSession["persistence"]) {
  if (typeof window === "undefined") return null;
  return kind === "local" ? window.localStorage : window.sessionStorage;
}
function removeFrom(target: Storage | null) {
  if (target) target.removeItem(SESSION_KEY);
}
function clearSessions() {
  try {
    removeFrom(storage("local"));
    removeFrom(storage("session"));
  } catch {
    throw new AuthServiceError("STORAGE_ERROR");
  }
}
function createSession(
  user: AuthUser,
  persistence: AuthSession["persistence"],
  provider: AuthSession["provider"] = "password",
) {
  const now = Date.now();
  const duration = persistence === "local" ? LONG_SESSION_MS : SHORT_SESSION_MS;
  return {
    user,
    provider,
    persistence,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + duration).toISOString(),
  } satisfies AuthSession;
}
function persist(session: AuthSession): AuthResult {
  try {
    clearSessions();
    const target = storage(session.persistence);
    if (target) target.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    if (error instanceof AuthServiceError) throw error;
    throw new AuthServiceError("STORAGE_ERROR");
  }
  return { session, user: session.user };
}
function notify() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("sd-auth-change"));
}
function readSession(target: Storage | null, expected: AuthSession["persistence"]) {
  if (!target) return null;
  try {
    const raw = target.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = parseAuthSession(JSON.parse(raw));
    if (parsed && parsed.persistence !== expected) {
      target.removeItem(SESSION_KEY);
      return null;
    }
    if (!parsed) target.removeItem(SESSION_KEY);
    return parsed;
  } catch {
    try {
      target.removeItem(SESSION_KEY);
    } catch {
      /* unavailable storage remains a guest read */
    }
    return null;
  }
}

type ResetFixture = { status: "valid" | "used"; issuedAt: number; expiresAt: number };
const resetFixtures = new Map<string, ResetFixture>();
export function resetMockResetTokens(now = Date.now()) {
  resetFixtures.clear();
  resetFixtures.set("valid-demo-token", { status: "valid", issuedAt: now, expiresAt: now + 36e5 });
  resetFixtures.set("expired-demo-token", {
    status: "valid",
    issuedAt: now - 72e5,
    expiresAt: now - 36e5,
  });
  resetFixtures.set("used-demo-token", {
    status: "used",
    issuedAt: now - 18e5,
    expiresAt: now + 18e5,
  });
}
resetMockResetTokens();

export const authService = {
  storageKey: SESSION_KEY,
  async session() {
    if (typeof window === "undefined") return null;
    return readSession(storage("session"), "session") ?? readSession(storage("local"), "local");
  },
  async login(credentials: LoginCredentials): Promise<AuthResult> {
    await delay();
    const normalized = validateLogin(credentials);
    const fixture = fixtures.find(
      ({ user, password }) =>
        (user.email === normalized.identifier || user.phone === normalized.identifier) &&
        password === normalized.password,
    );
    if (!fixture) throw new AuthServiceError("INVALID_CREDENTIALS");
    const result = persist(createSession(fixture.user, normalized.remember ? "local" : "session"));
    notify();
    return result;
  },
  async register(payload: RegistrationPayload): Promise<AuthResult> {
    await delay();
    const valid = validateRegistration(payload);
    const id = `local-${crypto.randomUUID()}`;
    const user: AuthUser = {
      id,
      role: valid.role,
      displayName: valid.role === "dealer" ? valid.businessName.trim() : valid.displayName.trim(),
      email: valid.email,
      phone: valid.phone,
      createdAt: new Date().toISOString(),
      ...(valid.role === "dealer" ? { dealerId: `local-dealer-${id}` } : {}),
    };
    const result = persist(createSession(user, "session"));
    notify();
    return result;
  },
  async loginWithGoogleMock(_providerCredential?: string) {
    await delay();
    const result = persist(createSession(fixtures[0].user, "local", "google"));
    notify();
    return result;
  },
  async forgotPassword(payload: ForgotPasswordPayload) {
    validateRecoveryIdentifier(payload.identifier);
    await delay();
    return { accepted: true as const };
  },
  async validateResetToken(token: string, now = Date.now()) {
    if (!token) return "missing" as const;
    const fixture = resetFixtures.get(token);
    if (!fixture) return "invalid" as const;
    if (fixture.status === "used") return "used" as const;
    if (fixture.expiresAt <= now) return "expired" as const;
    return "valid" as const;
  },
  async resetPassword(payload: ResetPasswordPayload) {
    validateReset(payload);
    const status = await this.validateResetToken(payload.token);
    if (status !== "valid")
      throw new AuthServiceError(
        status === "expired"
          ? "EXPIRED_RESET_TOKEN"
          : status === "used"
            ? "USED_RESET_TOKEN"
            : "INVALID_RESET_TOKEN",
      );
    const fixture = resetFixtures.get(payload.token);
    if (!fixture || fixture.status !== "valid") throw new AuthServiceError("USED_RESET_TOKEN");
    fixture.status = "used";
    await delay();
    return { reset: true as const };
  },
  async logout() {
    clearSessions();
    notify();
  },
  subscribe(callback: () => void) {
    if (typeof window === "undefined") return () => undefined;
    const local = () => callback();
    const changed = (event: StorageEvent) => {
      if (event.key === SESSION_KEY) callback();
    };
    window.addEventListener("sd-auth-change", local);
    window.addEventListener("storage", changed);
    return () => {
      window.removeEventListener("sd-auth-change", local);
      window.removeEventListener("storage", changed);
    };
  },
};
