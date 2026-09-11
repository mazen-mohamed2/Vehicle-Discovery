export type UserRole = "user" | "dealer";
export type AuthProvider = "password" | "google";

export interface AuthUser {
  id: string;
  role: UserRole;
  displayName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  dealerId?: string;
  createdAt: string;
}

export interface AuthSession {
  user: AuthUser;
  provider: AuthProvider;
  createdAt: string;
  expiresAt: string;
  persistence: "local" | "session";
}

export interface LoginCredentials {
  identifier: string;
  password: string;
  remember: boolean;
}
export interface IndividualRegistrationPayload {
  role: "user";
  displayName: string;
  email: string;
  phone: string;
  password: string;
  terms: boolean;
}
export interface DealerRegistrationPayload {
  role: "dealer";
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  password: string;
  terms: boolean;
}
export type RegistrationPayload = IndividualRegistrationPayload | DealerRegistrationPayload;
export interface ForgotPasswordPayload {
  identifier: string;
}
export interface ResetPasswordPayload {
  token: string;
  password: string;
}
export interface AuthResult {
  session: AuthSession;
  user: AuthUser;
}
export type AuthErrorCode =
  | "INVALID_CREDENTIALS"
  | "VALIDATION_ERROR"
  | "INVALID_RESET_TOKEN"
  | "EXPIRED_RESET_TOKEN"
  | "USED_RESET_TOKEN"
  | "STORAGE_ERROR";

export class AuthServiceError extends Error {
  constructor(
    public readonly code: AuthErrorCode,
    public readonly fields: Partial<Record<AuthField, AuthValidationCode>> = {},
  ) {
    super(code);
    this.name = "AuthServiceError";
  }
}

export type AuthField =
  | "identifier"
  | "password"
  | "displayName"
  | "businessName"
  | "contactName"
  | "email"
  | "phone"
  | "city"
  | "terms"
  | "token";
export type AuthValidationCode = "required" | "invalid" | "length" | "passwordPolicy" | "terms";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EGYPT_PHONE_PATTERN = /^\+201(?:0|1|2|5)\d{8}$/;
export const isValidEmail = (value: string) => EMAIL_PATTERN.test(value) && value.length <= 254;
export const isValidEgyptPhone = (value: string) => EGYPT_PHONE_PATTERN.test(value);

export const PASSWORD_POLICY = {
  minLength: 10,
  maxLength: 256,
  validate(value: string) {
    return (
      value.length >= 10 &&
      value.length <= 256 &&
      /[A-Z]/.test(value) &&
      /[a-z]/.test(value) &&
      /\d/.test(value) &&
      /[^A-Za-z0-9]/.test(value)
    );
  },
} as const;

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}
export function normalizeEgyptPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("0020")) return `+20${digits.slice(4)}`;
  if (digits.startsWith("20")) return `+${digits}`;
  if (digits.startsWith("0")) return `+20${digits.slice(1)}`;
  return digits ? `+20${digits}` : "";
}

function validationError(fields: Partial<Record<AuthField, AuthValidationCode>>) {
  return Object.keys(fields).length ? new AuthServiceError("VALIDATION_ERROR", fields) : null;
}
export function validateLogin(value: LoginCredentials) {
  const fields: Partial<Record<AuthField, AuthValidationCode>> = {};
  const identifier = value.identifier.includes("@")
    ? normalizeEmail(value.identifier)
    : normalizeEgyptPhone(value.identifier);
  if (!value.identifier.trim()) fields.identifier = "required";
  else if (
    value.identifier.includes("@") ? !isValidEmail(identifier) : !isValidEgyptPhone(identifier)
  )
    fields.identifier = "invalid";
  if (!value.password) fields.password = "required";
  const error = validationError(fields);
  if (error) throw error;
  return { ...value, identifier };
}
export function validateRecoveryIdentifier(value: string) {
  const probe = validateLogin({ identifier: value, password: "validation-only", remember: false });
  return probe.identifier;
}
export function validateRegistration(value: RegistrationPayload) {
  const fields: Partial<Record<AuthField, AuthValidationCode>> = {};
  const email = normalizeEmail(value.email);
  const phone = normalizeEgyptPhone(value.phone);
  const checkName = (field: AuthField, input: string) => {
    const length = input.trim().length;
    if (!length) fields[field] = "required";
    else if (length < 2 || length > 100) fields[field] = "length";
  };
  if (value.role === "user") checkName("displayName", value.displayName);
  else {
    checkName("businessName", value.businessName);
    checkName("contactName", value.contactName);
    checkName("city", value.city);
  }
  if (!isValidEmail(email)) fields.email = "invalid";
  if (!isValidEgyptPhone(phone)) fields.phone = "invalid";
  if (!PASSWORD_POLICY.validate(value.password)) fields.password = "passwordPolicy";
  if (!value.terms) fields.terms = "terms";
  const error = validationError(fields);
  if (error) throw error;
  return { ...value, email, phone };
}
export function validateReset(value: ResetPasswordPayload) {
  const fields: Partial<Record<AuthField, AuthValidationCode>> = {};
  if (!value.token.trim()) fields.token = "required";
  if (!PASSWORD_POLICY.validate(value.password)) fields.password = "passwordPolicy";
  const error = validationError(fields);
  if (error) throw error;
  return value;
}

export function safeReturnPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/")) return null;
  try {
    let decoded = value;
    for (let index = 0; index < 3; index += 1) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
    const unsafeCharacter = [...decoded].some((character) => {
      const code = character.charCodeAt(0);
      return character === "\\" || code <= 31 || code === 127;
    });
    if (!decoded.startsWith("/") || decoded.startsWith("//") || unsafeCharacter) return null;
    const url = new URL(decoded, "https://local.invalid");
    if (
      url.origin !== "https://local.invalid" ||
      url.pathname === "/auth" ||
      url.pathname.startsWith("/auth/")
    )
      return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function roleAwareReturnPath(value: string | null | undefined, role: UserRole) {
  const safe = safeReturnPath(value);
  const fallback = role === "dealer" ? "/dealer-account" : "/account";
  if (!safe) return fallback;
  const pathname = new URL(safe, "https://local.invalid").pathname;
  if (role === "dealer" && (pathname === "/account" || pathname.startsWith("/account/"))) {
    return pathname.startsWith("/account/import-requests")
      ? "/dealer-account/import-requests"
      : fallback;
  }
  if (
    role === "user" &&
    (pathname === "/dealer-account" || pathname.startsWith("/dealer-account/"))
  ) {
    return pathname.startsWith("/dealer-account/import-requests")
      ? "/account/import-requests"
      : fallback;
  }
  return safe;
}

export function isAuthenticationDependentPath(pathname: string) {
  return ["/account", "/dealer-account", "/messages", "/notifications", "/sell"].some(
    (root) => pathname === root || pathname.startsWith(`${root}/`),
  );
}
