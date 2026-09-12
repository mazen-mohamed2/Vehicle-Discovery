# Development notes

The services use delayed mock data, not a multi-user boundary. Guest favorites persist locally under `sd-favorites`; each record stores only the canonical `VehicleListing.id` as `listingId` plus its real `createdAt` saved timestamp. `useFavorites` and the `favorites` TanStack Query cache are the only UI source of truth. Legacy records without a usable timestamp remain valid.

Guest comparisons persist canonical vehicle IDs only under `sd-compare`. `useCompare`, `compareService`, and the `compare` query key synchronize all cards and enforce a maximum of four unique vehicles. `/compare?vehicles=id-1,id-2` is the share format: IDs are validated against current listings, duplicates and invalid IDs are removed, and the list is truncated to four. URL changes from browser back/forward replace the local comparison; in-page changes update both without a replacement loop.

Favorites and Compare are intentionally independent. Clearing or removing from one never mutates the other. A future account backend should migrate these local IDs after authentication, merge them by canonical listing ID, then replace local persistence without changing the hook APIs.

Query keys are centralized in `src/lib/query-keys.ts`. Dynamic resources include their identifier, including dealer inventory (`["listings", "agency", agencyId]`).

During assisted implementation run `npm run typecheck`, `npm run lint`, and `npm test`. The project owner stops the development server and owns the production build, using `NEXT_DIST_DIR=.next-build npm run build` after QA.

## Mock authentication (development only)

Authentication is a frontend workflow mock, not a security boundary. QA uses exactly four
development-only identities, centralized in `auth.service.ts`:

| Role         | Email                      | Password       | Canonical user ID | Dealer profile ID |
| ------------ | -------------------------- | -------------- | ----------------- | ----------------- |
| Individual A | `customer@sahladaraj.dev`  | `Customer#123` | `user-demo`       | —                 |
| Individual B | `customer2@sahladaraj.dev` | `Customer#234` | `user-qa-b`       | —                 |
| Dealer A     | `dealer@sahladaraj.dev`    | `Dealer#1234`  | `dealer-demo`     | `ag1`             |
| Dealer B     | `dealer2@sahladaraj.dev`   | `Dealer#2345`  | `dealer-qa-b`     | `ag2`             |

These credentials are sample fixtures, never production secrets, and must be removed or replaced
when real backend authentication is connected. Do not copy them into UI components. Google login
is a simulated provider contract and uses no SDK, OAuth token, client ID, or secret.

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
rejected. Once login resolves the role, incompatible `/account` and `/dealer-account` paths map to
the equivalent import-request index when available, otherwise to that role's account home.
`AuthBoundary` remains the fallback for manually entered unauthorized URLs. Local registration
creates a temporary sanitized session only—it is not a cloud account
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

# Sprint 7: vehicle listing creation and management

Sprint 7 adds an authenticated, backend-replaceable listing workflow. `/sell` enters the protected flow, `/account/listings` owns management, and new/edit/preview routes are private and `noindex`. React components use `useManagedListings`; all ownership validation, persistence, status transitions, completion calculation, and public mapping remain in the managed-listing service.

## Lifecycle and authorization

| Current status    | Allowed transition | Result                                               |
| ----------------- | ------------------ | ---------------------------------------------------- |
| Draft             | Publish            | Published after full validation                      |
| Published         | Sold               | Records `soldAt`, removes active public record       |
| Published or sold | Archive            | Records `archivedAt`, removes active public record   |
| Archived          | Restore            | Published when previously published, otherwise draft |
| Draft or archived | Delete             | Permanently removed from the owner mock store        |
| Any owned status  | Duplicate          | New canonical ID and draft workflow                  |

Invalid transitions return `INVALID_STATUS_TRANSITION`. Service reads require the active canonical owner scope (`user:<id>` or `dealer:<id>`); guest access returns `UNAUTHENTICATED`. Route parameters are never treated as proof of ownership. Logout/account switching changes both the private query key and storage scope. The existing authentication lifecycle redirects protected content when the session disappears in another tab.

## Persistence and catalog composition

Owned records use `sd-owned-listings:<scope>`. Published records are mapped at the service boundary into the existing `VehicleListing` contract and composed with the seed catalog by `listingsService`; presentation components do not concatenate data sources. Canonical generated IDs use the `listing_` namespace and cannot collide with seed `v*` IDs. Query keys include the account scope for all private data, and listing mutations refresh private and public listing caches.

