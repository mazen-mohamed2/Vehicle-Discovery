# Development notes

The services use delayed in-memory mock data, not a persistence or multi-user boundary. Favorites are client-session only and reset when the browser runtime reloads; UI synchronization uses the `favorites` TanStack Query cache.

Query keys are centralized in `src/lib/query-keys.ts`. Dynamic resources include their identifier, including dealer inventory (`["listings", "agency", agencyId]`).

Run `npm run typecheck`, `npm run lint`, `npm run build`, and `npm test` before delivery.

## Localization

UI translations live in the Arabic and English dictionaries in `src/lib/i18n.tsx`. Add every new key to both dictionaries, then read it in client components with `useI18n()`. To add a language, extend the `Locale` type, add its dictionary, direction, cookie handling, and locale tag in `src/lib/locale.ts`.

Use the helpers in `src/lib/locale.ts` for numbers, currency, dates, relative time, mileage, and years. Language and theme preferences are stored in `sd-locale` and `sd-theme` cookies so the server renders the correct language, direction, and theme after refresh; local storage mirrors the preference for client tooling.
