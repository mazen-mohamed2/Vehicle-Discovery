# Development notes

The services use delayed mock data, not a multi-user boundary. Guest favorites persist locally under `sd-favorites`; each record stores only the canonical `VehicleListing.id` as `listingId` plus its real `createdAt` saved timestamp. `useFavorites` and the `favorites` TanStack Query cache are the only UI source of truth. Legacy records without a usable timestamp remain valid.

Guest comparisons persist canonical vehicle IDs only under `sd-compare`. `useCompare`, `compareService`, and the `compare` query key synchronize all cards and enforce a maximum of four unique vehicles. `/compare?vehicles=id-1,id-2` is the share format: IDs are validated against current listings, duplicates and invalid IDs are removed, and the list is truncated to four. URL changes from browser back/forward replace the local comparison; in-page changes update both without a replacement loop.

Favorites and Compare are intentionally independent. Clearing or removing from one never mutates the other. A future account backend should migrate these local IDs after authentication, merge them by canonical listing ID, then replace local persistence without changing the hook APIs.

Query keys are centralized in `src/lib/query-keys.ts`. Dynamic resources include their identifier, including dealer inventory (`["listings", "agency", agencyId]`).

During assisted implementation run `npm run typecheck`, `npm run lint`, and `npm test`. The project owner stops the development server and owns the production build, using `NEXT_DIST_DIR=.next-build npm run build` after QA.

## Mock authentication (development only)

Authentication is a frontend workflow mock, not a security boundary. The individual fixture is
`customer@sahladaraj.dev` / `Customer#123`; the dealer fixture is
`dealer@sahladaraj.dev` / `Dealer#1234`. These are development-only sample credentials, never
production secrets. Google login is a simulated provider contract and uses no SDK, OAuth token,
client ID, or secret.

Only a sanitized `AuthSession` (safe user profile, provider, creation and expiry timestamps) is
stored under `sd-auth-session`. Passwords, reset values, authorization codes, and provider tokens
are never persisted. The shared `authService`, `useAuth`, `queryKeys.auth.session` cache, and an
explicit hydration state form the single client source of truth. Corrupt and expired sessions are
discarded; storage events synchronize tabs. Logout removes only auth session data and leaves
Favorites, Compare, locale, theme, and other preferences untouched.

Persisted sessions are reconstructed through a strict allowlist parser. Canonical IDs, roles,
normalized email, optional Egyptian phone, dealer identity, and finite creation/expiry timestamps
must be valid; malformed, expired, or unreasonable sessions are removed. The single mounted auth
lifecycle controller schedules runtime expiry and revalidates on focus and document visibility.
Production backends must enforce expiry independently.

Remember me stores the sanitized seven-day mock session in `localStorage`. Without Remember me, an
eight-hour mock session is stored in tab-scoped `sessionStorage`; it does not synchronize to other
tabs. Logout must durably clear both stores. If storage removal fails, the UI keeps the current
session, reports the failure, and permits retry.

Favorites and Compare persistence is account-scoped by canonical identity. Guest data uses
`sd-favorites:guest` and `sd-compare:guest`; individuals use `sd-favorites:user:<userId>` and
`sd-compare:user:<userId>`; dealers use the equivalent `dealer:<userId>` scope. Display names,
emails, routes, and dealer names never determine ownership. TanStack Query keys carry the same
scope, so session transitions cannot reuse another identity's cached collection.

The first Guest read migrates legacy `sd-favorites` and `sd-compare` data to the Guest keys once,
then removes the old key after a successful write. Migration normalizes and deduplicates canonical
listing IDs and is safe to retry. Legacy data is never copied to an authenticated account. Guest
collections are not automatically merged on login; a future backend may offer an explicit merge
prompt and synchronize account collections after server authentication.

Login accepts normalized email or Egyptian phone formats. `returnTo` accepts only validated local
application paths; external, protocol-relative, malformed, and login-loop destinations are
rejected. Local registration creates a temporary sanitized session only—it is not a cloud account
and is not guaranteed to be reusable after logout; it never persists credentials. Forgot-password always returns the same response to prevent
account enumeration. Reset tokens and Google login are flow-development fixtures only.

Development reset-token fixtures carry issued, expiry, and used state. A successful reset consumes
the token atomically; restarting the development process resets this in-memory fixture state.
Browser storage failures are converted to stable service errors, and collection mutations retain
their scoped optimistic rollback behavior.

`tests/baseline.test.mjs` remains structural smoke coverage. Executable service and browser-storage
behavior lives in `tests/auth.behavior.test.mjs`; source-string assertions are not counted as
behavioral tests. Full React/DOM tests should use Testing Library once registry access permits adding
the DOM tooling.

Protected pages use a hydration-aware client boundary because localStorage cannot be read securely
by Next.js middleware or Server Components. This prevents protected-content flashes but is not
authorization. A production backend must enforce authorization on every resource and expose the
session through a server-readable HttpOnly cookie.

### Production authentication security plan

Use TLS/HTTPS; server-managed or short-lived sessions in HttpOnly, Secure cookies with an
appropriate SameSite policy; CSRF protection matched to the cookie/API architecture; Argon2id or
bcrypt password hashing; rate limits, progressive delays or lockout, and login auditing; hashed,
single-use, expiring reset tokens; OAuth state and PKCE where appropriate; server authorization and
input validation for every protected resource; output encoding and a strong Content Security
Policy; environment-backed secret management; session rotation and revocation; and secure logging
that excludes credentials and tokens. Frontend validation remains UX assistance, never a replacement
for backend validation.

## Localization

UI translations live in the Arabic and English dictionaries in `src/lib/i18n.tsx`. Add every new key to both dictionaries, then read it in client components with `useI18n()`. To add a language, extend the `Locale` type, add its dictionary, direction, cookie handling, and locale tag in `src/lib/locale.ts`.

Use the helpers in `src/lib/locale.ts` for numbers, currency, dates, relative time, mileage, and years. Language and theme preferences are stored in `sd-locale` and `sd-theme` cookies so the server renders the correct language, direction, and theme after refresh; local storage mirrors the preference for client tooling.

## Vehicle discovery

Discovery state is parsed from the URL by `src/lib/vehicle-discovery.ts`. The reusable UI updates URL parameters, and `listingsService.discover()` owns all search, filter, sort, facet, and pagination behavior. TanStack Query keys include the normalized discovery parameters, so browser navigation and shared URLs restore the same results without coupling filtering to components.

To add a filter, extend `VehicleDiscoveryParams`, parse its URL value, add the service predicate, expose the control in `VehicleDiscovery`, and add both translations. A future backend can replace `listingsService.discover()` with a paginated API call while preserving the URL, component, and query-key contracts.