This browser mock has an important server-rendering limitation: LocalStorage records are unavailable to a Next.js server process. They become visible to client-side public queries after hydration; a real backend will make created records available to server metadata, sitemap generation, and direct server-rendered detail requests. Drafts are never included in public metadata or the sitemap.

## Images and future backend boundaries

No real files are uploaded. Selected JPEG, PNG, and WebP files are validated (12 images maximum, 8 MB each) and represented by temporary Object URLs for the current tab. Blob/Object URLs and binary/base64 content are stripped before LocalStorage writes and are revoked on removal or wizard unmount. They do not survive a browser restart. Photos are optional for publishing under the frontend-only Sprint 7 policy; the demo-image action is an optional development convenience and is never assigned automatically. Persistent-media photo requirements will be restored when the real upload backend exists, without inventing a final production minimum during this sprint. A future upload repository should replace temporary URL creation with signed upload requests and persist only returned server asset IDs/URLs.

No identity documents, vehicle documents, passwords, or security tokens are stored by the listing workflow. Vehicle and ownership verification statuses are future integration placeholders and never cause the UI to claim verification. A future moderation service can return `pending` from the existing publish boundary without changing component APIs. Future KYC and vehicle-document verification must use secure server storage and separate authorization policies.

Seller declarations are collected only at publication and timestamped together. They are an implementation placeholder, not legal advice. Final Terms, Privacy, ownership authorization, and off-platform transaction language require review by qualified local legal counsel.

## Manual QA

1. As a guest, open `/sell`; confirm login receives the internal return path and no private form flashes.
2. Log in as the individual and dealer fixtures; create and resume distinct drafts in each scope.
3. Type quickly, leave the wizard, and confirm the same ID and latest values resume after autosave.
4. Confirm incomplete drafts save but cannot publish; verify the localized error summary receives focus.
5. Add, reorder, cover, and remove images with keyboard controls; confirm the temporary-image warning.
6. Accept all four declarations, publish a complete listing, and verify discovery updates without a refresh.
7. Duplicate, mark sold, archive, restore, and delete across their permitted states; cancel each destructive confirmation once.
8. Switch Arabic/English and inspect mobile/tablet/desktop layouts, direction, labels, focus rings, and touch targets.
9. Change accounts or log out from another tab while a private route is open; confirm access is removed and caches do not cross scopes.

Known mock limitations: no actual upload, backend, moderation, KYC, document verification, payments, offers, or chat; temporary selected photos cannot survive restart; server-rendered SEO cannot observe browser-only published records until a backend exists.

# Sprint 8: custom import workflow

Custom Import uses one backend-replaceable repository for two deliberate data views: a shared marketplace of import requests/offers and identity-authorized owner/dealer selectors. Individual users create `OPEN` requests and can read only records whose `ownerUserId` matches their canonical session ID. Dealers can browse the minimal vehicle/budget fields of open requests and can mutate only offers whose `dealerUserId` matches their session. Frontend checks model product behavior but are not secure authorization; the backend must repeat every check.

Request transitions are `OPEN -> OFFER_ACCEPTED` or `OPEN -> CANCELLED`. Cancellation is historical, not deletion. Offer transitions are `PENDING -> ACCEPTED`, `PENDING -> REJECTED`, or `PENDING -> WITHDRAWN`. Each dealer may have only one active pending offer per request. Accepting an offer synchronously sets the request to `OFFER_ACCEPTED`, accepts the selected offer, rejects every competing pending offer, removes the request from open opportunities, and rolls the request write back if offer persistence fails.

The browser mock persists the shared marketplace in `sd-import-marketplace-requests` and `sd-import-marketplace-offers`. Private TanStack Query keys include `user:<id>` or `dealer:<id>` scopes; shared open-opportunity keys are explicit. Mutations invalidate the complete `import-workflow` family and storage events synchronize other tabs. Corrupt records and storage failures surface typed errors instead of being reported as successful empty states.

Dealer names, rating, and verification are resolved from the existing canonical agency service and are not copied into offers. No requester contact details are stored or exposed. A backend migration replaces repository reads/writes with API calls while preserving domain types, query keys, and UI contracts. It must add database transactions, server-side ownership and dealer authorization, validation, rate limiting, audit logs, notifications, and durable persistence.

The two dealer QA identities map one-to-one to canonical agency fixtures `ag1` and `ag2`. Offers
persist both canonical `dealerUserId` (mutation ownership) and `dealerId` (profile lookup), while
presentation fields continue to come from `agenciesService`. Agency lookups return a record or
explicit `null`, never `undefined`, so they are safe React Query results. Dealer opportunities and
direct dealer request reads expose only `OPEN` requests; cancelled and accepted requests remain
available solely in the owning individual's history.

### Future website/dashboard domain parity

The future admin dashboard parity pass must consume the same canonical backend contracts and source
of truth as the website. `ImportRequest` has only `OPEN`, `OFFER_ACCEPTED`, and `CANCELLED` states;
`ImportOffer` has only `PENDING`, `ACCEPTED`, `REJECTED`, and `WITHDRAWN` states. Do not create
dashboard-only lifecycle statuses.

Dashboard operations must expose import requests, submitted dealer offers, the accepted dealer and
offer, rejected competing offers, cancellation, canonical owner/dealer IDs, `createdAt` and
`updatedAt`, and accepted/rejected/withdrawn lifecycle timestamps wherever the backend contract
provides them. The backend phase must add durable audit/history records for every transition. The
dealer-account website and operational dashboard must read and mutate this one shared domain rather
than synchronizing separate models.

Accepting an offer does not move money, create escrow, contact a gateway, arrange customs, or start logistics. Payment and tracking cards explicitly describe these stages as backend-dependent. Future releases require real payment/escrow, notification, customs, and shipment integrations; this sprint creates no fake balances, transaction IDs, delivery events, or tracking data.

# Sprint 9: marketplace communication, vehicle offers, and notifications

The Website now has separate canonical `ConversationRecord`, `MessageRecord`,
`VehicleOfferRecord`, and `WebsiteNotificationRecord` contracts. Vehicle offers remain entirely
separate from Sprint 8 `ImportOfferRecord`. Conversations store participant, buyer, seller, and
listing IDs only; messages store their conversation/sender IDs, body, creation time, and a simple
participant read list. One conversation is reused for each listing + buyer + seller tuple.

Public listings carry an explicit canonical `sellerUserId` in addition to the dealer-facing
`sellerId` when relevant. Only published records available through the public catalog can start a
new conversation or vehicle offer. Self-contact and self-offers are rejected. Existing history is
retained if a listing later becomes sold or archived, while its removal from the active catalog
blocks new activity.

`VehicleOfferRecord` uses `PENDING`, `ACCEPTED`, `REJECTED`, and `WITHDRAWN`. A buyer may have one
pending offer per listing. The listing owner alone accepts or rejects it; the buyer alone withdraws
it. Acceptance writes one accepted offer and rejects every competing pending offer in the same
repository transition, then blocks new offers. It does not mark the listing sold, transfer a
vehicle, or imply payment. The listing lifecycle remains independent for the later transaction
sprint.

Website notifications are recipient-filtered records with safe internal deep links and read state.
New messages notify the other participant; new vehicle offers notify the seller; acceptance and
rejection notify affected buyers; withdrawal may notify the seller. Import-offer submission,
acceptance, and rejection emit `NEW_IMPORT_OFFER`, `IMPORT_OFFER_ACCEPTED`, and
`IMPORT_OFFER_REJECTED` without changing the Import domain. Opening a notification marks it read,
and the shared navigation count uses the account-scoped TanStack Query state.

The frontend mock stores conversations, messages, vehicle offers, and notifications in deliberate
shared browser repositories, then exposes only participant, buyer, seller, or recipient-authorized
selectors. Query keys include the canonical account scope, mutations invalidate their complete
domain families, and browser storage events refresh other tabs. This models product behavior but is
not a security boundary or real-time delivery.

A backend replacement must enforce conversation membership, listing ownership, offer ownership,
and recipient access server-side; accept offers in a database transaction; generate notifications
server-side; and add persistent storage, rate limits, spam/abuse controls, moderation, audit logs,
and WebSocket/realtime delivery where justified. Do not add fake JWTs, encryption, delivery
receipts, email/SMS/push, payment, or escrow claims.

The Website owns participant-facing messages, offers, outcomes, and notifications. A future
Dashboard may add operational visibility, moderation, abuse investigation, and audit history, but
must consume the same backend contracts and lifecycle states without dashboard-only business
statuses.

The Website conversation and message experience is the participant-facing marketplace channel.
The existing Dashboard chat must not be assumed to represent that same channel until a later parity
audit decides whether it is marketplace communication or a separate support/admin/internal tool. If
it represents marketplace communication, both applications must use the same canonical conversation,
message, participant, listing, and notification IDs from one backend source of truth.

Sprint 10 owns individual public seller profiles and reputation work, including reviews, ratings,
badges, trust signals, and both user and dealer reputation rules. Until that domain and its backend
evidence exist, communication surfaces show only the safe canonical display name and account type;
they must not fabricate ratings, reviews, verification, or reputation claims.

# Sprint 10: trust, verification, safety, and reputation foundation

Public individual seller profiles live at `/sellers/[userId]` and resolve only canonical public
display name, account type, optional avatar, member date, active public listings, and a truthful
empty reputation summary. They never expose email, phone, address, authentication state, documents,
or private verification details. Dealer profiles remain their own public domain and retain the
existing fixture-backed rating and review-count presentation; those legacy fields must converge on
the future canonical Review aggregate rather than becoming a competing reputation system.

`VerificationRequestRecord` is the canonical frontend contract for `INDIVIDUAL`, `DEALER`, and
`VEHICLE` subjects. Its lifecycle is `NOT_SUBMITTED` (derived absence), `PENDING_REVIEW`, `VERIFIED`,
or `REJECTED`. Website owners may submit or resubmit an eligible rejected request, but no Website
mutation can approve or reject it. Only `VERIFIED` produces a public badge through the centralized
resolver. Pending/rejected details remain private. Existing verified dealer and seed-vehicle flags
are treated as the current canonical fixture source until one backend source replaces them.

Vehicle verification uses the canonical public listing ID and seller account ID. It does not claim
government identity, theft-database, traffic-authority, ownership-transfer, or physical-inspection
checks. No document picker or upload is implemented: raw files, bytes, names, document types, object
URLs, and fake cloud references are never persisted. A secure backend media/document boundary is
required before collecting KYC evidence. Existing listing declarations continue to record only the
seller's accuracy and authorization assertions; declarations do not prove ownership or verification.

`ReportRecord` supports `LISTING`, `USER`, `DEALER`, `CONVERSATION`, and `MESSAGE` targets with the
shared reasons `SCAM_OR_FRAUD`, `MISLEADING_INFORMATION`, `HARASSMENT`, `SPAM`,
`SUSPICIOUS_IDENTITY`, `INAPPROPRIATE_CONTENT`, and `OTHER`. Website submissions remain
`SUBMITTED`; users cannot move reports to `UNDER_REVIEW` or `RESOLVED`. Active duplicates are
rejected, self-reporting is rejected where nonsensical, private communication targets require
participant access, and `/account/reports` or `/dealer-account/reports` exposes only the reporter's
own safe history without moderation notes.

`BlockRelationship` stores canonical blocker and blocked account IDs. A participant may block only
someone in an authorized conversation, only the blocker may unblock, and history remains visible.
Either-direction blocking prevents new conversations and messages and therefore prevents new-message
notifications; it does not delete historical messages or notifications and does not silently alter
offers, payments, transactions, or legal obligations. Wider enforcement belongs to backend policy.

`ReviewRecord` requires a canonical `transactionId` and supports only `INDIVIDUAL_SELLER` and
`DEALER`. Sprint 10 exposes no review mutation or arbitrary eligibility. A completed qualifying
Transaction is the future eligibility boundary, so individual profiles truthfully show no reviews
and no generated rating today. Sprint 11 owns Transactions, Payments, and Escrow. Sprint 12 owns
transaction-backed Review eligibility, the final Website audit, and domain handoff.

The mock repositories persist only safe verification declarations, reports, and block relationships
and notify TanStack Query through the same custom/storage-event pattern used elsewhere. Private keys
contain canonical account scope; public seller/reputation keys contain no owner-private data.
Malformed persistence raises typed terminal errors instead of becoming an empty success state.

The Website owns request submission/status, public badges, report submission/history, participant
blocking, and public reputation presentation. A future React/Vite Dashboard may review verification
evidence, approve/reject verification, investigate reports, moderate reviews, and expose safety audit
history, but must use the same backend `VerificationRequest`, `Report`, `Review`, block relationship,
and canonical User/Dealer/Vehicle IDs without dashboard-only statuses.

The backend phase must enforce roles and ownership server-side; provide secure document upload and
encrypted storage, malware scanning, retention/deletion policy, privacy controls, moderator identity,
verification and moderation audit trails, report abuse/spam rate limits, server-authoritative badges,
block enforcement, transaction-backed review eligibility, review moderation, and complete audit
logging. The frontend mock is product behavior, not a security boundary.
